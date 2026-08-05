import { Cake } from "lucide-react";
import type { UpcomingBirthday } from "@/services/birthdayService";

export function UpcomingBirthdaysCard({ birthdays }: { birthdays: UpcomingBirthday[] }) {
  if (birthdays.length === 0) return null;

  return (
    <div className="rounded-2xl border border-pink-500/20 bg-gradient-to-br from-pink-500/5 to-rose-500/5 p-5">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex size-8 items-center justify-center rounded-xl bg-pink-500/15 text-pink-400">
          <Cake className="size-4" />
        </span>
        <h2 className="text-sm font-semibold text-foreground">Upcoming Birthdays</h2>
        <span className="ml-auto rounded-full bg-pink-500/15 px-2 py-0.5 text-[11px] font-medium text-pink-400">
          {birthdays.length} upcoming
        </span>
      </div>

      <div className="space-y-2.5">
        {birthdays.map((person) => (
          <div
            key={person.id}
            className="flex items-center gap-3 rounded-xl border border-white/5 bg-background/40 px-3 py-2.5"
          >
            {/* Initials avatar */}
            <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-rose-500 text-xs font-bold text-white shadow-sm">
              {person.fullName
                .trim()
                .split(/\s+/)
                .slice(0, 2)
                .map((p) => p[0]?.toUpperCase() ?? "")
                .join("")}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{person.fullName}</p>
              {person.departmentName && (
                <p className="truncate text-[11px] text-muted-foreground">{person.departmentName}</p>
              )}
            </div>

            {/* Day badge */}
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                person.daysUntil === 0
                  ? "bg-pink-500/20 text-pink-400"
                  : "bg-amber-500/15 text-amber-400"
              }`}
            >
              {person.daysUntil === 0 ? "🎂 Today!" : "🔔 Tomorrow"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
