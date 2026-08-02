"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { correctBreakAction } from "@/actions/attendance.actions";
import { TimePicker, type TimeState, initTime, toDate } from "@/features/reports/TimePicker";

const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5";

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";

const dialogClass =
  "relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5";

interface Props {
  breakId: string;
  attendanceId: string;
  breakType: string;
  currentStartAt: string;
  currentEndAt: string | null;
}

export function CorrectBreakDialog({ breakId, attendanceId, breakType, currentStartAt, currentEndAt }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [startAt, setStartAt] = useState<TimeState>(initTime(currentStartAt));
  const [endAt, setEndAt] = useState<TimeState>(initTime(currentEndAt));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setStartAt(initTime(currentStartAt));
    setEndAt(initTime(currentEndAt));
    setReason("");
    setError(null);
    setOpen(true);
  }

  function handleSubmit() {
    const startDate = toDate(startAt);
    const endDate = endAt.enabled ? toDate(endAt) : null;

    if (!startDate) {
      setError("Break start time is required.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason for the correction is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await correctBreakAction(breakId, attendanceId, {
        startAt: startDate,
        endAt: endDate,
        reason: reason.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Correction failed. Please try again.");
        return;
      }
      toast.success("Break corrected successfully!");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="size-8 print:hidden"
        onClick={handleOpen}
        title="Correct Break"
      >
        <Pencil className="size-3.5" />
      </Button>

      {open && (
        <div className={overlayClass} onClick={() => !isPending && setOpen(false)}>
          <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-semibold">Correct Break</h2>
              <p className="text-xs text-muted-foreground mt-1">
                {breakType} break — update the start/end time and provide a reason for the correction.
              </p>
            </div>

            <div className="space-y-4">
              <TimePicker
                label="Break Start (corrected)"
                state={startAt}
                onChange={setStartAt}
                disabled={isPending}
                alwaysEnabled={true}
              />

              <TimePicker
                label="Break End (corrected)"
                state={endAt}
                onChange={setEndAt}
                disabled={isPending}
                hint="Uncheck End if this break should stay active (open)."
              />

              <div>
                <label className={labelClass}>Reason for Correction *</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                  placeholder="e.g. Employee forgot to end break on time..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  disabled={isPending}
                />
              </div>

              {error && (
                <p className="text-xs text-destructive rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2">
                  {error}
                </p>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={isPending}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>
                {isPending ? "Saving..." : "Save Correction"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
