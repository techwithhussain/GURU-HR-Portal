"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cancelLeaveAction } from "@/actions/leave.actions";

export function CancelLeaveButton({ leaveId }: { leaveId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm("Cancel this leave request?")) return;

    startTransition(async () => {
      const result = await cancelLeaveAction(leaveId, {});
      if (!result.success) {
        toast.error(result.error ?? "Failed to cancel leave request");
        return;
      }
      toast.success("Leave request cancelled");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleClick}>
      Cancel
    </Button>
  );
}
