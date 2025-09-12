import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allowlist: login and static assets
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon.ico") ||
    pathname.startsWith("/public/") ||
    pathname.startsWith("/assets/");

  // Do not guard API routes via middleware cookie checks
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token");
  const role = req.cookies.get("role")?.value;

  // If already authenticated, prevent access to /login
  if (pathname === "/login" && token) {
    const url = req.nextUrl.clone();
    url.pathname = role === "admin" ? "/admin/dashboard" : "/";
    return NextResponse.redirect(url);
  }

  // For all other routes, require auth token cookie set by login API
  if (!isPublicRoute && !token) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Restrict admin area to admin role
  if (pathname.startsWith("/admin") && role !== "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  // Restrict user home to non-admin; send admins to their dashboard
  if (pathname === "/" && role === "admin") {
    const url = req.nextUrl.clone();
    url.pathname = "/admin/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/|favicon.ico|api/|public/|assets/).*)"],
};
