import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import VoucherEntry from "@/model/voucherEntry";

export async function PATCH(req: Request) {
  try {
    await connectDb();
    const body = await req.json();

    const voucherEntryId = String(body?.voucherEntryId || "").trim();
    const voucherClearedDate = body?.voucherClearedDate as string | undefined;
    const rawStatus = body?.status as string | undefined;
    const chqCashIssuedDate = body?.chqCashIssuedDate as string | undefined;
    const normalizedStatus =
      typeof rawStatus === "string"
        ? rawStatus.trim().toLowerCase()
        : undefined;

    if (!voucherEntryId) {
      return NextResponse.json(
        { success: false, error: "voucherEntryId is required" },
        { status: 400 }
      );
    }

    const update: Record<string, unknown> = {};
    if (typeof normalizedStatus === "string") {
      if (normalizedStatus !== "pending" && normalizedStatus !== "active") {
        return NextResponse.json(
          { success: false, error: "status must be 'pending' or 'active'" },
          { status: 400 }
        );
      }
      update.status = normalizedStatus;
    }

    // Handle set/unset voucherClearedDate
    if (typeof voucherClearedDate === "string") {
      if (voucherClearedDate.trim().length > 0) {
        update.voucherClearedDate = new Date(voucherClearedDate);
      } else {
        // Unset when empty string provided
        (update as any).$unset = { voucherClearedDate: "" };
      }
    }

    // Handle set/unset chqCashIssuedDate in tandem
    if (typeof chqCashIssuedDate === "string") {
      if (chqCashIssuedDate.trim().length > 0) {
        (update as any).chqCashIssuedDate = new Date(chqCashIssuedDate);
      } else {
        (update as any).$unset = {
          ...(update as any).$unset,
          chqCashIssuedDate: "",
        };
      }
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { success: false, error: "No fields to update" },
        { status: 400 }
      );
    }

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
      { success: false, error: "Failed to update voucher paid status" },
      { status: 500 }
    );
  }
}
