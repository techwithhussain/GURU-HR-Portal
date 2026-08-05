import Link from "next/link";
import { CalendarPlus, FileBarChart2, ClipboardList, UserCog, Wallet, Ticket } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuickAction {
  icon: typeof CalendarPlus;
  label: string;
  href: string;
  soft: string;
  disabled?: boolean;
}

const ACTIONS: QuickAction[] = [
  { icon: CalendarPlus, label: "Apply Leave", href: "/leave", soft: "bg-violet-50 text-violet-600" },
  { icon: ClipboardList, label: "Attendance", href: "/dashboard", soft: "bg-blue-50 text-blue-600" },
  { icon: FileBarChart2, label: "Reports", href: "/reports", soft: "bg-emerald-50 text-emerald-600" },
  {
    icon: Wallet,
    label: "Salary Slip",
    href: "/coming-soon?feature=Salary+Slip",
    soft: "bg-amber-50 text-amber-600",
    disabled: true,
  },
  {
    icon: Ticket,
    label: "Raise Ticket",
    href: "/coming-soon?feature=Raise+Ticket",
    soft: "bg-rose-50 text-rose-600",
    disabled: true,
  },
  {
    icon: UserCog,
    label: "Edit Profile",
    href: "/profile",
    soft: "bg-slate-100 text-slate-600",
  },
];

export function QuickActions() {
  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="border-b border-border/60 pb-4">
        <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="pt-5">
        <div className="grid grid-cols-2 gap-3">
          {ACTIONS.map(({ icon: Icon, label, href, soft, disabled }) => (
            <Link
              key={label}
              href={href}
              className={`group flex flex-col items-center gap-2 rounded-2xl border border-border/50 px-2 py-3.5 text-center text-[11px] font-medium transition-all duration-200 hover:-translate-y-0.5 hover:border-transparent hover:shadow-soft ${
                disabled ? "text-muted-foreground/70" : "text-foreground"
              }`}
            >
              <span
                className={`flex size-9 items-center justify-center rounded-xl ${soft} transition-transform duration-200 group-hover:scale-110`}
              >
                <Icon className="size-4.5" />
              </span>
              {label}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
