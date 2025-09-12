"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
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
import { ConfirmDialog } from "./ConfirmDialog";
import Image from "next/image";

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

function MobileMenu({
  branchName,
  onLogout,
}: {
  branchName: string | null;
  onLogout: () => void;
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="md:hidden border-gray-300 hover:bg-gray-50"
        >
          <span className="sr-only">Open menu</span>
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80">
        <SheetHeader className="pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <div>
              <SheetTitle className="text-left text-lg font-semibold text-gray-900">
                {branchName ? branchName : "Branch Management"}
              </SheetTitle>
            </div>
          </div>
        </SheetHeader>
        <div className="flex flex-col gap-2">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 text-sm">🏠</span>
              </div>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
          <div className="h-px bg-gray-200 my-4" />
          <Link
            href="/admin/profile"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
          >
            <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-600 text-sm">👤</span>
            </div>
            <span className="font-medium">Profile Settings</span>
          </Link>
          <ConfirmDialog
            triggerLabel={
              <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors duration-200 w-full text-left">
                <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                  <span className="text-red-600 text-sm">🚪</span>
                </div>
                <span className="font-medium">Logout</span>
              </div>
            }
            title="Confirm Logout"
            description="Are you sure you want to logout? This will clear your session and redirect you to the login page."
            confirmLabel="Logout"
            cancelLabel="Cancel"
            onConfirm={onLogout}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
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

  const handleLogout = () => {
    // Clear localStorage data
    localStorage.removeItem("branchDetails");
    localStorage.removeItem("adminDetails");
    localStorage.removeItem("userDetails");

    // Vanilla JS
    document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

    // Redirect to login page
    router.push("/login");
  };

  return (
    <header className=" w-full border-b border-gray-200 bg-white shadow-sm">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center items-center h-16 relative">
          {/* Middle nav links - centered */}
          <DesktopLinks pathname={pathname} />

          {/* Right side - absolutely positioned */}
          <div className="absolute right-0 flex items-center gap-4 ">
            <MobileMenu branchName={branchName} onLogout={handleLogout} />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                  <div className="relative">
                    <Image
                      src="/profile.png"
                      className="h-9 w-9 rounded-full ring-2 ring-gray-200"
                      width={36}
                      height={36}
                      alt="Profile"
                    />
                  </div>
                  <div className="hidden md:flex flex-col items-start">
                    <span className="text-sm font-medium text-gray-900">
                      {branchName ? branchName : "Admin"}
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="px-4 py-2">
                  <div className="flex items-center gap-3">
                    <img
                      src="/profile.png"
                      className="h-10 w-10 rounded-full"
                      alt="Profile"
                    />
                    <div>
                      <p className="font-medium text-gray-900">
                        {branchName ? branchName : "Admin User"}
                      </p>
                      <p className="text-sm text-gray-500">Branch</p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                <ConfirmDialog
                  triggerLabel={
                    <div className="flex items-center gap-3 w-full px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer">
                      <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                        <span className="text-red-600 text-sm">🚪</span>
                      </div>
                      <span>Logout</span>
                    </div>
                  }
                  title="Confirm Logout ⏻"
                  description="Are you sure you want to logout? This will redirect you to the login page."
                  confirmLabel="Logout"
                  cancelLabel="Cancel"
                  onConfirm={handleLogout}
                />
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
