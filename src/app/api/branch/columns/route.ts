import { NextResponse } from "next/server";
import connectDb from "@/lib/mongodb";
import Branch from "@/model/branch";

export async function GET(req: Request) {
  try {
    await connectDb();

    const { searchParams } = new URL(req.url);
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "branchId is required" },
        { status: 400 }
      );
    }

    const branch = await Branch.findById(branchId).select("columnVisibility");

    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        columnVisibility: branch.columnVisibility || {},
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching column visibility:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch column visibility" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await connectDb();

    const body = await req.json();
    const { branchId, columnVisibility } = body;

    if (!branchId) {
      return NextResponse.json(
        { success: false, error: "branchId is required" },
        { status: 400 }
      );
    }

    if (!columnVisibility || typeof columnVisibility !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "columnVisibility is required and must be an object",
        },
        { status: 400 }
      );
    }

    const updated = await Branch.findByIdAndUpdate(
      branchId,
      { columnVisibility },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Branch not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { success: true, columnVisibility: updated.columnVisibility },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating column visibility:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update column visibility" },
      { status: 500 }
    );
  }
}
