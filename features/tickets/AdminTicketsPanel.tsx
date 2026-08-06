"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Clock, CheckCircle2, XCircle, Loader2, MessageSquare, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { replyTicketAction } from "@/actions/ticket.actions";
import type { TicketItem, TicketPriority, TicketStatus } from "@/types/ticket";

const STATUS_CONFIG: Record<TicketStatus, { label: string; color: string; icon: typeof Clock }> = {
  OPEN: { label: "Open", color: "bg-blue-100 text-blue-700", icon: Clock },
  IN_PROGRESS: { label: "In Progress", color: "bg-amber-100 text-amber-700", icon: Loader2 },
  RESOLVED: { label: "Resolved", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-600", icon: XCircle },
};

const PRIORITY_CONFIG: Record<TicketPriority, { label: string; color: string }> = {
  LOW: { label: "Low", color: "bg-gray-100 text-gray-600" },
  MEDIUM: { label: "Medium", color: "bg-amber-100 text-amber-700" },
  HIGH: { label: "High", color: "bg-red-100 text-red-700" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return "Just now";
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function TicketCard({ ticket }: { ticket: TicketItem }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [expanded, setExpanded] = useState(ticket.status === "OPEN");
  const [reply, setReply] = useState(ticket.adminReply ?? "");
  const [status, setStatus] = useState<TicketStatus>(ticket.status);
  const sc = STATUS_CONFIG[ticket.status];
  const pc = PRIORITY_CONFIG[ticket.priority];

  function handleReply() {
    if (!reply.trim()) return;
    startTransition(async () => {
      await replyTicketAction(ticket.id, reply.trim(), status);
      router.refresh();
    });
  }

  return (
    <Card className={`rounded-2xl border-0 shadow-soft ring-1 ${ticket.status === "OPEN" ? "ring-brand-blue/20" : "ring-black/[0.03]"}`}>
      <CardContent className="py-4">
        {/* Header row */}
        <div className="flex cursor-pointer items-start gap-3" onClick={() => setExpanded(!expanded)}>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted">
            <sc.icon className={`size-4 ${sc.color.split(" ")[1]}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm">{ticket.title}</p>
              <Badge className={`text-[10px] ${sc.color} border-0`}>{sc.label}</Badge>
              <Badge className={`text-[10px] ${pc.color} border-0`}>{ticket.priority}</Badge>
              {ticket.priority === "HIGH" && (
                <Badge className="text-[10px] bg-red-500 text-white border-0 animate-pulse">URGENT</Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {ticket.employeeName} ({ticket.employeeCode}) · {ticket.departmentName ?? "—"} · {ticket.category}
            </p>
            <p className="text-[10px] text-muted-foreground/60">{timeAgo(ticket.createdAt)}</p>
          </div>
          {expanded ? <ChevronUp className="size-4 shrink-0 text-muted-foreground" /> : <ChevronDown className="size-4 shrink-0 text-muted-foreground" />}
        </div>

        {/* Expanded details */}
        {expanded && (
          <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
            {/* Description */}
            <div>
              <p className="mb-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Issue Description</p>
              <p className="text-sm text-foreground">{ticket.description}</p>
            </div>

            {/* Existing admin reply */}
            {ticket.adminReply && (
              <div className="rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200/60">
                <div className="mb-1 flex items-center gap-1.5">
                  <MessageSquare className="size-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-700">Your Previous Reply</span>
                </div>
                <p className="text-sm text-emerald-800">{ticket.adminReply}</p>
              </div>
            )}

            {/* Reply form */}
            {ticket.status !== "CLOSED" && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {ticket.adminReply ? "Update Reply" : "Reply to Employee"}
                </p>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)}
                  rows={3} placeholder="Type your reply here..."
                  className="w-full resize-none rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30" />
                <div className="flex flex-wrap items-center gap-3">
                  <select value={status} onChange={(e) => setStatus(e.target.value as TicketStatus)}
                    className="rounded-xl border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30">
                    <option value="OPEN">Open</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Close Ticket</option>
                  </select>
                  <Button size="sm" onClick={handleReply} disabled={isPending || !reply.trim()} className="gap-1.5">
                    <MessageSquare className="size-3.5" />
                    {isPending ? "Sending..." : "Send Reply"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function AdminTicketsPanel({ initial }: { initial: TicketItem[] }) {
  const [filter, setFilter] = useState<TicketStatus | "ALL">("ALL");
  const openCount = initial.filter((t) => t.status === "OPEN").length;
  const filtered = filter === "ALL" ? initial : initial.filter((t) => t.status === filter);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {openCount > 0 ? `${openCount} open ticket${openCount !== 1 ? "s" : ""} need attention` : "All tickets resolved!"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"] as const).map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${filter === s ? "bg-brand-blue text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              {s === "ALL" ? "All" : STATUS_CONFIG[s].label}
              {s !== "ALL" && <span className="ml-1">({initial.filter((t) => t.status === s).length})</span>}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
          <CardContent className="py-16 text-center">
            <Ticket className="mx-auto size-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No tickets in this category.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => <TicketCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}
