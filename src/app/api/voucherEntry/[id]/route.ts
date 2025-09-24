import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";
import Branch from "@/model/branch";
import mongoose from "mongoose";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // branchId
    await connectDb();

    const { searchParams } = new URL(req.url);

    // Pagination
    const page = Math.max(1, Number(searchParams.get("page") || 1));
    const pageSize = Math.min(
      500,
      Math.max(1, Number(searchParams.get("pageSize") || 10))
    );
    const skip = (page - 1) * pageSize;

    // Sorting
    const sortByRaw = (searchParams.get("sortBy") || "createdAt").trim();
    const sortDirRaw = (searchParams.get("sortDir") || "desc").trim();
    const allowedSortFields = new Set([
      "createdAt",
      "voucherGivenDate",
      "voucherClearedDate",
      "voucherNo",
      "amount",
      "netBalance",
      "supplier",
      "status",
    ]);
    const sortBy = allowedSortFields.has(sortByRaw) ? sortByRaw : "createdAt";
    const sortDir = sortDirRaw === "asc" ? 1 : -1;

    // Filters
    const voucherNo = searchParams.get("voucherNo");
    const statusRaw = searchParams.get("status"); // 'pending' | 'active' | 'cancel'
    const supplier = searchParams.get("supplier");

    const createdFrom = searchParams.get("createdFrom");
    const createdTo = searchParams.get("createdTo");
    const givenFrom = searchParams.get("givenFrom");
    const givenTo = searchParams.get("givenTo");
    const clearedFrom = searchParams.get("clearedFrom");
    const clearedTo = searchParams.get("clearedTo");

    const query: Record<string, unknown> = { branchId: id };

    if (voucherNo && voucherNo.trim().length > 0) {
      query.voucherNo = { $regex: voucherNo.trim(), $options: "i" };
    }
    if (supplier && supplier.trim().length > 0) {
      query.supplier = { $regex: supplier.trim(), $options: "i" };
    }
    const status =
      typeof statusRaw === "string"
        ? statusRaw.trim().toLowerCase()
        : undefined;
    if (status === "pending" || status === "active" || status === "cancel") {
      query.status = status;
    }

    const addDateRange = (
      key: string,
      from?: string | null,
      to?: string | null
    ) => {
      const range: Record<string, Date> = {};
      if (from && from.trim().length > 0) range.$gte = new Date(from);
      if (to && to.trim().length > 0) {
        const end = new Date(to);
        // include entire day by moving to next day start and subtracting 1ms
        end.setDate(end.getDate() + 1);
        end.setMilliseconds(end.getMilliseconds() - 1);
        range.$lte = end;
      }
      if (Object.keys(range).length > 0) {
        query[key] = range;
      }
    };

    addDateRange("createdAt", createdFrom, createdTo);
    addDateRange("voucherGivenDate", givenFrom, givenTo);
    addDateRange("voucherClearedDate", clearedFrom, clearedTo);

    // Fetch total count and totals for the filtered set
    const totalCount = await VoucherEntry.countDocuments(query);

    // Aggregates for filtered set
    const totalsCursor = await VoucherEntry.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          grandTotalAmount: { $sum: { $ifNull: ["$amount", 0] } },
          grandTotalNetBalance: { $sum: { $ifNull: ["$netBalance", 0] } },
        },
      },
    ]);
    const totals =
      (Array.isArray(totalsCursor) && totalsCursor[0]) ||
      ({ grandTotalAmount: 0, grandTotalNetBalance: 0 } as const);

    const vouchers = await VoucherEntry.find(query)
      .sort({ [sortBy]: sortDir })
      .skip(skip)
      .limit(pageSize);

    return NextResponse.json(
      {
        vouchers,
        grandTotalAmount: totals.grandTotalAmount || 0,
        grandTotalNetBalance: totals.grandTotalNetBalance || 0,
        totalCount,
        page,
        pageSize,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "Error fetching vouchers" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  let session: mongoose.ClientSession | undefined = undefined;
  try {
    const { id } = await context.params; // voucherEntryId
    await connectDb();

    // Find the voucher to get its details
    const voucher = await VoucherEntry.findById(id);
    if (!voucher) {
      return NextResponse.json(
        { success: false, error: "Voucher not found" },
        { status: 404 }
      );
    }

    // Start transaction to handle voucher deletion and voucher number release
    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      // Delete the voucher
      await VoucherEntry.findByIdAndDelete(id, { session });

      // Release the voucher number back to the branch
      if (voucher.branchId && voucher.voucherBook && voucher.voucherNo) {
        await Branch.updateOne(
          { _id: voucher.branchId, "vouchers.name": voucher.voucherBook },
          { $pull: { "vouchers.$.usedVouchers": String(voucher.voucherNo) } },
          { session }
        );
      }
    });

    return NextResponse.json(
      { success: true, message: "Voucher deleted successfully" },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete voucher";
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
