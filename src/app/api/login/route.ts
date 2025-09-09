import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDb from "@/lib/mongodb";
import Branch from "../../../model/branch";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    await connectDb();

    const branch = await Branch.findOne({ username });
    if (!branch) {
      return NextResponse.json(
        { success: false, error: "Invalid username" },
        { status: 401 }
      );
    }

    const isMatch = branch.password === password; 
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    const token = jwt.sign(
      { id: branch._id, username: branch.username },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const res = NextResponse.json({ success: true, message: "Login successful",branch });

    res.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60 * 24, // 1 day
    });

    return res;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
