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
    return NextResponse.json(vouchers, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Error fetching vouchers" },
      { status: 500 }
    );
  }
}
