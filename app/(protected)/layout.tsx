import Image from "next/image";
import { redirect } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock,
  FileBarChart2,
  Folder,
  Home,
  LayoutDashboard,
  Plane,
  Search,
  Settings,
  ShieldCheck,
  User,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getSessionContext } from "@/services/sessionService";
import { getUnreadCount } from "@/services/notificationService";
import { getMyDashboardProfile } from "@/services/dashboardService";
import { NotificationBell } from "@/features/notifications/NotificationBell";
import { SidebarNav, type SidebarLink } from "@/features/shell/SidebarNav";
import { LiveClock } from "@/features/shell/LiveClock";
import { UserMenu } from "@/features/shell/UserMenu";

const EMPLOYEE_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/reports", label: "Attendance History", icon: FileBarChart2 },
  { href: "/leave", label: "My Leave", icon: Plane },
  { href: "/coming-soon?feature=Salary+Slip", label: "Salary Slip", icon: Wallet },
  { href: "/coming-soon?feature=Documents", label: "Documents", icon: Folder },
  { href: "/coming-soon?feature=Holidays", label: "Holidays", icon: CalendarDays },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/coming-soon?feature=Profile", label: "Profile", icon: User },
  { href: "/change-password", label: "Settings", icon: Settings },
];

const ADMIN_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/employees", label: "Employees", icon: Users },
  { href: "/admin/shifts", label: "Shifts", icon: Clock },
  { href: "/reports", label: "Reports", icon: FileBarChart2 },
  { href: "/admin/leave", label: "Leave Management", icon: ShieldCheck },
  { href: "/coming-soon?feature=Salary+Slip", label: "Salary Slip", icon: Wallet },
  { href: "/admin/settings", label: "Company Settings", icon: Settings },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const session = await getSessionContext();
  if (!session) redirect("/login");

  const [unreadCount, profile] = await Promise.all([
    getUnreadCount(session),
    session.employeeId ? getMyDashboardProfile(session) : Promise.resolve(null),
  ]);

  const isAdmin = session.roleName === "ADMIN";
  const rawLinks = isAdmin ? ADMIN_LINKS : EMPLOYEE_LINKS;

  const links: SidebarLink[] = rawLinks.map(({ href, label, icon: Icon }) => ({
    href,
    label,
    icon: <Icon className="size-4 shrink-0" />,
  }));

  const fullName = profile?.fullName ?? session.employeeCode;

  return (
    <div className="flex min-h-full">
      <aside className="flex w-64 shrink-0 flex-col bg-gradient-to-b from-sidebar to-brand-navy-soft text-sidebar-foreground">
        <div className="flex items-center gap-2.5 px-5 py-6">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10 p-1.5 ring-1 ring-white/10">
            <Image
              src="/logo.png"
              alt="Guru Digital Advertising"
              width={32}
              height={32}
              unoptimized
              className="size-full object-contain"
            />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-bold tracking-wide">GURU</div>
            <div className="text-[10px] tracking-wide text-sidebar-foreground/50">DIGITAL ADVERTISING</div>
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="h-px bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
        </div>

        <SidebarNav links={links} />

        <div className="mt-auto p-3">
          <div className="relative overflow-hidden rounded-2xl shadow-elevated ring-1 ring-white/10">
            <Image
              src="/mascot.png"
              alt="Marketing is my Dharma"
              width={256}
              height={220}
              unoptimized
              className="w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-brand-navy via-brand-navy/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 px-4 pb-4">
              <p className="text-sm font-semibold text-white drop-shadow-sm">
                Marketing is my <span className="text-brand-orange-light">Dharma</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-border/60 bg-white/80 px-6 py-3.5 backdrop-blur-md">
          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search anything..."
              disabled
              className="w-full rounded-full border border-border/70 bg-muted/40 py-2 pl-9 pr-3 text-sm text-foreground shadow-soft placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
            />
          </div>
          <div className="flex items-center gap-3">
            <LiveClock />
            <div className="h-8 w-px bg-border" />
            <NotificationBell initialUnreadCount={unreadCount} />
            <UserMenu fullName={fullName} employeeCode={session.employeeCode} roleName={session.roleName} />
          </div>
        </header>
        <main className="bg-app-canvas flex flex-1 flex-col p-6">{children}</main>
      </div>
    </div>
  );
}
