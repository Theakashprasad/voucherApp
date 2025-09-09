import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
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
  } catch (error) {
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const { branchId, newSupplierName } = await req.json();
    await connectDb();
    console.log("banr", branchId, newSupplierName);
    // Check if branch username already exists
    const existingBranch = await Branch.findById(branchId);
    console.log("sdsdsd", existingBranch.Supplier);
    if (existingBranch.Supplier.includes(newSupplierName)) {
      return NextResponse.json(
        { error: "supplier already exists" },
        { status: 400 }
      );
    }

    existingBranch.Supplier.push(newSupplierName);

    await existingBranch.save();

    return NextResponse.json(
      { message: "Branch created successfully" },
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
