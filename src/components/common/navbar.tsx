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

const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
];

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

function MobileMenu() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        {/* <SupplierDialog/> */}
        <Button variant="outline" size="sm" className="md:hidden">
          Menu
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64">
        <SheetHeader>
          <SheetTitle>Navigation</SheetTitle>
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

  return (
    <header className="w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-950/70 backdrop-blur supports-[backdrop-filter]:bg-white/60 supports-[backdrop-filter]:dark:bg-neutral-950/60">
      <div className="mx-auto max-w-full px-4 h-14 flex justify-between">
        <div className="flex justify-between gap-3">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">V</span>
            </div>
            <span className="font-semibold">Voucher Admin</span>
          </Link>
        </div>
          <DesktopLinks pathname={pathname} />

        <div className="flex items-center gap-3">
          <MobileMenu />

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
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/admin/profile">Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/admin/dashboard">Dashboard</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
