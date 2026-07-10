import Link from "next/link";
import { listMyLeavesAction, getMyBalancesAction } from "@/actions/leave.actions";
import { listLeaveTypesAction } from "@/actions/leaveType.actions";
import { ApplyLeaveForm } from "@/features/leave/ApplyLeaveForm";
import { CancelLeaveButton } from "@/features/leave/CancelLeaveButton";
import { LeaveCalendar } from "@/features/leave/LeaveCalendar";
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

const LEAVE_STATUS_CLASS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-blue-100 text-blue-700 border-blue-200",
};

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const tab = params.tab === "calendar" ? "calendar" : "leaves";
  const year = new Date().getFullYear();
  const [leaves, balances, leaveTypes] = await Promise.all([
    listMyLeavesAction(),
    getMyBalancesAction(year),
    listLeaveTypesAction(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/reports/leave?startDate=${year}-01-01&endDate=${year}-12-31&format=pdf`}>
            Download Leave Record
          </a>
        </Button>
      </div>

      <div className="flex gap-4 border-b border-border/50 text-sm">
        <Link
          href="/leave?tab=leaves"
          className={`pb-2 ${tab === "leaves" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          My Leaves
        </Link>
        <Link
          href="/leave?tab=calendar"
          className={`pb-2 ${tab === "calendar" ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
        >
          Calendar
        </Link>
      </div>

      {tab === "calendar" ? (
        <LeaveCalendar />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {balances.map((balance) => {
              const allocated = Number(balance.allocated);
              const used = Number(balance.used);
              const remaining = allocated - used;
              const pct = allocated > 0 ? Math.min(100, Math.round((used / allocated) * 100)) : 0;
              return (
                <Card key={balance.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: balance.type.color }} />
                      {balance.type.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-semibold">
                      {remaining} <span className="text-sm font-normal text-muted-foreground">/ {allocated}</span>
                    </p>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: balance.type.color }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{used} used of {allocated}</p>
                  </CardContent>
                </Card>
              );
            })}
            {leaveTypes
              .filter((t) => t.defaultAllocationDays == null)
              .map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">Unlimited</p>
                  </CardContent>
                </Card>
              ))}
            {balances.length === 0 && leaveTypes.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                No leave balance set yet — contact Admin.
              </p>
            )}
          </div>

          <ApplyLeaveForm
            leaveTypes={leaveTypes.map((t) => ({ id: t.id, name: t.name, requiresAttachment: t.requiresAttachment }))}
          />

          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">My Leaves</h2>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Applied</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Admin Remarks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leaves.map((leave) => (
                  <TableRow key={leave.id}>
                    <TableCell>{leave.type.name}</TableCell>
                    <TableCell>{formatDate(leave.startDate)}</TableCell>
                    <TableCell>{formatDate(leave.endDate)}</TableCell>
                    <TableCell>{String(leave.days)}</TableCell>
                    <TableCell className="max-w-40 truncate">{leave.reason ?? "—"}</TableCell>
                    <TableCell>{formatDate(leave.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={LEAVE_STATUS_CLASS[leave.status]}>
                        {leave.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-40 truncate">
                      {leave.decisionReason ?? leave.cancellationReason ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {leave.status === "APPLIED" && <CancelLeaveButton leaveId={leave.id} />}
                    </TableCell>
                  </TableRow>
                ))}
                {leaves.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No leave requests yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
