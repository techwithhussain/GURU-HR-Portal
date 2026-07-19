"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { toggleWeeklyOffAction } from "@/actions/attendance.actions";
import { toast } from "sonner";
import { CalendarOff, CalendarCheck } from "lucide-react";

interface Props {
  employeeId: string;
  dateStr: string;
  isWeeklyOff: boolean;
}

export function ToggleWeeklyOffButton({ employeeId, dateStr, isWeeklyOff }: Props) {
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    startTransition(async () => {
      const res = await toggleWeeklyOffAction(employeeId, dateStr);
      if (res.success) {
        toast.success(
          isWeeklyOff
            ? "Weekly off override removed."
            : "Marked as weekly off successfully!",
        );
      } else {
        toast.error(res.error ?? "Failed to toggle weekly off status.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={handleToggle}
      className={`h-7 px-2 text-xs gap-1 ${
        isWeeklyOff
          ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
          : "text-muted-foreground hover:text-foreground"
      }`}
      title={isWeeklyOff ? "Remove Weekly Off Override" : "Mark as Weekly Off"}
    >
      {isWeeklyOff ? (
        <>
          <CalendarCheck className="size-3.5" />
          <span>Remove Off</span>
        </>
      ) : (
        <>
          <CalendarOff className="size-3.5" />
          <span>Mark Off</span>
        </>
      )}
    </Button>
  );
}
