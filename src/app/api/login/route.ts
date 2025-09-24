import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import connectDb from "@/lib/mongodb";
import Branch from "../../../model/branch";
import Admin from "../../../model/admin";

const JWT_SECRET = process.env.JWT_SECRET as string;

export async function PATCH(req: Request) {
  try {
    const { adminId, newPassword } = await req.json();
    console.log("PATCH request received:", { adminId, newPassword });

    await connectDb();

    if (!adminId || !newPassword) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "Admin ID and new password are required" },
        { status: 400 }
      );
    }

    const admin = await Admin.findById(adminId);
    console.log("Found admin:", admin ? "Yes" : "No");

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 });
    }

    // Update the password
    admin.password = newPassword;
    await admin.save();
    console.log("Password updated successfully");

    return NextResponse.json({
      success: true,
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();
    await connectDb();
    /////////////////////////////////////////////////////// ADMIN

    if (username === "Adminlazzanio") {
      const admin = await Admin.findOne({ username: "Adminlazzanio" });
      if (!admin || admin.password !== password) {
        return NextResponse.json(
          { success: false, error: "Invalid admin credentials" },
          { status: 401 }
        );
      }

      const token = jwt.sign(
        { id: String(admin._id), username: admin.username, role: "admin" },
        JWT_SECRET,
        { expiresIn: "1d" }
      );

      const res = NextResponse.json({
        success: true,
        message: "Login successful",
        token,
        admin: {
          _id: String(admin._id),
          username: admin.username,
          password: admin.password,
        },
        role: "admin",
      });

      res.cookies.set("token", token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });
      res.cookies.set("role", "admin", {
        httpOnly: false,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      });

      return res;
    }
    /////////////////////////////////////////////////////// USER
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
      { id: branch._id, username: branch.username, role: "user" },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    const res = NextResponse.json({
      success: true,
      message: "Login successful",
      branch,
      token,
      role: "user",
    });

    res.cookies.set("token", token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 60 * 60, // 1 hour
    });
    res.cookies.set("role", "user", {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge:  60 * 60, // 1 hour
    });

    return res;
  } catch {
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500 }
    );
  }
}
