"use client";

import {
  CalendarDays,
  Contact2,
  Folder,
  Home,
  MailIcon,
  PersonStanding,
  PlaySquareIcon,
  Settings,
} from "lucide-react";
import { ReactElement, useState, useEffect } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import ProfileLogo from "@/../public/profile.png";
import { toast, Toaster } from "sonner";
import { usePathname } from "next/navigation";

// Menu items.
const Icons = {
  Home: (props: React.SVGProps<SVGSVGElement>) => <Home {...props} />,
  PersonStanding: (props: React.SVGProps<SVGSVGElement>) => (
    <PersonStanding {...props} />
  ),
  Settings: (props: React.SVGProps<SVGSVGElement>) => <Settings {...props} />,
  Play: (props: React.SVGProps<SVGSVGElement>) => <PlaySquareIcon {...props} />,
  Mail: (props: React.SVGProps<SVGSVGElement>) => <MailIcon {...props} />,
  Contact: (props: React.SVGProps<SVGSVGElement>) => <Contact2 {...props} />,
  Event: (props: React.SVGProps<SVGSVGElement>) => <CalendarDays {...props} />,
  Category: (props: React.SVGProps<SVGSVGElement>) => <Folder {...props} />,
};

type RouteItem = {
  label: string;
  href: string;
  icon: ReactElement;
};

const items: RouteItem[] = [
  {
    label: "Home",
    href: "/admin/dashboard",
    icon: (
      <Icons.Home className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
  },
  {
    label: "Create",
    href: "/admin/dashboard/branch/createbranch",
    icon: (
      <Icons.Event className="text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0" />
    ),
  },
];

function SidebarHeaderContent() {
  const { state } = useSidebar();

  return (
    <div className="flex items-center gap-3">
      {/* <div
        className={`flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
          state === "collapsed"
            ? "bg-blue-600 w-5 h-5 rounded-full"
            : "bg-blue-600 w-10 h-10 rounded-lg"
        }`}
      >
        <span
          className={`font-bold transition-all duration-200 text-white leading-none ${
            state === "collapsed" ? "text-[10px]" : "text-xl"
          }`}
        >
          L
        </span>
      </div> */}
      <div
        className={`flex items-center justify-center transition-all duration-200 flex-shrink-0 `}
      >
        <Image
          src={ProfileLogo}
          alt="Logo"
          width={state === "collapsed" ? 25 : 50}
          height={state === "collapsed" ? 25 : 50}
          className="transition-all duration-200 object-contain"
        />
      </div>
      <span
        className={`font-heading font-semibold text-lg transition-all duration-200 text-gray-800 dark:text-gray-200 ${
          state === "collapsed"
            ? "opacity-0 w-0 overflow-hidden"
            : "opacity-100"
        }`}
      >
        Voucher Admin
      </span>
    </div>
  );
}

export function DashboardSidebar() {
  const { state } = useSidebar();
  const pathname = usePathname();
  const [adminDetails, setAdminDetails] = useState({
    username: "",
    password: "",
    _id: "",
  });
  const [newPassword, setNewPassword] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Load admin details from localStorage on component mount
  useEffect(() => {
    const storedAdminDetails = localStorage.getItem("adminDetails");
    console.log("Stored admin details:", storedAdminDetails);
    if (storedAdminDetails) {
      const parsed = JSON.parse(storedAdminDetails);
      console.log("Parsed admin details:", parsed);
      setNewPassword(parsed.password);
      setAdminDetails(parsed);
    }
  }, []);

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted");

    if (!newPassword.trim()) {
      toast.error("Please enter a new password");
      return;
    }

    if (!adminDetails._id) {
      toast.error("Admin details not found. Please refresh the page.");
      return;
    }

    setIsUpdating(true);
    try {
      const response = await fetch("/api/login", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminId: adminDetails._id,
          newPassword: newPassword,
        }),
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        toast.error(errorData.error || "Failed to update password");
        return;
      }

      // Update local state
      const updatedAdminDetails = { ...adminDetails, password: newPassword };
      setAdminDetails(updatedAdminDetails);
      localStorage.setItem("adminDetails", JSON.stringify(updatedAdminDetails));

      toast.success("Password updated successfully!");
    } catch (error) {
      console.error("Error updating password:", error);
      toast.error("Something went wrong while updating password");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className=" border-neutral-200 dark:border-neutral-700 p-2">
        <SidebarHeaderContent />
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="pt-3 ">
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton
                asChild
                tooltip={item.label}
                isActive={pathname === item.href}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 "
                >
                  {item.icon}
                  <span className="font-heading font-semibold text-base">
                    {item.label}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 dark:border-neutral-700 p-2">
        <Toaster position="top-right" expand={true} />

        <Dialog>
          <DialogTrigger asChild>
            <SidebarMenuButton asChild tooltip="Profile" className="h-10 ">
              <button
                type="button"
                aria-label="Profile"
                className={`flex items-center ${
                  state === "collapsed"
                    ? "justify-center w-full "
                    : "gap-3 w-full text-left hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg p-2 transition-colors"
                }`}
              >
                {state === "collapsed" ? (
                  <Icons.Contact className="text-neutral-700  dark:text-neutral-200 h-5 w-5" />
                ) : (
                  <Image
                    src="data:image/jpeg;base64,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"
                    className="h-8 w-8 flex-shrink-0 rounded-full border-2 border-gray-200 dark:border-gray-700 object-cover"
                    width={32}
                    height={32}
                    alt="Avatar"
                  />
                )}
                {state !== "collapsed" && (
                  <div className="flex flex-col">
                    <span className="font-heading font-semibold text-sm text-gray-800 dark:text-gray-200">
                      Profile
                    </span>
                    <span className="font-sans text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                      {adminDetails.username || "Admin"}
                    </span>
                  </div>
                )}
              </button>
            </SidebarMenuButton>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <form onSubmit={handlePasswordUpdate}>
              <DialogHeader>
                <DialogTitle className="text-center font-heading font-semibold">
                  Edit profile
                </DialogTitle>
                <DialogDescription className="font-sans">
                  Update your password. Username cannot be changed.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-3">
                  <Label
                    htmlFor="username"
                    className="font-heading font-medium"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={adminDetails.username}
                    disabled={true}
                  />
                </div>
                <div className="grid gap-3">
                  <Label
                    htmlFor="newPassword"
                    className="font-heading font-medium"
                  >
                    New Password
                  </Label>
                  <Input
                    id="newPassword"
                    name="newPassword"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                  />
                </div>
              </div>
              <DialogFooter className="pt-4">
                <DialogClose asChild>
                  <Button
                    variant="outline"
                    type="button"
                    className="font-heading font-medium"
                  >
                    Cancel
                  </Button>
                </DialogClose>
                <Button
                  type="submit"
                  disabled={isUpdating}
                  className="font-heading font-medium"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log("Button clicked");
                    handlePasswordUpdate(e);
                  }}
                >
                  {isUpdating ? "Updating..." : "Save changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
