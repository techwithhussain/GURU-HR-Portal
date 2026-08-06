import Link from "next/link";
import { CalendarPlus, FileBarChart2, ClipboardList, UserCog, Wallet, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  icon: typeof CalendarPlus;
  label: string;
  href: string;
  gradient: string;
  glow: string;
  disabled?: boolean;
}

const ACTIONS: QuickAction[] = [
  {
    icon: CalendarPlus,
    label: "Apply Leave",
    href: "/leave",
    gradient: "from-violet-500 to-violet-600",
    glow: "hover:shadow-violet-500/30",
  },
  {
    icon: ClipboardList,
    label: "Attendance",
    href: "/dashboard",
    gradient: "from-blue-500 to-blue-600",
    glow: "hover:shadow-blue-500/30",
  },
  {
    icon: FileBarChart2,
    label: "Reports",
    href: "/reports",
    gradient: "from-emerald-500 to-emerald-600",
    glow: "hover:shadow-emerald-500/30",
  },
  {
    icon: Wallet,
    label: "Salary Slip",
    href: "/coming-soon?feature=Salary+Slip",
    gradient: "from-amber-500 to-amber-600",
    glow: "hover:shadow-amber-500/30",
    disabled: true,
  },
  {
    icon: Ticket,
    label: "Raise Ticket",
    href: "/coming-soon?feature=Raise+Ticket",
    gradient: "from-rose-500 to-rose-600",
    glow: "hover:shadow-rose-500/30",
    disabled: true,
  },
  {
    icon: UserCog,
    label: "Edit Profile",
    href: "/profile",
    gradient: "from-slate-500 to-slate-600",
    glow: "hover:shadow-slate-500/30",
  },
];

export function QuickActions() {
  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {ACTIONS.map(({ icon: Icon, label, href, gradient, glow, disabled }) => (
            <Link
              key={label}
              href={href}
              className={`group flex flex-col items-center gap-2.5 rounded-2xl p-3 text-center transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg ${glow} ${
                disabled ? "opacity-60" : ""
              }`}
            >
              {/* Gradient icon circle */}
              <span
                className={`relative flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${gradient} shadow-md transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg`}
              >
                <Icon className="size-5 text-white" />
                {disabled && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-muted px-1 py-0.5 text-[8px] font-semibold text-muted-foreground ring-1 ring-border">
                    Soon
                  </span>
                )}
              </span>
              <span className="text-[11px] font-medium leading-tight text-foreground">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
