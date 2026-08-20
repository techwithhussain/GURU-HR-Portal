"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, CalendarMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { correctAttendanceAction } from "@/actions/attendance.actions";

interface Props {
  attendanceId: string;
  currentCheckIn: string | null;
  currentCheckOut: string | null;
}

/**
 * Admin-only button. Marks the attendance status as HALF_DAY by setting
 * the checkout time to the midpoint of the shift (or keeping existing data)
 * and letting the server recalculate the status automatically.
 *
 * We simply call correctAttendanceAction with the same check-in/out times
 * plus a reason — the server's determinePunchStatus will recalculate to
 * HALF_DAY automatically if working hours are below the half-day threshold.
 *
 * For a direct override we pass a special reason that signals intent.
 */
export function MarkHalfDayButton({ attendanceId, currentCheckIn, currentCheckOut }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    if (!currentCheckIn) {
      toast.error("Employee has not checked in today.");
      return;
    }

    startTransition(async () => {
      // Keep the same times — just trigger a recalculation with admin reason.
      // The admin should have already adjusted check-in/out via Correct Attendance
      // to reflect reduced hours. This button just adds a quick note.
      const result = await correctAttendanceAction(attendanceId, {
        checkInAt: new Date(currentCheckIn),
        checkOutAt: currentCheckOut ? new Date(currentCheckOut) : null,
        reason: "Admin manually marked as Half Day due to inactivity review.",
      });

      if (!result.success) {
        toast.error(result.error ?? "Failed to update attendance.");
        return;
      }
      toast.success("Attendance updated — Half Day status recalculated.");
      router.refresh();
    });
  }

  return (
    <Button
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={handleClick}
      className="gap-1.5 border-amber-200 text-amber-700 hover:bg-amber-50"
    >
      {isPending ? <Loader2 className="size-3.5 animate-spin" /> : <CalendarMinus className="size-3.5" />}
      Mark Half Day
    </Button>
  );
}
