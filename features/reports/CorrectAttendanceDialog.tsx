"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { correctAttendanceAction } from "@/actions/attendance.actions";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const labelClass = "block text-xs font-medium text-muted-foreground mb-1.5";

const overlayClass =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm";

const dialogClass =
  "relative w-full max-w-lg rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-5";

interface Props {
  attendanceId: string;
  currentCheckIn: string | null;
  currentCheckOut: string | null;
}

interface TimeState {
  date: string;   // YYYY-MM-DD
  hour: string;   // "1" – "12"
  minute: string; // "00" – "59"
  ampm: "AM" | "PM";
  enabled: boolean;
}

/** Parse an ISO UTC string into local DateParts */
function parseIso(iso: string | null): Omit<TimeState, "enabled"> {
  if (!iso) {
    return { date: "", hour: "12", minute: "00", ampm: "AM" };
  }
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const h24 = d.getHours();
  const ampm: "AM" | "PM" = h24 < 12 ? "AM" : "PM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    hour: String(h12),
    minute: pad(d.getMinutes()),
    ampm,
  };
}

/** Convert TimeState → Date (local) or undefined if not enabled */
function toDate(ts: TimeState): Date | undefined {
  if (!ts.enabled || !ts.date) return undefined;
  let h = parseInt(ts.hour, 10);
  if (ts.ampm === "PM" && h !== 12) h += 12;
  if (ts.ampm === "AM" && h === 12) h = 0;
  const [year, month, day] = ts.date.split("-").map(Number);
  return new Date(year, month - 1, day, h, parseInt(ts.minute, 10), 0);
}

function initTime(iso: string | null): TimeState {
  return { ...parseIso(iso), enabled: iso !== null };
}

// Minute options: every minute 00-59
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

function TimePicker({
  label,
  state,
  onChange,
  disabled,
  hint,
  alwaysEnabled = false,
}: {
  label: string;
  state: TimeState;
  onChange: (s: TimeState) => void;
  disabled: boolean;
  hint?: string;
  alwaysEnabled?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {!alwaysEnabled && (
          <input
            type="checkbox"
            id={`enable-${label}`}
            checked={state.enabled}
            onChange={(e) => onChange({ ...state, enabled: e.target.checked })}
            disabled={disabled}
            className="size-4 rounded accent-orange-500"
          />
        )}
        <label
          htmlFor={alwaysEnabled ? undefined : `enable-${label}`}
          className="text-xs font-medium text-muted-foreground cursor-pointer"
        >
          {label}
        </label>
      </div>

      {(alwaysEnabled || state.enabled) && (
        <div className="space-y-2">
          {/* Date */}
          <input
            type="date"
            className={inputClass}
            value={state.date}
            onChange={(e) => onChange({ ...state, date: e.target.value })}
            disabled={disabled}
          />
          {/* Time — hour : minute  AM/PM */}
          <div className="flex items-center gap-2">
            <select
              className={selectClass + " flex-1"}
              value={state.hour}
              onChange={(e) => onChange({ ...state, hour: e.target.value })}
              disabled={disabled}
            >
              {HOURS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="text-muted-foreground font-semibold">:</span>
            <select
              className={selectClass + " flex-1"}
              value={state.minute}
              onChange={(e) => onChange({ ...state, minute: e.target.value })}
              disabled={disabled}
            >
              {MINUTES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {/* AM / PM toggle */}
            <div className="flex rounded-md border border-input overflow-hidden text-sm">
              {(["AM", "PM"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onChange({ ...state, ampm: p })}
                  disabled={disabled}
                  className={`px-3 h-9 font-medium transition-colors ${
                    state.ampm === p
                      ? "bg-orange-500 text-white"
                      : "bg-transparent text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      {hint && <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>}
    </div>
  );
}

export function CorrectAttendanceDialog({ attendanceId, currentCheckIn, currentCheckOut }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const [checkIn, setCheckIn] = useState<TimeState>(initTime(currentCheckIn));
  const [checkOut, setCheckOut] = useState<TimeState>(initTime(currentCheckOut));
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleOpen() {
    setCheckIn(initTime(currentCheckIn));
    setCheckOut(initTime(currentCheckOut));
    setReason("");
    setError(null);
    setOpen(true);
  }

  function handleSubmit() {
    const inDate = toDate(checkIn);
    const outDate = checkOut.enabled ? toDate(checkOut) : null;

    if (!inDate) {
      setError("Login time is required.");
      return;
    }
    if (!reason.trim()) {
      setError("A reason for the correction is required.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await correctAttendanceAction(attendanceId, {
        checkInAt: inDate,
        checkOutAt: outDate,
        reason: reason.trim(),
      });
      if (!result.success) {
        setError(result.error ?? "Correction failed. Please try again.");
        return;
      }
      toast.success("Attendance corrected successfully!");
      setOpen(false);
      router.refresh();
    });
  }


  return (
    <>
      <Button size="sm" variant="outline" onClick={handleOpen} className="gap-1.5 print:hidden">
        <Pencil className="size-3.5" />
        Correct Attendance
      </Button>

      {open && (
        <div className={overlayClass} onClick={() => !isPending && setOpen(false)}>
          <div className={dialogClass} onClick={(e) => e.stopPropagation()}>
            <div>
              <h2 className="text-base font-semibold">Correct Attendance</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Update the login/logout time and provide a reason for the correction.
              </p>
            </div>

            <div className="space-y-4">
              <TimePicker
                label="Login Time (corrected)"
                state={checkIn}
                onChange={setCheckIn}
                disabled={isPending}
                alwaysEnabled={true}
              />

              <TimePicker
                label="Logout Time (corrected)"
                state={checkOut}
                onChange={setCheckOut}
                disabled={isPending}
                hint="Uncheck Logout if you only need to correct the login time (leaves session open)."
              />

              <div>
                <label className={labelClass}>Reason for Correction *</label>
                <textarea
                  className="min-h-20 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
                  placeholder="e.g. Employee logged in late due to night shift start time..."
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
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
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
