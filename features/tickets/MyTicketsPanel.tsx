"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ticket, Plus, Clock, CheckCircle2, XCircle, Loader2, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createTicketAction } from "@/actions/ticket.actions";
import type { TicketPriority, TicketStatus } from "@/types/ticket";
import type { TicketItem } from "@/types/ticket";
import { TICKET_CATEGORIES } from "@/types/ticket";

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
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

export function MyTicketsPanel({ initial }: { initial: TicketItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>(TICKET_CATEGORIES[0]);
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM");
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !description.trim()) {
      setError("Title and description are required.");
      return;
    }
    setError("");
    startTransition(async () => {
      await createTicketAction({ title: title.trim(), description: description.trim(), category, priority });
      setTitle(""); setDescription(""); setCategory(TICKET_CATEGORIES[0]); setPriority("MEDIUM");
      setShowForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="mt-1 text-sm text-muted-foreground">Raise issues or queries — we'll get back to you!</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="size-4" /> Raise Ticket
        </Button>
      </div>

      {/* New Ticket Form */}
      {showForm && (
        <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">New Support Ticket</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title *</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Brief summary of your issue"
                className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30">
                  {TICKET_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority)}
                  className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Description *</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={4} placeholder="Describe your issue in detail..."
                className="w-full resize-none rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30" />
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={handleSubmit} disabled={isPending} className="gap-2">
                <Ticket className="size-4" /> {isPending ? "Submitting..." : "Submit Ticket"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tickets List */}
      {initial.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
          <CardContent className="py-16 text-center">
            <Ticket className="mx-auto size-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No tickets raised yet.</p>
            <p className="text-xs text-muted-foreground/70">Click &apos;Raise Ticket&apos; to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initial.map((t) => {
            const sc = STATUS_CONFIG[t.status];
            const pc = PRIORITY_CONFIG[t.priority];
            const isOpen = expanded === t.id;
            return (
              <Card key={t.id} className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03] cursor-pointer"
                onClick={() => setExpanded(isOpen ? null : t.id)}>
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${sc.color.replace("text-", "bg-").replace("700", "100").replace("600", "50")}`}>
                      <sc.icon className={`size-4 ${sc.color.split(" ")[1]}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-sm">{t.title}</p>
                        <Badge className={`text-[10px] ${sc.color} border-0`}>{sc.label}</Badge>
                        <Badge className={`text-[10px] ${pc.color} border-0`}>{pc.label}</Badge>
                        <span className="text-[10px] text-muted-foreground/60 ml-auto">{timeAgo(t.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{t.category}</p>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="mt-4 space-y-3 border-t border-border/60 pt-4">
                      <p className="text-sm text-muted-foreground">{t.description}</p>
                      {t.adminReply && (
                        <div className="rounded-xl bg-emerald-50 p-3.5 ring-1 ring-emerald-200/60">
                          <div className="mb-1.5 flex items-center gap-1.5">
                            <MessageSquare className="size-3.5 text-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-700">Admin Reply</span>
                          </div>
                          <p className="text-sm text-emerald-800">{t.adminReply}</p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
