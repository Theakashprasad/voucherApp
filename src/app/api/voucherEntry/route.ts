import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";
import Branch from "@/model/branch";
import mongoose from "mongoose";

export async function GET(req: Request) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");
    const voucherId = searchParams.get("voucherId");

    if (branchId && voucherId) {
      const one = await VoucherEntry.find({ branchId, _id: voucherId });
      return NextResponse.json(one, { status: 200 });
    }

    if (branchId) {
      const many = await VoucherEntry.find({ branchId });
      return NextResponse.json(many, { status: 200 });
    }

    const all = await VoucherEntry.find();
    return NextResponse.json(all, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error fetching vouchers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  let session: mongoose.ClientSession | undefined = undefined;
  try {
    await connectDb();

    const raw = await req.json();
    const {
      branchId,
      voucherBookName,
      voucherNo,
      date,
      voucherGivenDate,
      supplier,
      amount,
      dues,
      return: returnAmount,
      discountAdvance,
      netBalance,
      modeOfPayment,
      chqCashIssuedDate,
      amountPaid,
      voucherClearedDate,
      remarks,
      status,
    } = raw ?? {};

    // basic required fields
    if (!branchId || !voucherBookName || !voucherNo) {
      return NextResponse.json(
        {
          success: false,
          error: "branchId, voucherBookName and voucherNo are required",
        },
        { status: 400 }
      );
    }

    // ensure branch and voucher book exist and gather range/usage
    const branch = await Branch.findOne(
      { _id: branchId, "vouchers.name": voucherBookName },
      { "vouchers.$": 1 }
    );

    if (!branch || !branch.vouchers || branch.vouchers.length === 0) {
      return NextResponse.json(
        { success: false, error: "Branch or voucher book not found" },
        { status: 404 }
      );
    }

    const book = branch.vouchers[0] as unknown as {
      start: number;
      end: number;
      usedVouchers: string[];
    };
    const voucherNoNum = Number(voucherNo);
    const inRange =
      Number.isFinite(voucherNoNum) &&
      voucherNoNum >= book.start &&
      voucherNoNum <= book.end;

    if (!inRange) {
      return NextResponse.json(
        {
          success: false,
          error: "voucherNo is out of allowed range for this book",
        },
        { status: 400 }
      );
    }

    if (book.usedVouchers?.includes(String(voucherNo))) {
      return NextResponse.json(
        { success: false, error: "Voucher number already used" },
        { status: 400 }
      );
    }

    // normalize and validate status
    const normalizedStatus =
      typeof status === "string" ? status.trim().toLowerCase() : undefined;
    if (
      normalizedStatus !== undefined &&
      normalizedStatus !== "pending" &&
      normalizedStatus !== "active"
    ) {
      return NextResponse.json(
        { success: false, error: "status must be 'pending' or 'active'" },
        { status: 400 }
      );
    }

    // Start transaction to reserve and create atomically
    session = await mongoose.startSession();
    let createdDoc = null as any;

    await session.withTransaction(async () => {
      // Reserve voucher number; if already present, modifiedCount will be 0
      const reserve = await Branch.updateOne(
        { _id: branchId, "vouchers.name": voucherBookName },
        { $addToSet: { "vouchers.$.usedVouchers": String(voucherNo) } },
        { session }
      );

      if (reserve.modifiedCount === 0) {
        throw new Error("Voucher number already used");
      }

      const docArr = await VoucherEntry.create(
        [
          {
            branchId,
            voucherBook: voucherBookName,
            voucherNo: String(voucherNo),
            date,
            voucherGivenDate,
            supplier,
            amount,
            dues,
            return: returnAmount,
            discountAdvance,
            netBalance,
            modeOfPayment,
            chqCashIssuedDate,
            amountPaid,
            voucherClearedDate,
            remarks,
            status: normalizedStatus,
          },
        ],
        { session }
      );
      createdDoc = docArr[0];
    });

    return NextResponse.json(
      { success: true, voucher: createdDoc },
      { status: 201 }
    );
  } catch (error: any) {
    const message = error?.message || "Failed to create voucher";
    const status = message === "Voucher number already used" ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  } finally {
    if (session) {
      await session.endSession();
    }
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDb();
    const body = await req.json();

    const {
      voucherEntryId,
      branchId,
      voucherBookName,
      voucherNo,
      previousVoucherBookName,
      previousVoucherNo,
      date,
      voucherGivenDate,
      supplier,
      amount,
      dues,
      return: returnAmount,
      discountAdvance,
      netBalance,
      modeOfPayment,
      chqCashIssuedDate,
      amountPaid,
      voucherClearedDate,
      remarks,
      status,
    } = body;

    if (!voucherEntryId) {
      return NextResponse.json(
        { success: false, error: "Missing voucherEntryId" },
        { status: 400 }
      );
    }

    const voucherChanged =
      voucherBookName !== previousVoucherBookName ||
      voucherNo !== previousVoucherNo;

    if (voucherChanged) {
      if (!branchId || !voucherBookName || !voucherNo) {
        return NextResponse.json(
          {
            success: false,
            error:
              "branchId, voucherBookName and voucherNo are required for voucher change",
          },
          { status: 400 }
        );
      }

      const conflict = await Branch.findOne({
        _id: branchId,
        "vouchers.name": voucherBookName,
        "vouchers.usedVouchers": String(voucherNo),
      });
      const sameAsPrev =
        previousVoucherBookName === voucherBookName &&
        previousVoucherNo === voucherNo;
      if (conflict && !sameAsPrev) {
        return NextResponse.json(
          { success: false, error: "Voucher number already used" },
          { status: 400 }
        );
      }

      if (previousVoucherBookName && previousVoucherNo) {
        await Branch.updateOne(
          { _id: branchId, "vouchers.name": previousVoucherBookName },
          { $pull: { "vouchers.$.usedVouchers": String(previousVoucherNo) } }
        );
      }

      await Branch.updateOne(
        { _id: branchId, "vouchers.name": voucherBookName },
        { $addToSet: { "vouchers.$.usedVouchers": String(voucherNo) } }
      );
    }

    const update: Record<string, unknown> = {
      branchId,
      voucherBook: voucherBookName,
      voucherNo,
      date,
      voucherGivenDate,
      supplier,
      amount,
      dues,
      return: returnAmount,
      discountAdvance,
      netBalance,
      modeOfPayment,
      chqCashIssuedDate,
      amountPaid,
      voucherClearedDate,
      remarks,
      status:
        typeof status === "string" ? status.trim().toLowerCase() : undefined,
    };
    Object.keys(update).forEach(
      (k) => update[k] === undefined && delete update[k]
    );

    const updated = await VoucherEntry.findByIdAndUpdate(
      voucherEntryId,
      update,
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Voucher not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, voucher: updated },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to update voucher" },
      { status: 500 }
    );
  }
}
