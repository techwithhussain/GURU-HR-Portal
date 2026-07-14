import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import {
  ArrowLeft,
  Briefcase,
  Calendar,
  IdCard,
  Mail,
  Phone,
  Wallet,
  FileText,
} from "lucide-react";
import { getSessionContext } from "@/services/sessionService";
import { getEmployeeProfileAction } from "@/actions/employee.actions";
import { hasPermission } from "@/lib/rbac/permissions";
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
import { DocumentUploadDialog } from "@/features/employees/DocumentUploadDialog";
import { DeleteDocumentButton } from "@/features/employees/DeleteDocumentButton";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  RESIGNED: "bg-slate-200 text-slate-700 border-slate-300",
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  AADHAAR: "Aadhaar",
  PAN: "PAN",
  RESUME: "Resume",
  OFFER_LETTER: "Offer Letter",
  EXPERIENCE_LETTER: "Experience Letter",
  OTHER: "Other",
};

const TIMELINE_LABEL_MAP: Record<string, string> = {
  "employee.created": "Employee Created",
  "employee.updated": "Employee Updated",
  "employee.activated": "Employee Activated",
  "employee.deactivated": "Employee Deactivated",
  "employee.resigned": "Marked Resigned",
  "employee.deleted": "Employee Deleted",
  "employee.document_uploaded": "Document Uploaded",
  "employee.document_deleted": "Document Deleted",
  "user.password_reset_by_admin": "Password Reset by Admin",
  "user.locked_by_admin": "Account Locked",
  "user.unlocked_by_admin": "Account Unlocked",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatMinutes(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

function formatClock(iso: string | Date | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default async function EmployeeProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  let profile;
  try {
    profile = await getEmployeeProfileAction(id);
  } catch (err) {
    return (
      <div className="space-y-4">
        <Link href="/admin/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <p className="text-sm text-destructive">
          {err instanceof Error ? err.message : "Unable to load this employee."}
        </p>
      </div>
    );
  }

  const { employee: e, attendanceSummary, leaveBalances, recentAttendance, documents, timeline } = profile;
  const canViewSalary = hasPermission(session, "salary.view");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link href="/admin/employees" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Back to Employees
        </Link>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href={`/api/employees/${id}/profile-pdf`}>Export PDF</a>
          </Button>
          <Button asChild size="sm">
            <Link href={`/admin/employees/${id}/edit`}>Edit Employee</Link>
          </Button>
        </div>
      </div>

      {/* Employee Information */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange p-6 text-white shadow-elevated">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          {e.profileImageUrl ? (
            <Image
              src={`/api/employees/photo/${e.profileImageUrl}`}
              alt=""
              width={64}
              height={64}
              unoptimized
              className="size-16 shrink-0 rounded-2xl object-cover ring-2 ring-white/30"
            />
          ) : (
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-md">
              {initials(e.fullName)}
            </div>
          )}
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-xl font-bold">{e.fullName}</h1>
              <p className="text-sm text-white/80">
                {e.designation?.name ?? "—"} · {e.department?.name ?? "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <IdCard className="size-3.5" /> {e.user.employeeCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Mail className="size-3.5" /> {e.user.email}
              </span>
              {e.phone && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                  <Phone className="size-3.5" /> {e.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Calendar className="size-3.5" /> Joined {formatDate(e.joiningDate)}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={STATUS_CLASS[e.status] ?? STATUS_CLASS.INACTIVE}>
            {e.status}
          </Badge>
        </div>
      </div>

      {/* Personal Information */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Full Name</p>
            <p className="text-sm font-medium">{e.fullName}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{e.user.email}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{e.phone ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Emergency Contact</p>
            <p className="text-sm font-medium">{e.emergencyContact ?? "—"}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-muted-foreground">Address</p>
            <p className="text-sm font-medium">{e.address ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Company Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4" /> Company Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Department</p>
            <p className="text-sm font-medium">{e.department?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Designation</p>
            <p className="text-sm font-medium">{e.designation?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Shift</p>
            <p className="text-sm font-medium">{e.shift?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Role</p>
            <p className="text-sm font-medium">{e.user.role.name}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Manager</p>
            <p className="text-sm font-medium">{e.manager?.fullName ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Salary */}
      {canViewSalary && (
        <Card id="salary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="size-4" /> Salary
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="text-xs text-muted-foreground">Monthly Salary</p>
              <p className="text-sm font-medium">{e.salary != null ? String(e.salary) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Salary Type</p>
              <p className="text-sm font-medium">{e.salaryType ?? "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Allowances</p>
              <p className="text-sm font-medium">{e.allowances != null ? String(e.allowances) : "—"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Deductions</p>
              <p className="text-sm font-medium">{e.deductions != null ? String(e.deductions) : "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Attendance Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance Summary (this month)</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Present Days</p>
            <p className="text-lg font-semibold">{attendanceSummary.presentDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Absent Days</p>
            <p className="text-lg font-semibold">{attendanceSummary.absentDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Late Days</p>
            <p className="text-lg font-semibold">{attendanceSummary.lateDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Leave Days</p>
            <p className="text-lg font-semibold">{attendanceSummary.leaveDays}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Attendance %</p>
            <p className="text-lg font-semibold text-primary">{attendanceSummary.attendancePercent}%</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Working Hours</p>
            <p className="text-lg font-semibold">{formatMinutes(attendanceSummary.workingMinutes)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Overtime</p>
            <p className="text-lg font-semibold">{formatMinutes(attendanceSummary.overtimeMinutes)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Leave Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Leave Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {leaveBalances.length === 0 && <p className="text-sm text-muted-foreground">No leave balances set.</p>}
          {leaveBalances.map((b) => {
            const allocated = Number(b.allocated);
            const used = Number(b.used);
            const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
            return (
              <div key={b.id} className="space-y-1">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="size-2 rounded-full" style={{ backgroundColor: b.type.color }} />
                  {b.type.name}
                </p>
                <p className="text-sm font-medium">
                  {allocated - used} <span className="text-muted-foreground">/ {allocated}</span>
                </p>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: b.type.color }} />
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Attendance (last 30 days)</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Login</TableHead>
                <TableHead>Logout</TableHead>
                <TableHead>Break</TableHead>
                <TableHead>Working Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAttendance.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{formatDate(a.attendanceDate)}</TableCell>
                  <TableCell>{a.shift?.name ?? "—"}</TableCell>
                  <TableCell>{formatClock(a.checkInAt)}</TableCell>
                  <TableCell>{formatClock(a.checkOutAt)}</TableCell>
                  <TableCell>{a.breakMinutes != null ? formatMinutes(a.breakMinutes) : "—"}</TableCell>
                  <TableCell>{a.workingMinutes != null ? formatMinutes(a.workingMinutes) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{a.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {recentAttendance.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No attendance records yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card id="documents">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <FileText className="size-4" /> Documents
          </CardTitle>
          <DocumentUploadDialog employeeId={id} />
        </CardHeader>
        <CardContent className="space-y-2">
          {documents.length === 0 && <p className="text-sm text-muted-foreground">No documents uploaded yet.</p>}
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{DOCUMENT_TYPE_LABELS[doc.type] ?? doc.type}</p>
                <p className="text-xs text-muted-foreground">
                  {doc.fileName} · {formatDate(doc.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/employees/documents/${doc.storagePath}`} target="_blank" rel="noreferrer">
                    View
                  </a>
                </Button>
                <DeleteDocumentButton documentId={doc.id} employeeId={id} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-5">
              {timeline.map((event, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-0.5 flex size-3 items-center justify-center rounded-full bg-brand-orange ring-4 ring-background" />
                  <p className="text-sm font-medium">{TIMELINE_LABEL_MAP[event.action] ?? event.action}</p>
                  <p className="text-xs text-muted-foreground">{formatDateTime(event.createdAt)}</p>
                </li>
              ))}
            </ol>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
