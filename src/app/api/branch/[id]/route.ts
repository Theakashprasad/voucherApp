import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectDb from "@/lib/mongodb";
import Branch from "@/model/branch";

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const id = (body?.branchId as string) || undefined;
    await connectDb();

    if (!id && !body?.id) {
      return NextResponse.json(
        { error: "branchId is required" },
        { status: 400 }
      );
    }

    const branchId = id || String(body.id);
    const branch = await Branch.findById(branchId);
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Optional: add supplier name if provided, with duplicate check
    if (
      typeof body.newSupplierName === "string" &&
      body.newSupplierName.trim()
    ) {
      const name = body.newSupplierName.trim();
      if (branch.Supplier.includes(name)) {
        return NextResponse.json(
          { error: "supplier already exists" },
          { status: 400 }
        );
      }
      branch.Supplier.push(name);
    }

    // Partial field updates if provided
    if (typeof body.branchName === "string")
      branch.branchName = body.branchName;
    if (typeof body.username === "string") branch.username = body.username;
    if (typeof body.password === "string") branch.password = body.password; // hash if needed
    if (Array.isArray(body.vouchers)) {
      branch.vouchers = body.vouchers.map((v: any) => ({
        name: String(v.name ?? ""),
        start: Number(v.start ?? 0),
        end: Number(v.end ?? 0),
        usedVouchers: Array.isArray(v.usedVouchers) ? v.usedVouchers : [],
      }));
    }

    await branch.save();
    return NextResponse.json({ message: "Branch updated", branch });
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    await connectDb();

    const branch = await Branch.findById(id);
    console.log("asdfk", branch);
    if (!branch) {
      return NextResponse.json(
        { message: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(branch);
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    await connectDb();

    const branch = await Branch.findById(id);
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Update editable fields
    if (typeof body.branchName === "string")
      branch.branchName = body.branchName;
    if (typeof body.username === "string") branch.username = body.username;
    if (typeof body.password === "string") branch.password = body.password; // consider hashing elsewhere
    if (Array.isArray(body.vouchers)) {
      branch.vouchers = body.vouchers.map((v: any) => ({
        name: String(v.name ?? ""),
        start: Number(v.start ?? 0),
        end: Number(v.end ?? 0),
        usedVouchers: Array.isArray(v.usedVouchers) ? v.usedVouchers : [],
      }));
    }

    await branch.save();

    return NextResponse.json({ message: "Branch updated", branch });
  } catch (error) {
    console.error("Error updating branch:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
