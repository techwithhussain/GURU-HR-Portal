import Link from "next/link";
import { notFound } from "next/navigation";
import {
  listAllLeavesAction,
  listAllBalancesAction,
  setLeaveBalanceAction,
} from "@/actions/leave.actions";
import {
  listAllLeaveTypesAction,
  activateLeaveTypeAction,
  deactivateLeaveTypeAction,
} from "@/actions/leaveType.actions";
import { listDepartments, listDesignations, listEmployees } from "@/services/orgService";
import { getSessionContext } from "@/services/sessionService";
import { LeaveDecisionForm } from "@/features/leave/LeaveDecisionForm";
import { SetLeaveBalanceForm } from "@/features/leave/SetLeaveBalanceForm";
import { CancelLeaveButton } from "@/features/leave/CancelLeaveButton";
import { DeleteLeaveButton } from "@/features/leave/DeleteLeaveButton";
import { LeaveTypeFormDialog } from "@/features/leave/LeaveTypeFormDialog";
import { DeleteLeaveTypeButton } from "@/features/leave/DeleteLeaveTypeButton";
import { LeaveCalendar } from "@/features/leave/LeaveCalendar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const LEAVE_STATUS_CLASS: Record<string, string> = {
  APPLIED: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  CANCELLED: "bg-blue-100 text-blue-700 border-blue-200",
};

const STATUS_OPTIONS = ["APPLIED", "APPROVED", "REJECTED", "CANCELLED"] as const;

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function AdminLeavePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  const params = await searchParams;
  const tab = (["requests", "balances", "types", "calendar"] as const).includes(params.tab as never)
    ? (params.tab as "requests" | "balances" | "types" | "calendar")
    : "requests";
  const year = new Date().getFullYear();

  const [employees, departments, designations, leaveTypes] = await Promise.all([
    listEmployees(),
    listDepartments(),
    listDesignations(),
    listAllLeaveTypesAction(),
  ]);

  const leaves =
    tab === "requests"
      ? await listAllLeavesAction({
          employeeId: params.employeeId || undefined,
          departmentId: params.departmentId || undefined,
          designationId: params.designationId || undefined,
          typeId: params.typeId || undefined,
          status: (params.status as never) || undefined,
          startDate: params.startDate ? new Date(params.startDate) : undefined,
          endDate: params.endDate ? new Date(params.endDate) : undefined,
        })
      : [];

  const balances = tab === "balances" ? await listAllBalancesAction(year) : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leave Management</h1>

      <div className="flex gap-4 border-b border-border/50 text-sm">
        {(["requests", "balances", "types", "calendar"] as const).map((t) => (
          <Link
            key={t}
            href={`/admin/leave?tab=${t}`}
            className={`pb-2 capitalize ${tab === t ? "border-b-2 border-primary font-medium" : "text-muted-foreground"}`}
          >
            {t === "types" ? "Leave Types" : t}
          </Link>
        ))}
      </div>

      {tab === "requests" && (
        <div className="space-y-4">
          <form method="get" className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="requests" />
            <div className="space-y-2">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={params.startDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={params.endDate ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employeeId">Employee</Label>
              <select id="employeeId" name="employeeId" className={selectClass} defaultValue={params.employeeId ?? ""}>
                <option value="">All</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.fullName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="departmentId">Department</Label>
              <select id="departmentId" name="departmentId" className={selectClass} defaultValue={params.departmentId ?? ""}>
                <option value="">All</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="designationId">Designation</Label>
              <select id="designationId" name="designationId" className={selectClass} defaultValue={params.designationId ?? ""}>
                <option value="">All</option>
                {designations.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="typeId">Leave Type</Label>
              <select id="typeId" name="typeId" className={selectClass} defaultValue={params.typeId ?? ""}>
                <option value="">All</option>
                {leaveTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select id="status" name="status" className={selectClass} defaultValue={params.status ?? ""}>
                <option value="">All</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" variant="outline">
              Filter
            </Button>
          </form>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Dates</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Applied</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaves.map((leave) => (
                <TableRow key={leave.id}>
                  <TableCell>
                    <Link href={`/admin/leave/${leave.id}`} className="font-medium hover:underline">
                      {leave.employee.fullName}
                    </Link>
                    <p className="text-xs text-muted-foreground">{leave.employee.user.employeeCode}</p>
                  </TableCell>
                  <TableCell>{leave.employee.department?.name ?? "-"}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: leave.type.color }} />
                      {leave.type.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                  </TableCell>
                  <TableCell>{String(leave.days)}</TableCell>
                  <TableCell>{formatDate(leave.createdAt)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={LEAVE_STATUS_CLASS[leave.status]}>
                      {leave.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      {leave.status === "APPLIED" && <LeaveDecisionForm leaveId={leave.id} />}
                      {(leave.status === "APPLIED" || leave.status === "APPROVED") && (
                        <CancelLeaveButton leaveId={leave.id} />
                      )}
                      <DeleteLeaveButton leaveId={leave.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {leaves.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No leave requests match these filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "balances" && (
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold tracking-tight">Set Leave Balance</h2>
            <SetLeaveBalanceForm
              employees={employees}
              leaveTypes={leaveTypes.map((t) => ({ id: t.id, name: t.name }))}
            />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Used</TableHead>
                <TableHead>Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balances.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>
                    {b.employee.fullName} <span className="text-xs text-muted-foreground">({b.employee.user.employeeCode})</span>
                  </TableCell>
                  <TableCell>{b.type.name}</TableCell>
                  <TableCell>{b.year}</TableCell>
                  <TableCell>{String(b.allocated)}</TableCell>
                  <TableCell>{String(b.used)}</TableCell>
                  <TableCell>{Number(b.allocated) - Number(b.used)}</TableCell>
                </TableRow>
              ))}
              {balances.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No balances set for {year} yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "types" && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <LeaveTypeFormDialog trigger={<Button size="sm">Add Leave Type</Button>} />
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Yearly Allocation</TableHead>
                <TableHead>Requires Attachment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaveTypes.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{t.code}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                      {t.name}
                    </span>
                  </TableCell>
                  <TableCell>{t.defaultAllocationDays != null ? String(t.defaultAllocationDays) : "Unlimited"}</TableCell>
                  <TableCell>{t.requiresAttachment ? "Yes" : "No"}</TableCell>
                  <TableCell>
                    <Badge variant={t.isActive ? "default" : "secondary"}>{t.isActive ? "ACTIVE" : "INACTIVE"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <LeaveTypeFormDialog
                        leaveType={{
                          id: t.id,
                          code: t.code,
                          name: t.name,
                          defaultAllocationDays: t.defaultAllocationDays != null ? Number(t.defaultAllocationDays) : null,
                          requiresAttachment: t.requiresAttachment,
                          color: t.color,
                        }}
                        trigger={
                          <Button type="button" variant="outline" size="sm">
                            Edit
                          </Button>
                        }
                      />
                      {t.isActive ? (
                        <form
                          action={async () => {
                            "use server";
                            await deactivateLeaveTypeAction(t.id);
                          }}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Deactivate
                          </Button>
                        </form>
                      ) : (
                        <form
                          action={async () => {
                            "use server";
                            await activateLeaveTypeAction(t.id);
                          }}
                        >
                          <Button type="submit" variant="outline" size="sm">
                            Activate
                          </Button>
                        </form>
                      )}
                      <DeleteLeaveTypeButton leaveTypeId={t.id} name={t.name} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {tab === "calendar" && <LeaveCalendar />}
    </div>
  );
}
