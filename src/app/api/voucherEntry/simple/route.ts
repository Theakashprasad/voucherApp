import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";
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

    // Prepare voucher data without validation
    const vouchersToSave: Array<{
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
    }> = vouchers.map((voucher) => {
      // Helper function to safely parse dates
      const parseDate = (dateValue: unknown) => {
        if (!dateValue) return undefined;
        if (
          typeof dateValue === "string" ||
          typeof dateValue === "number" ||
          dateValue instanceof Date
        ) {
          const date = new Date(dateValue);
          return isNaN(date.getTime()) ? undefined : date;
        }
        return undefined;
      };

      // Parse dates safely
      const voucherGivenDate =
        parseDate(voucher.voucherGivenDate) || new Date();
      const chqCashIssuedDate = parseDate(voucher.chqCashIssuedDate);
      const voucherClearedDate = parseDate(voucher.voucherClearedDate);

      // Calculate fields with defaults
      const amount = Number(voucher.amount) || 0;
      const dues = Number(voucher.dues) || 0;
      const returnAmount = Number(voucher.return) || 0;
      const discountAdvance = Number(voucher.discountAdvance) || 0;
      const amountPaid = Number(voucher.amountPaid) || 0;

      const netBalance = amount - dues - returnAmount - discountAdvance;

      // Determine status based on voucherClearedDate
      const status = voucherClearedDate ? "active" : "pending";

      return {
        branchId,
        voucherBook: voucher.voucherBook || "Default Book",
        voucherNo: String(voucher.voucherNo || ""),
        invoiceNo: voucher.invoiceNo || undefined,
        voucherGivenDate,
        supplier: String(voucher.supplier || ""),
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
      };
    });

    // Start transaction for bulk insert
    session = await mongoose.startSession();
    let createdVouchers: unknown[] = [];

    await session.withTransaction(async () => {
      // Create all vouchers without any validation
      createdVouchers = await VoucherEntry.create(vouchersToSave, {
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
