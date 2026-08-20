"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ClockCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { reviewAttendanceCorrectionAction } from "@/actions/attendanceCorrection.actions";

export interface AdminAttendanceCorrectionItem {
  id: string;
  attendanceDate: Date | string;
  requestedCheckIn: Date | string | null;
  requestedCheckOut: Date | string | null;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  createdAt: Date | string;
  employee: {
    id: string;
    fullName: string;
    shift: { name: string; startMinutesOfDay: number; endMinutesOfDay: number } | null;
    user: { employeeCode: string; email: string };
    department: { name: string } | null;
  };
  reviewedBy: { id: string; employeeCode: string; email: string } | null;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function AdminAttendanceCorrectionTab({
  initialRequests,
}: {
  initialRequests: AdminAttendanceCorrectionItem[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState<AdminAttendanceCorrectionItem[]>(initialRequests);
  const [filter, setFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [isPending, startTransition] = useTransition();
  const [activeActionId, setActiveActionId] = useState<string | null>(null);

  const filteredRequests = requests.filter((r) => {
    if (filter === "ALL") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter((r) => r.status === "PENDING").length;

  function handleReview(requestId: string, status: "APPROVED" | "REJECTED", note?: string) {
    setActiveActionId(requestId);

    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status, adminNote: note ?? null }
          : r
      )
    );

    startTransition(async () => {
      const res = await reviewAttendanceCorrectionAction(requestId, {
        status,
        adminNote: note,
      });
      setActiveActionId(null);

      if (!res.success) {
        toast.error(res.error ?? "Failed to review request");
        setRequests(initialRequests);
        return;
      }

      if (status === "APPROVED") {
        toast.success("Attendance Correction APPROVED! Attendance row updated automatically.", {
          icon: <CheckCircle2 className="size-4 text-emerald-500" />,
        });
      } else {
        toast.info("Attendance Correction REJECTED.");
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ClockCheck className="size-5 text-brand-blue" />
          <h2 className="text-lg font-semibold tracking-tight">Attendance Correction Requests</h2>
          {pendingCount > 0 && (
            <Badge className="bg-brand-blue text-white text-xs font-bold px-2 py-0.5">
              {pendingCount} Pending
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1.5 rounded-xl bg-muted/60 p-1">
          {(
            [
              { key: "PENDING", label: `Pending (${pendingCount})` },
              { key: "APPROVED", label: "Approved" },
              { key: "REJECTED", label: "Rejected" },
              { key: "ALL", label: "All" },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setFilter(t.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === t.key
                  ? "bg-white text-foreground shadow-xs dark:bg-card"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.map((req) => {
          const isActing = activeActionId === req.id;
          const dateStr = new Date(req.attendanceDate).toLocaleDateString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            year: "numeric",
          });

          return (
            <Card
              key={req.id}
              className={`rounded-2xl border transition-all ${
                req.status === "PENDING"
                  ? "border-blue-200/80 bg-blue-50/20 shadow-xs ring-1 ring-blue-400/20 dark:border-blue-900/40"
                  : "border-border/60 bg-card shadow-2xs"
              }`}
            >
              <CardContent className="p-4 sm:p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  {/* Left: Employee Info */}
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-blue to-teal-500 text-xs font-bold text-white shadow-xs">
                      {initials(req.employee.fullName)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">
                          {req.employee.fullName}
                        </p>
                        <span className="text-xs text-muted-foreground font-mono">
                          ({req.employee.user.employeeCode})
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {req.employee.department?.name ?? "General"} • {req.employee.shift?.name ?? "No Shift"}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-brand-blue">
                        <Calendar className="size-3" />
                        Target Date: {dateStr}
                      </p>
                    </div>
                  </div>

                  {/* Middle: Requested Times & Reason */}
                  <div className="flex-1 lg:px-6 space-y-2">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <div className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1">
                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                          Requested In Time
                        </span>
                        <span className="font-medium text-foreground">
                          {req.requestedCheckIn
                            ? new Date(req.requestedCheckIn).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>

                      <div className="rounded-lg border border-border/80 bg-background/80 px-2.5 py-1">
                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">
                          Requested Out Time
                        </span>
                        <span className="font-medium text-foreground">
                          {req.requestedCheckOut
                            ? new Date(req.requestedCheckOut).toLocaleTimeString("en-US", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </span>
                      </div>
                    </div>

                    {/* Reason box */}
                    <div className="rounded-xl border border-border/60 bg-muted/30 p-2.5 text-xs min-w-0 max-w-full overflow-hidden">
                      <div className="flex items-center gap-1.5 font-semibold text-foreground text-[11px] mb-0.5">
                        <MessageSquare className="size-3 text-brand-blue shrink-0" />
                        <span>Reason / Explanation:</span>
                      </div>
                      <p className="text-muted-foreground italic font-sans leading-relaxed break-words">
                        &ldquo;{req.reason}&rdquo;
                      </p>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="shrink-0 flex items-center gap-2 self-end lg:self-center">
                    {req.status === "PENDING" ? (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            const note = prompt("Optional rejection note:") ?? undefined;
                            handleReview(req.id, "REJECTED", note);
                          }}
                          className="h-8.5 text-xs text-destructive hover:bg-destructive/10 border-destructive/30"
                        >
                          <XCircle className="size-3.5 mr-1" />
                          Reject
                        </Button>

                        <Button
                          type="button"
                          size="sm"
                          disabled={isPending}
                          onClick={() => handleReview(req.id, "APPROVED")}
                          className="h-8.5 text-xs bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-semibold shadow-xs"
                        >
                          {isActing ? (
                            <>
                              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                              Updating...
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="size-3.5 mr-1.5" />
                              1-Click Approve
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <div className="text-right">
                        {req.status === "APPROVED" && (
                          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs px-2.5 py-1">
                            <CheckCircle2 className="size-3 mr-1" /> Approved
                          </Badge>
                        )}
                        {req.status === "REJECTED" && (
                          <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-xs px-2.5 py-1">
                            <XCircle className="size-3 mr-1" /> Rejected
                          </Badge>
                        )}
                        {req.adminNote && (
                          <p className="text-[10px] text-muted-foreground mt-1">Note: {req.adminNote}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filteredRequests.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border/80 p-10 text-center">
            <ClockCheck className="size-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm font-semibold text-foreground">No {filter.toLowerCase()} attendance correction requests</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              When employees report a missed punch or correction, it will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
