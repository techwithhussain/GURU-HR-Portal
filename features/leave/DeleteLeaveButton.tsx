"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteLeaveAction } from "@/actions/leave.actions";

export function DeleteLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Permanently delete this leave request? This cannot be undone.")) return;

    startTransition(async () => {
      const result = await deleteLeaveAction(leaveId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete leave request");
        return;
      }
      toast.success("Leave request deleted");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      Delete
    </Button>
  );
}
