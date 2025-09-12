import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // branchId
    await connectDb();
    const vouchers = await VoucherEntry.find({ branchId: id });

    // Calculate grand total amount
    const grandTotalAmount = vouchers.reduce(
      (sum, voucher) => sum + (voucher.amount || 0),
      0
    );
    const grandTotalNetBalance = vouchers.reduce(
      (sum, voucher) => sum + (voucher.netBalance || 0),
      0
    );

    return NextResponse.json(
      {
        vouchers,
        grandTotalAmount,
        grandTotalNetBalance,
        totalCount: vouchers.length,
      },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error fetching vouchers" },
      { status: 500 }
    );
  }
}
