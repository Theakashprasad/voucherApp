"use client";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/app/admin/dashboard/AppSidebar";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleLogout = () => {
    // Clear localStorage data
    if (typeof window !== "undefined") {
      localStorage.removeItem("branchDetails");
      localStorage.removeItem("adminDetails");
      localStorage.removeItem("userDetails");

      // Clear auth cookies
      document.cookie =
        "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "role=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

      // Redirect to login
      router.push("/login");
    }
  };

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="overflow-x-hidden">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-5">
            <SidebarTrigger />
            {/* <h1 className="text-xl font-semibold">Dashboard</h1> */}
            <ConfirmDialog
              triggerLabel={
                <div className="flex items-center gap-2 text-red-600">
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </div>
              }
              title="Confirm Logout ⏻"
              description="Are you sure you want to logout? You will be redirected to the login page."
              confirmLabel="Logout"
              cancelLabel="Cancel"
              onConfirm={handleLogout}
            />
          </div>
        </div>
        <main className="p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
