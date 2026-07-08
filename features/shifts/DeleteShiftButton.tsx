"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteShiftAction } from "@/actions/shift.actions";

export function DeleteShiftButton({ shiftId, shiftName }: { shiftId: string; shiftName: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!confirm(`Delete shift "${shiftName}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteShiftAction(shiftId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete shift");
        return;
      }
      toast.success("Shift deleted");
      router.refresh();
    });
  }

  return (
    <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleClick}>
      Delete
    </Button>
  );
}
