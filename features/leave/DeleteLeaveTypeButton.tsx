"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteLeaveTypeAction } from "@/actions/leaveType.actions";

export function DeleteLeaveTypeButton({ leaveTypeId, name }: { leaveTypeId: string; name: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete leave type "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteLeaveTypeAction(leaveTypeId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete leave type");
        return;
      }
      toast.success("Leave type deleted");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      Delete
    </Button>
  );
}
