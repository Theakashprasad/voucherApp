import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Branch from "@/model/branch";

export async function PATCH(req: Request) {
  try {
    const { id, value, branchId } = await req.json();
    await connectDb();

    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Prevent duplicate supplier name
    if (existingBranch.Supplier.includes(value)) {
      return NextResponse.json(
        { error: "Supplier name already exists" },
        { status: 400 }
      );
    }

    existingBranch.Supplier[id] = value;
    await existingBranch.save();

    return NextResponse.json(
      { message: "Supplier updated successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}




export async function DELETE(req: Request) {
  try {
    const { id, branchId } = await req.json();
    await connectDb();

    const existingBranch = await Branch.findById(branchId);
    if (!existingBranch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Check if supplier exists at the given index
    if (!existingBranch.Supplier[id]) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Remove supplier by index
    existingBranch.Supplier.splice(id, 1);

    await existingBranch.save();

    return NextResponse.json(
      { message: "Supplier deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}