import Link from "next/link";
import { notFound } from "next/navigation";
import { Briefcase, Calendar, IdCard, KeyRound, Mail, UserCog } from "lucide-react";
import { getMyProfileAction } from "@/actions/employee.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MyProfileForm } from "@/features/employees/MyProfileForm";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ACTIVE: "default",
  INACTIVE: "secondary",
  RESIGNED: "outline",
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function ProfilePage() {
  let profile;
  try {
    profile = await getMyProfileAction();
  } catch {
    notFound();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>

      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange p-6 text-white shadow-elevated">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-md">
              {initials(profile.fullName)}
            </div>
          <div className="flex-1 space-y-2">
            <div>
              <h2 className="text-xl font-bold">{profile.fullName}</h2>
              <p className="text-sm text-white/80">
                {profile.designation?.name ?? "-"} · {profile.department?.name ?? "-"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <IdCard className="size-3.5" /> {profile.user.employeeCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Mail className="size-3.5" /> {profile.user.email}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Briefcase className="size-3.5" /> {profile.shift?.name ?? "No shift"}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Calendar className="size-3.5" /> Joined {formatDate(profile.joiningDate)}
              </span>
              {profile.manager && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                  <UserCog className="size-3.5" /> Reports to {profile.manager.fullName}
                </span>
              )}
            </div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[profile.status] ?? "outline"} className="shrink-0">
            {profile.status}
          </Badge>
        </div>
      </div>

      <Card className="max-w-2xl">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Contact Details</CardTitle>
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/change-password">
              <KeyRound className="size-3.5" /> Change Password
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <MyProfileForm
            phone={profile.phone}
            address={profile.address}
            emergencyContact={profile.emergencyContact}
          />
        </CardContent>
      </Card>
    </div>
  );
}
