"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "../ui/sheet";

type NavItem = {
  label: string;
  href: string;
};

const NAV_ITEMS: NavItem[] = [{ label: "Home", href: "/" }];

function DesktopLinks({ pathname }: { pathname: string }) {
  return (
    <nav className="hidden md:flex items-center gap-6">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              isActive
                ? "text-neutral-900 dark:text-neutral-100 font-medium"
                : "text-neutral-600 dark:text-neutral-300 hover:text-neutral-900 dark:hover:text-neutral-100"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function MobileMenu({ branchName }: { branchName: string | null }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="md:hidden">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>{branchName ? branchName : "Navigation"}</SheetTitle>
        </SheetHeader>
        <div className="mt-4 flex flex-col gap-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-neutral-700 dark:text-neutral-200 hover:underline"
            >
              {item.label}
            </Link>
          ))}
          <div className="h-px bg-neutral-200 dark:bg-neutral-700 my-2" />
          <Link
            href="/admin/profile"
            className="text-neutral-700 dark:text-neutral-200 hover:underline"
          >
            Profile
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const [branchName, setBranchName] = React.useState<string | null>(null);

  React.useEffect(() => {
    const raw = localStorage.getItem("branchDetails");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const branchFromStorage =
        typeof parsed?.branchName === "string" ? parsed.branchName : null;
      if (branchFromStorage) setBranchName(branchFromStorage);
    } catch (err) {
      console.error("Failed to parse branchDetails:", err);
    }
  }, []);

  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-neutral-950/60">
      <div className="mx-auto max-w-full px-4 h-14 flex justify-between items-center">
        {/* Left side with branch name */}
        <div className="flex items-center gap-3">
          <span className="font-semibold text-blue-600 uppercase">
            {branchName ? branchName : "Branch"}
          </span>
        </div>

        {/* Middle nav links */}
        <DesktopLinks pathname={pathname} />

        {/* Right side */}
        <div className="flex items-center gap-3">
          <MobileMenu branchName={branchName} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-full focus:outline-none">
                <img
                  src="/profile.png"
                  className="h-8 w-8 rounded-full"
                  width={32}
                  height={32}
                  alt="Profile"
                />
                {/* <span className="hidden md:inline font-medium text-sm text-neutral-700 dark:text-neutral-200">
                  {branchName}
                </span> */}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {branchName ? branchName : "My Account"}
              </DropdownMenuLabel>
              <DropdownMenuItem>
                <Link href="/login">Logout</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
