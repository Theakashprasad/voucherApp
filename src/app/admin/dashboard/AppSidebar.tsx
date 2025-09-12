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
import { ReactElement } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";

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

export function DashboardSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className=" border-neutral-200 dark:border-neutral-700 p-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">V</span>
          </div>
          <span className="font-semibold text-lg">Voucher Admin</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.label}>
              <SidebarMenuButton asChild>
                <Link href={item.href} className="flex items-center gap-3">
                  {item.icon}
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="border-t border-neutral-200 dark:border-neutral-700 p-4">
        <Dialog>
          <form>
            <DialogTrigger asChild>
              <SidebarMenuButton asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 w-full text-left"
                >
                  <Image
                    src="/profile.png"
                    className="h-7 w-7 flex-shrink-0 rounded-full"
                    width={28}
                    height={28}
                    alt="Avatar"
                  />
                  <span>Profile</span>
                </button>
              </SidebarMenuButton>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle className="text-center">Edit profile</DialogTitle>
           
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <Label htmlFor="name-1">Username</Label>
                  <Input id="name-1" name="name" defaultValue="Adminlazzanio" disabled={true}/>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="username-1">Username</Label>
                  <Input
                    id="username-1"
                    name="username"
                    defaultValue="@peduarte"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save changes</Button>
              </DialogFooter>
            </DialogContent>
          </form>
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
