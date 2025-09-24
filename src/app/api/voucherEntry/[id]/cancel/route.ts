import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry, { IVoucherEntry } from "@/model/voucherEntry";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params; // voucherEntryId
    await connectDb();

    const existing = await VoucherEntry.findById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Voucher not found" },
        { status: 404 }
      );
    }

    const nextStatus: IVoucherEntry["status"] =
      existing.status === "cancel" ? "pending" : "cancel";
    existing.status = nextStatus;
    const updated = await existing.save();

    return NextResponse.json(
      { success: true, voucher: updated },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to toggle cancel";
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
