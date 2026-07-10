import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Briefcase, Calendar, IdCard, Mail, Phone } from "lucide-react";
import { getSessionContext } from "@/services/sessionService";
import { getLeaveDetailAction } from "@/actions/leave.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LEAVE_STATUS_CLASS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-blue-100 text-blue-700 border-blue-200",
};

const TIMELINE_LABELS: Record<string, string> = {
  "leave.applied": "Leave Submitted",
  "leave.approved": "Leave Approved",
  "leave.rejected": "Leave Rejected",
  "leave.cancelled": "Leave Cancelled",
  "leave.edited": "Leave Edited",
  "leave.deleted": "Leave Deleted",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString();
}

export default async function LeaveDetailPage({ params }: { params: Promise<{ leaveId: string }> }) {
  const { leaveId } = await params;
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  let detail;
  try {
    detail = await getLeaveDetailAction(leaveId);
  } catch (err) {
    return (
      <div className="space-y-4">
        <Link href="/admin/leave" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
          <ArrowLeft className="size-4" /> Back to Leave Management
        </Link>
        <p className="text-sm text-destructive">
          {err instanceof Error ? err.message : "Unable to load this leave request."}
        </p>
      </div>
    );
  }

  const { leave, timeline } = detail;

  return (
    <div className="space-y-6">
      <Link href="/admin/leave" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:underline">
        <ArrowLeft className="size-4" /> Back to Leave Management
      </Link>

      {/* Employee Information */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-blue via-brand-blue-light to-brand-orange p-6 text-white shadow-elevated">
        <div className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-white/10 blur-3xl" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-xl font-bold backdrop-blur-md">
            {initials(leave.employee.fullName)}
          </div>
          <div className="flex-1 space-y-2">
            <div>
              <h1 className="text-xl font-bold">{leave.employee.fullName}</h1>
              <p className="text-sm text-white/80">
                {leave.employee.designation?.name ?? "—"} · {leave.employee.department?.name ?? "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <IdCard className="size-3.5" /> {leave.employee.user.employeeCode}
              </span>
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Mail className="size-3.5" /> {leave.employee.user.email}
              </span>
              {leave.employee.phone && (
                <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                  <Phone className="size-3.5" /> {leave.employee.phone}
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1 backdrop-blur-md">
                <Calendar className="size-3.5" /> Joined {formatDate(leave.employee.joiningDate)}
              </span>
            </div>
          </div>
          <Badge variant="outline" className={LEAVE_STATUS_CLASS[leave.status]}>
            {leave.status}
          </Badge>
        </div>
      </div>

      {/* Leave Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="size-4" /> Leave Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div>
            <p className="text-xs text-muted-foreground">Type</p>
            <p className="flex items-center gap-1.5 text-sm font-medium">
              <span className="size-2 rounded-full" style={{ backgroundColor: leave.type.color }} />
              {leave.type.name}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">From</p>
            <p className="text-sm font-medium">{formatDate(leave.startDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">To</p>
            <p className="text-sm font-medium">{formatDate(leave.endDate)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Total Days</p>
            <p className="text-sm font-medium">{String(leave.days)}{leave.isHalfDay ? " (Half Day)" : ""}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Applied Date</p>
            <p className="text-sm font-medium">{formatDate(leave.createdAt)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Decision Date</p>
            <p className="text-sm font-medium">{leave.decidedAt ? formatDate(leave.decidedAt) : "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Approver</p>
            <p className="text-sm font-medium">{leave.approver?.employee?.fullName ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Cancelled By</p>
            <p className="text-sm font-medium">{leave.cancelledBy?.employee?.fullName ?? "—"}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-muted-foreground">Reason</p>
            <p className="text-sm font-medium">{leave.reason ?? "—"}</p>
          </div>
          <div className="col-span-2 sm:col-span-4">
            <p className="text-xs text-muted-foreground">Admin Remarks</p>
            <p className="text-sm font-medium">{leave.decisionReason ?? leave.cancellationReason ?? "—"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Attachment */}
      <Card>
        <CardHeader>
          <CardTitle>Attachment</CardTitle>
        </CardHeader>
        <CardContent>
          {leave.attachmentPath ? (
            <a
              href={`/api/leave/attachments/${leave.attachmentPath}`}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-primary hover:underline"
            >
              {leave.attachmentFileName ?? "Download attachment"}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">No attachment provided.</p>
          )}
        </CardContent>
      </Card>

      {/* Approval Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          {timeline.length === 0 ? (
            <p className="text-sm text-muted-foreground">No activity recorded.</p>
          ) : (
            <ol className="relative space-y-5 border-l border-border pl-5">
              {timeline.map((event, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[26px] top-0.5 flex size-3 items-center justify-center rounded-full bg-brand-orange ring-4 ring-background" />
                  <p className="text-sm font-medium">{TIMELINE_LABELS[event.action] ?? event.action}</p>
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
