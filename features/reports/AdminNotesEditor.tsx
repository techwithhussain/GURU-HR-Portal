"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { updateAttendanceNotesAction } from "@/actions/attendance.actions";

const textareaClass =
  "min-h-24 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AdminNotesEditor({ attendanceId, initialNotes }: { attendanceId: string; initialNotes: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateAttendanceNotesAction(attendanceId, { notes });
      if (!result.success) {
        toast.error(result.error ?? "Failed to save notes");
        return;
      }
      toast.success("Notes saved");
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <textarea
        className={textareaClass}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Add an admin note for this attendance day…"
        disabled={isPending}
      />
      <Button type="button" size="sm" disabled={isPending} onClick={handleSave}>
        Save Notes
      </Button>
    </div>
  );
}
