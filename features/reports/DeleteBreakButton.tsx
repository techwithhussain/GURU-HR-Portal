"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBreakAction } from "@/actions/attendance.actions";

interface Props {
  breakId: string;
  attendanceId: string;
}

export function DeleteBreakButton({ breakId, attendanceId }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this break?")) return;

    startTransition(async () => {
      const result = await deleteBreakAction(breakId, attendanceId);
      if (!result.success) {
        toast.error(result.error ?? "Failed to delete break.");
        return;
      }
      toast.success("Break deleted successfully!");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8 text-destructive hover:bg-destructive/10"
      disabled={isPending}
      onClick={handleDelete}
      title="Delete Break"
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
