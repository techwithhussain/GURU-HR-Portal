"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarSync,
  Clock,
  Send,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  History,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { submitShiftChangeRequestAction } from "@/actions/shiftRequest.actions";

export interface ShiftInfo {
  id: string;
  name: string;
  startMinutesOfDay: number;
  endMinutesOfDay: number;
}

export interface CurrentShiftInfo {
  id?: string;
  name: string;
  startMinutesOfDay: number;
  endMinutesOfDay: number;
}

export interface ShiftRequestHistoryItem {
  id: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date | string;
  currentShift: { name: string };
  requestedShift: { name: string };
}

function formatMinutes(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

export function EmployeeShiftRequestModal({
  currentShift,
  availableShifts,
  history = [],
}: {
  currentShift: CurrentShiftInfo | null;
  availableShifts: ShiftInfo[];
  history?: ShiftRequestHistoryItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetShiftId, setTargetShiftId] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectableShifts = availableShifts.filter((s) => s.id !== currentShift?.id);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!targetShiftId) {
      toast.error("Please select a new shift");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason/note for the shift change request");
      return;
    }

    startTransition(async () => {
      const res = await submitShiftChangeRequestAction({
        requestedShiftId: targetShiftId,
        reason: reason.trim(),
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to submit request");
        return;
      }

      toast.success("Shift change request submitted successfully to Admin!");
      setReason("");
      setTargetShiftId("");
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1.5 rounded-xl border-primary/20 bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-xs"
        >
          <CalendarSync className="size-3.5" />
          Request Shift Change
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md w-full p-5 sm:p-6 overflow-hidden box-border">
        <DialogHeader className="pb-3 border-b border-border/50 pr-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white shadow-xs">
              <CalendarSync className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold truncate">Request Shift Change</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">
                Submit shift switch request to Admin for approval
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 w-full box-border min-w-0">
          {/* Current Shift Banner */}
          <div className="rounded-xl border border-border/80 bg-muted/30 p-3 flex flex-wrap items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Current Shift
              </p>
              <p className="text-xs font-bold text-foreground truncate">
                {currentShift?.name ?? "No Shift Assigned"}
              </p>
            </div>
            {currentShift && (
              <Badge variant="outline" className="text-[11px] py-0.5 px-2 font-medium border-primary/30 text-primary shrink-0">
                <Clock className="size-3 mr-1 shrink-0" />
                {formatMinutes(currentShift.startMinutesOfDay)} – {formatMinutes(currentShift.endMinutesOfDay)}
              </Badge>
            )}
          </div>

          {/* New Shift Selection */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-foreground block">
              Select Desired Shift <span className="text-destructive">*</span>
            </label>
            <select
              value={targetShiftId}
              onChange={(e) => setTargetShiftId(e.target.value)}
              required
              className="w-full h-9.5 rounded-xl border border-input bg-background px-3 text-xs font-medium shadow-2xs outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 cursor-pointer box-border truncate"
            >
              <option value="" disabled>
                -- Choose New Shift --
              </option>
              {selectableShifts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({formatMinutes(s.startMinutesOfDay)} – {formatMinutes(s.endMinutesOfDay)})
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Reason / Note */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-semibold text-foreground">
                Reason / Discussion Note <span className="text-destructive font-bold">* (Required)</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-medium">Mandatory</span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. As discussed with HR, switching to evening shift / exam timing conflict..."
              required
              className="w-full max-w-full rounded-xl border border-input bg-background p-2.5 text-xs shadow-2xs outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 placeholder:text-muted-foreground resize-none box-border"
            />
            <p className="text-[10px] text-muted-foreground">
              Please mention reason or prior HR discussion.
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
              className="text-xs h-8.5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!targetShiftId || !reason.trim() || isPending}
              className="bg-gradient-to-r from-brand-orange to-amber-600 hover:opacity-95 text-white font-semibold text-xs px-3.5 h-8.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-3.5 mr-1.5" />
                  Submit Shift Request
                </>
              )}
            </Button>
          </div>
        </form>

        {/* History of Requests */}
        {history.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <History className="size-3" />
              <span>Previous Shift Requests</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 min-w-0">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-2 text-xs flex items-center justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[11px] truncate">
                      {h.currentShift.name} ➔ <span className="text-brand-orange">{h.requestedShift.name}</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">&ldquo;{h.reason}&rdquo;</p>
                  </div>
                  <div className="shrink-0">
                    {h.status === "PENDING" && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-amber-50 text-amber-700 border-amber-200">
                        <AlertCircle className="size-2.5 mr-0.5" /> Pending
                      </Badge>
                    )}
                    {h.status === "APPROVED" && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-emerald-50 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="size-2.5 mr-0.5" /> Approved
                      </Badge>
                    )}
                    {h.status === "REJECTED" && (
                      <Badge variant="outline" className="text-[9px] py-0 px-1.5 bg-rose-50 text-rose-700 border-rose-200">
                        <XCircle className="size-2.5 mr-0.5" /> Rejected
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
