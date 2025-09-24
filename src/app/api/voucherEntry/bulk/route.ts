import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";
import Branch from "@/model/branch";
import mongoose from "mongoose";

export async function POST(req: Request) {
  let session: mongoose.ClientSession | undefined = undefined;

  try {
    await connectDb();

    const body = await req.json();
    const { branchId, vouchers } = body;

    if (!branchId || !Array.isArray(vouchers) || vouchers.length === 0) {
      return NextResponse.json(
        { success: false, error: "branchId and vouchers array are required" },
        { status: 400 }
      );
    }

    // Validate branch exists
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 }
      );
    }

    // Validate and prepare voucher data
    const validatedVouchers: Array<{
      branchId: string;
      voucherBook: string;
      voucherNo: string;
      invoiceNo?: string;
      voucherGivenDate: Date;
      supplier: string;
      amount: number;
      dues: number;
      return: number;
      discountAdvance: number;
      netBalance: number;
      chqCashIssuedDate?: Date;
      amountPaid: number;
      voucherClearedDate?: Date;
      remarks: string;
      status: string;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < vouchers.length; i++) {
      const voucher = vouchers[i];
      const rowNumber = i + 2; // +2 because Excel rows start from 1 and we skip header

      // Required fields validation - only check voucherNo and supplier
      if (!voucher.voucherNo || !voucher.supplier) {
        errors.push(
          `Row ${rowNumber}: Missing required fields (voucherNo, supplier)`
        );
        continue;
      }

      // Amount can be 0 or empty, we'll default it to 0
      const amount = Number(voucher.amount) || 0;

      // Validate voucher book exists in branch
      const voucherBook = branch.vouchers?.find(
        (v: {
          name: string;
          start: number;
          end: number;
          usedVouchers?: string[];
        }) => v.name === voucher.voucherBook
      );
      if (!voucherBook) {
        errors.push(
          `Row ${rowNumber}: Voucher book '${voucher.voucherBook}' not found in branch`
        );
        continue;
      }

      // Validate voucher number is in range
      const voucherNoNum = Number(voucher.voucherNo);
      if (
        !Number.isFinite(voucherNoNum) ||
        voucherNoNum < voucherBook.start ||
        voucherNoNum > voucherBook.end
      ) {
        errors.push(
          `Row ${rowNumber}: Voucher number ${voucher.voucherNo} is out of range for book '${voucher.voucherBook}'`
        );
        continue;
      }

      // Check if voucher number is already used
      if (voucherBook.usedVouchers?.includes(String(voucher.voucherNo))) {
        errors.push(
          `Row ${rowNumber}: Voucher number ${voucher.voucherNo} is already used`
        );
        continue;
      }

      // Parse dates
      const voucherGivenDate = voucher.voucherGivenDate
        ? new Date(voucher.voucherGivenDate)
        : new Date();
      const chqCashIssuedDate = voucher.chqCashIssuedDate
        ? new Date(voucher.chqCashIssuedDate)
        : undefined;
      const voucherClearedDate = voucher.voucherClearedDate
        ? new Date(voucher.voucherClearedDate)
        : undefined;

      // Calculate other fields with defaults
      const dues = Number(voucher.dues) || 0;
      const returnAmount = Number(voucher.return) || 0;
      const discountAdvance = Number(voucher.discountAdvance) || 0;
      const amountPaid = Number(voucher.amountPaid) || 0;

      const netBalance = amount - dues - returnAmount - discountAdvance;

      // Determine status based on voucherClearedDate
      const status = voucherClearedDate ? "active" : "pending";

      validatedVouchers.push({
        branchId,
        voucherBook: voucher.voucherBook,
        voucherNo: String(voucher.voucherNo),
        invoiceNo: voucher.invoiceNo || undefined,
        voucherGivenDate,
        supplier: String(voucher.supplier),
        amount,
        dues,
        return: returnAmount,
        discountAdvance,
        netBalance,
        chqCashIssuedDate,
        amountPaid,
        voucherClearedDate,
        remarks: voucher.remarks || "",
        status,
      });
    }

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation errors found",
          details: errors,
        },
        { status: 400 }
      );
    }

    if (validatedVouchers.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid vouchers to import" },
        { status: 400 }
      );
    }

    // Start transaction for bulk insert
    session = await mongoose.startSession();
    let createdVouchers: unknown[] = [];

    await session.withTransaction(async () => {
      // Reserve all voucher numbers
      for (const voucher of validatedVouchers) {
        const reserve = await Branch.updateOne(
          { _id: branchId, "vouchers.name": voucher.voucherBook },
          { $addToSet: { "vouchers.$.usedVouchers": voucher.voucherNo } },
          { session }
        );

        if (reserve.modifiedCount === 0) {
          throw new Error(
            `Voucher number ${voucher.voucherNo} is already used`
          );
        }
      }

      // Create all vouchers
      createdVouchers = await VoucherEntry.create(validatedVouchers, {
        session,
        ordered: true,
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully imported ${createdVouchers.length} vouchers`,
        count: createdVouchers.length,
        vouchers: createdVouchers,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to import vouchers";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}
