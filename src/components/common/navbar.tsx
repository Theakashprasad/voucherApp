"use client";
import * as React from "react";
import Link from "next/link";
import NextImage from "next/image";
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
                    <NextImage
                      src="data:image/jpeg;base64,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"
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
                    <NextImage
                      src="data:image/jpeg;base64,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"
                      width={40}
                      height={40}
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
