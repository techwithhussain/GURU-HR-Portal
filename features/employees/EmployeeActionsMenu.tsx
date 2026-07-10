"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  activateEmployeeAction,
  deactivateEmployeeAction,
  deleteEmployeeAction,
  resignEmployeeAction,
} from "@/actions/employee.actions";

export function EmployeeActionsMenu({
  employeeId,
  status,
}: {
  employeeId: string;
  status: "ACTIVE" | "INACTIVE" | "RESIGNED";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function run(action: () => Promise<{ success: boolean; error?: string }>, successMsg: string) {
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        toast.error(result.error ?? "Action failed");
        return;
      }
      toast.success(successMsg);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" disabled={isPending}>
          <MoreVertical className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/admin/employees/${employeeId}`}>View Profile</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/employees/${employeeId}/edit`}>Edit Employee</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/reports?type=attendance&employeeId=${employeeId}`}>Attendance History</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/leave?tab=requests&employeeId=${employeeId}`}>Leave History</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/employees/${employeeId}#salary`}>Salary Details</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/employees/${employeeId}#documents`}>Documents</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/admin/employees/${employeeId}/edit#account`}>Reset Password</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {status !== "ACTIVE" && (
          <DropdownMenuItem onSelect={() => run(() => activateEmployeeAction(employeeId), "Employee activated")}>
            Activate
          </DropdownMenuItem>
        )}
        {status === "ACTIVE" && (
          <DropdownMenuItem onSelect={() => run(() => deactivateEmployeeAction(employeeId), "Employee deactivated")}>
            Deactivate
          </DropdownMenuItem>
        )}
        {status !== "RESIGNED" && (
          <DropdownMenuItem onSelect={() => run(() => resignEmployeeAction(employeeId), "Marked as resigned")}>
            Mark Resigned
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={() => {
            if (!confirm("Delete this employee? Their record will be removed from active lists but history is preserved.")) return;
            run(() => deleteEmployeeAction(employeeId), "Employee deleted");
          }}
        >
          Delete Employee
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
