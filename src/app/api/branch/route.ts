import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Branch from "@/model/branch";

export async function POST(req: Request) {
  try {
    const { branchName, username, password, vouchers } = await req.json();
    await connectDb();

    // Check if branch username already exists
    const existingBranch = await Branch.findOne({ branchName });
    if (existingBranch) {
      return NextResponse.json(
        { error: "Branch username already exists" },
        { status: 400 }
      );
    }

    // Create new branch
    const newBranch = new Branch({
      branchName,
      username,
      password,
      vouchers,
    });

    await newBranch.save();

    return NextResponse.json(
      { message: "Branch created successfully", branch: newBranch },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    await connectDb();
    const branches = await Branch.find();
    return NextResponse.json(branches, { status: 200 });
  } catch {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { branchId, newSupplierName } = body ?? {};
    await connectDb();
    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Supplier add (existing behavior)
    if (typeof newSupplierName === "string" && newSupplierName.trim().length) {
      if (existingBranch.Supplier.includes(newSupplierName)) {
        return NextResponse.json(
          { error: "supplier already exists" },
          { status: 400 }
        );
      }
      existingBranch.Supplier.push(newSupplierName);
      await existingBranch.save();
      return NextResponse.json({ message: "Supplier added" }, { status: 201 });
    }

    // Voucher book CRUD
    const { action, voucherIndex, name, start, end } = body ?? {};
    if (action === "addVoucher") {
      if (!name || start == null || end == null) {
        return NextResponse.json(
          { error: "name, start, end are required" },
          { status: 400 }
        );
      }
      if (
        existingBranch.vouchers.some(
          (v: Record<string, unknown>) => v.name === name
        )
      ) {
        return NextResponse.json(
          { error: "Voucher book name already exists" },
          { status: 400 }
        );
      }
      existingBranch.vouchers.push({
        name,
        start: Number(start),
        end: Number(end),
        usedVouchers: [],
      });
      await existingBranch.save();
      return NextResponse.json(
        { message: "Voucher book added" },
        { status: 201 }
      );
    }

    if (action === "editVoucher") {
      if (voucherIndex == null) {
        return NextResponse.json(
          { error: "voucherIndex is required" },
          { status: 400 }
        );
      }
      const vb = existingBranch.vouchers[voucherIndex];
      if (!vb) {
        return NextResponse.json(
          { error: "Voucher book not found" },
          { status: 404 }
        );
      }
      if (typeof name === "string" && name.trim().length) {
        const duplicate = existingBranch.vouchers.some(
          (v: Record<string, unknown>, i: number) =>
            i !== voucherIndex && v.name === name
        );
        if (duplicate) {
          return NextResponse.json(
            { error: "Voucher book name already exists" },
            { status: 400 }
          );
        }
        vb.name = name;
      }
      if (start != null) vb.start = Number(start);
      if (end != null) vb.end = Number(end);
      await existingBranch.save();
      return NextResponse.json(
        { message: "Voucher book updated" },
        { status: 200 }
      );
    }

    if (action === "deleteVoucher") {
      if (voucherIndex == null) {
        return NextResponse.json(
          { error: "voucherIndex is required" },
          { status: 400 }
        );
      }
      if (!existingBranch.vouchers[voucherIndex]) {
        return NextResponse.json(
          { error: "Voucher book not found" },
          { status: 404 }
        );
      }
      existingBranch.vouchers.splice(voucherIndex, 1);
      await existingBranch.save();
      return NextResponse.json(
        { message: "Voucher book deleted" },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: "No valid action specified" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating branch:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
