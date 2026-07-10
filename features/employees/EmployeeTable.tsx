"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmployeeActionsMenu } from "@/features/employees/EmployeeActionsMenu";
import {
  bulkActivateEmployeesAction,
  bulkAssignShiftAction,
  bulkDeleteEmployeesAction,
  bulkSetStatusAction,
} from "@/actions/employee.actions";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const STATUS_CLASS: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-700 border-emerald-200",
  INACTIVE: "bg-gray-100 text-gray-700 border-gray-200",
  RESIGNED: "bg-slate-200 text-slate-700 border-slate-300",
  ON_LEAVE: "bg-amber-100 text-amber-700 border-amber-200",
  PROBATION: "bg-blue-100 text-blue-700 border-blue-200",
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function displayStatus(item: EmployeeRow): { label: string; className: string } {
  if (item.status === "ACTIVE" && item.isOnLeaveToday) return { label: "On Leave", className: STATUS_CLASS.ON_LEAVE };
  if (item.status === "ACTIVE" && item.isOnProbation) return { label: "Probation", className: STATUS_CLASS.PROBATION };
  return { label: item.status, className: STATUS_CLASS[item.status] ?? STATUS_CLASS.INACTIVE };
}

export interface EmployeeRow {
  id: string;
  userId: string;
  fullName: string;
  phone: string | null;
  joiningDate: string | Date;
  salary: unknown;
  status: "ACTIVE" | "INACTIVE" | "RESIGNED";
  profileImageUrl: string | null;
  isOnLeaveToday: boolean;
  isOnProbation: boolean;
  user: { employeeCode: string; email: string };
  department: { name: string } | null;
  designation: { name: string } | null;
  shift: { name: string } | null;
}

export function EmployeeTable({
  items,
  canViewSalary,
  shifts,
}: {
  items: EmployeeRow[];
  canViewSalary: boolean;
  shifts: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [shiftDialogOpen, setShiftDialogOpen] = useState(false);
  const [bulkShiftId, setBulkShiftId] = useState("");

  const allSelected = items.length > 0 && selected.size === items.length;

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(items.map((e) => e.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  function runBulk(promise: Promise<{ success: boolean; error?: string; data?: { succeeded: number; failed: number } }>, verb: string) {
    startTransition(async () => {
      const result = await promise;
      if (!result.success) {
        toast.error(result.error ?? `Bulk ${verb} failed`);
        return;
      }
      toast.success(`${verb}: ${result.data?.succeeded ?? 0} succeeded, ${result.data?.failed ?? 0} failed`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-primary/30 bg-primary/5 px-4 py-2.5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <Button type="button" size="sm" variant="outline" onClick={() => setShiftDialogOpen(true)} disabled={isPending}>
            Assign Shift
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runBulk(bulkActivateEmployeesAction({ employeeIds: selectedIds }), "Activate")}
          >
            Activate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => runBulk(bulkSetStatusAction({ employeeIds: selectedIds }, "INACTIVE"), "Deactivate")}
          >
            Deactivate
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={isPending}
            onClick={() => {
              if (!confirm(`Delete ${selected.size} employee(s)?`)) return;
              runBulk(bulkDeleteEmployeesAction({ employeeIds: selectedIds }), "Delete");
            }}
          >
            Delete
          </Button>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-8">
              <input type="checkbox" checked={allSelected} onChange={toggleAll} className="size-4 rounded border-input" />
            </TableHead>
            <TableHead>Employee</TableHead>
            <TableHead>Employee ID</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Department</TableHead>
            <TableHead>Designation</TableHead>
            <TableHead>Shift</TableHead>
            <TableHead>Joining Date</TableHead>
            {canViewSalary && <TableHead>Salary</TableHead>}
            <TableHead>Status</TableHead>
            <TableHead className="w-8" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((e) => {
            const status = displayStatus(e);
            return (
              <TableRow key={e.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(e.id)}
                    onChange={() => toggleOne(e.id)}
                    className="size-4 rounded border-input"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {e.profileImageUrl ? (
                      <Image
                        src={`/api/employees/photo/${e.profileImageUrl}`}
                        alt=""
                        width={28}
                        height={28}
                        unoptimized
                        className="size-7 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-[10px] font-semibold text-white">
                        {initials(e.fullName)}
                      </div>
                    )}
                    <Link href={`/admin/employees/${e.id}`} className="font-medium hover:underline">
                      {e.fullName}
                    </Link>
                  </div>
                </TableCell>
                <TableCell>{e.user.employeeCode}</TableCell>
                <TableCell>{e.user.email}</TableCell>
                <TableCell>{e.phone ?? "—"}</TableCell>
                <TableCell>{e.department?.name ?? "—"}</TableCell>
                <TableCell>{e.designation?.name ?? "—"}</TableCell>
                <TableCell>{e.shift?.name ?? "—"}</TableCell>
                <TableCell>{new Date(e.joiningDate).toLocaleDateString("en-US")}</TableCell>
                {canViewSalary && <TableCell>{e.salary != null ? String(e.salary) : "—"}</TableCell>}
                <TableCell>
                  <Badge variant="outline" className={status.className}>
                    {status.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <EmployeeActionsMenu employeeId={e.id} status={e.status} />
                </TableCell>
              </TableRow>
            );
          })}
          {items.length === 0 && (
            <TableRow>
              <TableCell colSpan={canViewSalary ? 12 : 11} className="text-center text-muted-foreground">
                No employees match these filters.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Dialog open={shiftDialogOpen} onOpenChange={setShiftDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Shift to {selected.size} employee(s)</DialogTitle>
          </DialogHeader>
          <select value={bulkShiftId} onChange={(e) => setBulkShiftId(e.target.value)} className={selectClass}>
            <option value="">Select a shift</option>
            {shifts.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <DialogFooter>
            <Button
              type="button"
              disabled={!bulkShiftId || isPending}
              onClick={() => {
                setShiftDialogOpen(false);
                runBulk(bulkAssignShiftAction({ employeeIds: selectedIds, shiftId: bulkShiftId }), "Assign Shift");
              }}
            >
              Assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
