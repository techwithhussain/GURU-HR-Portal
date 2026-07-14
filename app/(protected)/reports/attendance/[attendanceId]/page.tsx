import Link from "next/link";
import { ArrowLeft, Briefcase, Calendar, Clock, IdCard, Mail, Phone } from "lucide-react";
import { getSessionContext } from "@/services/sessionService";
import { getEmployeeAttendanceDetail } from "@/services/reportsService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AdminNotesEditor } from "@/features/reports/AdminNotesEditor";
import { PrintButton } from "@/features/reports/PrintButton";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  PRESENT: "default",
  LATE: "outline",
  HALF_DAY: "secondary",
  ABSENT: "destructive",
  ON_LEAVE: "secondary",
  HOLIDAY: "secondary",
  WEEKLY_OFF: "secondary",
  ACTIVE: "default",
  INACTIVE: "secondary",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMinutes(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

function ProgressBar({
  label,
  value,
  max,
  display,
}: {
  label: string;
  value: number;
  max: number;
  display: string;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{display}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-blue to-brand-orange transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default async function EmployeeAttendanceDetailPage({
  params,
}: {
  params: Promise<{ attendanceId: string }>;
}) {
  const { attendanceId } = await params;
  const session = await getSessionContext();
  if (!session) return null;

  let detail;
  try {
    detail = await getEmployeeAttendanceDetail(attendanceId, session);
  } catch (err) {
    return (
      <div className="space-y-4">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Back to Reports
        </Link>
        <p className="text-sm text-destructive">
          {err instanceof Error ? err.message : "Unable to load this attendance record."}
        </p>
      </div>
    );
  }

  const exportBase = `/api/reports/attendance/${attendanceId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <Link href="/reports" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Back to Reports
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`${exportBase}?format=xlsx`}>Export Excel</a>
          </Button>
          <Button asChild variant="outline" size="sm">
            <a href={`${exportBase}?format=pdf`}>Export PDF</a>
          </Button>
          <PrintButton />
        </div>
      </div>

      {/* Employee Information */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange p-6 text-white shadow-elevated">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 right-40 size-64 rounded-full bg-brand-orange/30 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-md">
            {initials(detail.employee.fullName)}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-xl font-bold">{detail.employee.fullName}</h1>
              <p className="text-sm text-white/80">
                {detail.employee.designation} · {detail.employee.department}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <IdCard className="size-3.5" /> {detail.employee.employeeCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Mail className="size-3.5" /> {detail.employee.email}
              </span>
              {detail.employee.phone && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                  <Phone className="size-3.5" /> {detail.employee.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Briefcase className="size-3.5" /> {detail.employee.shiftName}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Calendar className="size-3.5" /> Joined {detail.employee.joiningDate}
              </span>
            </div>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[detail.employee.status] ?? "outline"} className="shrink-0">
            {detail.employee.status}
          </Badge>
        </div>
      </div>

      {/* Attendance Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="size-4" /> Attendance Information — {detail.attendance.date}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
          <Field label="Shift Start" value={formatClock(detail.attendance.shiftStart)} />
          <Field label="Shift End" value={formatClock(detail.attendance.shiftEnd)} />
          <Field label="Login" value={formatClock(detail.attendance.checkInAt)} />
          <Field label="Logout" value={formatClock(detail.attendance.checkOutAt)} />
          <Field label="Working Hours" value={formatMinutes(detail.attendance.workingMinutes)} />
          <Field label="Break Hours" value={formatMinutes(detail.attendance.breakMinutes)} />
          <Field label="Late" value={`${detail.attendance.lateMinutes} min`} />
          <Field label="Early Exit" value={`${detail.attendance.earlyExitMinutes} min`} />
          <Field label="Overtime" value={`${detail.attendance.overtimeMinutes} min`} />
          <div>
            <p className="text-xs text-muted-foreground">Status</p>
            <Badge variant={STATUS_BADGE_VARIANT[detail.attendance.status] ?? "outline"} className="mt-1">
              {detail.attendance.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Break History */}
      <Card>
        <CardHeader>
          <CardTitle>Break History</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.breaks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No breaks recorded for this day.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Start</TableHead>
                  <TableHead>End</TableHead>
                  <TableHead>Duration</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {detail.breaks.map((b, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{b.type}</TableCell>
                    <TableCell>{formatClock(b.startAt)}</TableCell>
                    <TableCell>{formatClock(b.endAt)}</TableCell>
                    <TableCell>{formatMinutes(b.durationMin)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Complete Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Complete Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {detail.timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded for this day.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-5">
              {detail.timeline.map((event, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-0.5 flex size-3 items-center justify-center rounded-full bg-brand-orange ring-4 ring-background" />
                  <p className="text-sm font-medium">{event.label}</p>
                  <p className="text-xs text-muted-foreground">{formatClock(event.time)}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* Working Hours Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Working Hours Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <ProgressBar
            label="Actual vs Expected Shift Hours"
            value={detail.summary.netWorkingMinutes ?? 0}
            max={detail.summary.expectedMinutes}
            display={formatMinutes(detail.summary.netWorkingMinutes)}
          />
          <ProgressBar
            label="Attendance % (this month)"
            value={detail.summary.attendancePercentThisMonth}
            max={100}
            display={`${detail.summary.attendancePercentThisMonth}%`}
          />
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
            <Field label="Expected Shift Hours" value={formatMinutes(detail.summary.expectedMinutes)} />
            <Field label="Actual Working Hours" value={formatMinutes(detail.summary.actualSpanMinutes)} />
            <Field label="Break Time" value={formatMinutes(detail.summary.breakMinutes)} />
            <Field label="Net Working Hours" value={formatMinutes(detail.summary.netWorkingMinutes)} />
          </div>
        </CardContent>
      </Card>

      {/* Device Information (optional) */}
      <Card>
        <CardHeader>
          <CardTitle>Device Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Browser" value={detail.deviceInfo.loginBrowser ?? "—"} />
          <Field label="Operating System" value={detail.deviceInfo.loginOs ?? "—"} />
          <Field label="Login IP" value={detail.deviceInfo.loginIp ?? "—"} />
          <Field label="Logout IP" value={detail.deviceInfo.logoutIp ?? "—"} />
        </CardContent>
      </Card>

      {/* Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="mb-2 text-xs text-muted-foreground">Admin Notes</p>
            <AdminNotesEditor attendanceId={detail.attendanceId} initialNotes={detail.notes.adminNotes ?? ""} />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Attendance Remarks</p>
            <p className="text-sm">{detail.notes.attendanceRemarks ?? "—"}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
