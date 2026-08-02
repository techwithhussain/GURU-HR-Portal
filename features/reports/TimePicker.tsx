"use client";

const selectClass =
  "h-9 rounded-md border border-input bg-transparent px-2 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const inputClass =
  "h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

export interface TimeState {
  date: string; // YYYY-MM-DD
  hour: string; // "1" – "12"
  minute: string; // "00" – "59"
  ampm: "AM" | "PM";
  enabled: boolean;
}

/** Parse an ISO UTC string into local DateParts */
export function parseIso(iso: string | null): Omit<TimeState, "enabled"> {
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
export function toDate(ts: TimeState): Date | undefined {
  if (!ts.enabled || !ts.date) return undefined;
  let h = parseInt(ts.hour, 10);
  if (ts.ampm === "PM" && h !== 12) h += 12;
  if (ts.ampm === "AM" && h === 12) h = 0;
  const [year, month, day] = ts.date.split("-").map(Number);
  return new Date(year, month - 1, day, h, parseInt(ts.minute, 10), 0);
}

export function initTime(iso: string | null): TimeState {
  return { ...parseIso(iso), enabled: iso !== null };
}

const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));

export function TimePicker({
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
