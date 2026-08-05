"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminForceCheckOutAction } from "@/actions/attendance.actions";

export function ForceLogoutButton({
  employeeId,
  employeeName,
  onDone,
}: {
  employeeId: string;
  employeeName: string;
  onDone?: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Log out ${employeeName} now? This will end their session and may mark today as a Half Day.`)) {
      return;
    }
    const reason = prompt("Reason for force logout (optional):") ?? undefined;

    startTransition(async () => {
      const result = await adminForceCheckOutAction(employeeId, reason);
      if (!result.success) {
        toast.error(result.error ?? "Failed to log out employee.");
        return;
      }
      toast.success(`${employeeName} logged out.`);
      onDone?.();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="shrink-0 gap-1.5 px-2 text-destructive hover:bg-destructive/10 md:px-3"
      disabled={isPending}
      onClick={handleClick}
      title="Force Logout"
    >
      <LogOut className="size-3.5" />
      <span className="hidden md:inline">{isPending ? "Logging out..." : "Force Logout"}</span>
    </Button>
  );
}
