"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClockCheck,
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
import { Input } from "@/components/ui/input";
import { submitAttendanceCorrectionAction } from "@/actions/attendanceCorrection.actions";

export interface AttendanceCorrectionHistoryItem {
  id: string;
  attendanceDate: Date | string;
  requestedCheckIn: Date | string | null;
  requestedCheckOut: Date | string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date | string;
}

export function EmployeeAttendanceCorrectionModal({
  history = [],
}: {
  history?: AttendanceCorrectionHistoryItem[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [attendanceDate, setAttendanceDate] = useState("");
  const [checkInTime, setCheckInTime] = useState("");
  const [checkOutTime, setCheckOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attendanceDate) {
      toast.error("Please select a date");
      return;
    }
    if (!reason.trim() || reason.trim().length < 3) {
      toast.error("Please enter a valid reason/note");
      return;
    }
    if (!checkInTime && !checkOutTime) {
      toast.error("Please provide at least a Check-In or Check-Out time");
      return;
    }

    const checkInIso = checkInTime ? `${attendanceDate}T${checkInTime}:00` : undefined;
    const checkOutIso = checkOutTime ? `${attendanceDate}T${checkOutTime}:00` : undefined;

    startTransition(async () => {
      const res = await submitAttendanceCorrectionAction({
        attendanceDate,
        requestedCheckIn: checkInIso,
        requestedCheckOut: checkOutIso,
        reason: reason.trim(),
      });

      if (!res.success) {
        toast.error(res.error ?? "Failed to submit attendance correction");
        return;
      }

      toast.success("Attendance correction request submitted to Admin!");
      setReason("");
      setAttendanceDate("");
      setCheckInTime("");
      setCheckOutTime("");
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
          <ClockCheck className="size-3.5" />
          Fix Attendance / Missed Punch
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md w-full p-5 sm:p-6 overflow-hidden box-border">
        <DialogHeader className="pb-3 border-b border-border/50 pr-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-blue to-teal-500 text-white shadow-xs">
              <ClockCheck className="size-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-bold truncate">Request Attendance Correction</DialogTitle>
              <p className="text-xs text-muted-foreground truncate">
                Request punch-in/out fix for missed punch or network issue
              </p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1 w-full box-border min-w-0">
          {/* Date Picker */}
          <div className="space-y-1.5 min-w-0">
            <label className="text-xs font-semibold text-foreground block">
              Date of Missed Attendance <span className="text-destructive">*</span>
            </label>
            <Input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              required
              max={new Date().toISOString().split("T")[0]}
              className="h-9.5 text-xs rounded-xl w-full box-border"
            />
          </div>

          {/* Time Inputs */}
          <div className="grid grid-cols-2 gap-3 min-w-0">
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-foreground block truncate">Check-In Time</label>
              <Input
                type="time"
                value={checkInTime}
                onChange={(e) => setCheckInTime(e.target.value)}
                className="h-9.5 text-xs rounded-xl w-full box-border"
              />
            </div>
            <div className="space-y-1.5 min-w-0">
              <label className="text-xs font-semibold text-foreground block truncate">Check-Out Time</label>
              <Input
                type="time"
                value={checkOutTime}
                onChange={(e) => setCheckOutTime(e.target.value)}
                className="h-9.5 text-xs rounded-xl w-full box-border"
              />
            </div>
          </div>

          {/* Mandatory Reason */}
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-semibold text-foreground">
                Reason for Correction <span className="text-destructive font-bold">* (Required)</span>
              </label>
              <span className="text-[10px] text-muted-foreground font-medium">Mandatory</span>
            </div>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Office WiFi down / Forgot to punch out while leaving..."
              required
              className="w-full max-w-full rounded-xl border border-input bg-background p-2.5 text-xs shadow-2xs outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue/30 placeholder:text-muted-foreground resize-none box-border"
            />
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
              disabled={!attendanceDate || !reason.trim() || (!checkInTime && !checkOutTime) || isPending}
              className="bg-gradient-to-r from-brand-blue to-teal-600 hover:opacity-95 text-white font-semibold text-xs px-3.5 h-8.5"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="size-3.5 mr-1.5" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-border/50 space-y-1.5 min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
              <History className="size-3" />
              <span>Previous Correction Requests</span>
            </div>
            <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 min-w-0">
              {history.map((h) => (
                <div
                  key={h.id}
                  className="rounded-xl border border-border/60 bg-muted/20 p-2 text-xs flex items-center justify-between gap-2 min-w-0"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-[11px] truncate">
                      Date: {new Date(h.attendanceDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
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
