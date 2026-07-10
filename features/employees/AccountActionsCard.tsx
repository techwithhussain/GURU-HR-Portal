"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResetPasswordButton } from "@/features/employees/ResetPasswordButton";
import { LockAccountButton } from "@/features/employees/LockAccountButton";
import {
  activateEmployeeAction,
  deactivateEmployeeAction,
  resignEmployeeAction,
} from "@/actions/employee.actions";

export function AccountActionsCard({
  employeeId,
  userId,
  status,
  isLocked,
}: {
  employeeId: string;
  userId: string;
  status: "ACTIVE" | "INACTIVE" | "RESIGNED";
  isLocked: boolean;
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
    <Card id="account">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Account</CardTitle>
        <Badge variant={status === "ACTIVE" ? "default" : "secondary"}>{status}</Badge>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <ResetPasswordButton userId={userId} />
        <LockAccountButton userId={userId} isLocked={isLocked} />
        {status !== "ACTIVE" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => activateEmployeeAction(employeeId), "Employee activated")}
          >
            Activate Account
          </Button>
        )}
        {status === "ACTIVE" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => deactivateEmployeeAction(employeeId), "Employee deactivated")}
          >
            Deactivate Account
          </Button>
        )}
        {status !== "RESIGNED" && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => run(() => resignEmployeeAction(employeeId), "Marked as resigned")}
          >
            Mark Resigned
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
