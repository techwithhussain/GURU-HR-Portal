import { redirect } from "next/navigation";
import { listPendingApprovalsAction } from "@/actions/leave.actions";
import { listEmployees } from "@/services/orgService";
import { getSessionContext } from "@/services/sessionService";
import { LeaveDecisionForm } from "@/features/leave/LeaveDecisionForm";
import { SetLeaveBalanceForm } from "@/features/leave/SetLeaveBalanceForm";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function AdminLeavePage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const [pending, employees] = await Promise.all([listPendingApprovalsAction(), listEmployees()]);

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead className="text-right">Decision</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pending.map((leave) => (
              <TableRow key={leave.id}>
                <TableCell>{leave.employee.fullName}</TableCell>
                <TableCell>{leave.type}</TableCell>
                <TableCell>
                  {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                </TableCell>
                <TableCell>{String(leave.days)}</TableCell>
                <TableCell className="max-w-48 truncate">{leave.reason ?? "—"}</TableCell>
                <TableCell>
                  <LeaveDecisionForm leaveId={leave.id} />
                </TableCell>
              </TableRow>
            ))}
            {pending.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No pending leave requests.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">Set Leave Balance</h2>
        <SetLeaveBalanceForm employees={employees} />
      </div>
    </div>
  );
}
