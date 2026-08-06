"use client";

import { useState, useTransition } from "react";
import { Pin, PinOff, Trash2, Plus, Megaphone } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  createAnnouncementAction,
  deleteAnnouncementAction,
  toggleAnnouncementPinAction,
} from "@/actions/announcement.actions";
import type { AnnouncementItem } from "@/services/announcementService";
import { useRouter } from "next/navigation";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AdminAnnouncementsPanel({ initial }: { initial: AnnouncementItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [error, setError] = useState("");

  async function handleCreate() {
    if (!title.trim() || !body.trim()) { setError("Title aur message dono chahiye!"); return; }
    setError("");
    startTransition(async () => {
      await createAnnouncementAction({ title: title.trim(), body: body.trim(), isPinned, expiresAt: expiresAt || null });
      setTitle(""); setBody(""); setIsPinned(false); setExpiresAt(""); setShowForm(false);
      router.refresh();
    });
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteAnnouncementAction(id);
      router.refresh();
    });
  }

  function handlePin(id: string) {
    startTransition(async () => {
      await toggleAnnouncementPinAction(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Create form toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Announcements</h1>
          <p className="text-sm text-muted-foreground mt-1">Company-wide notices visible to all employees</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} className="gap-2">
          <Plus className="size-4" />
          New Announcement
        </Button>
      </div>

      {/* Create form */}
      {showForm && (
        <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
          <CardHeader className="border-b border-border/60 pb-4">
            <CardTitle className="text-base">New Announcement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-5">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Office closed on 15 August"
                className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium">Message *</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                placeholder="Write the full announcement here..."
                className="w-full rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none"
              />
            </div>
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">Expires on (optional)</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-blue/30"
                />
              </div>
              <div className="flex items-end">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="size-4 rounded"
                  />
                  📌 Pin this announcement
                </label>
              </div>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <div className="flex gap-3">
              <Button onClick={handleCreate} disabled={isPending} className="gap-2">
                <Megaphone className="size-4" />
                {isPending ? "Posting..." : "Post Announcement"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* List */}
      {initial.length === 0 ? (
        <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
          <CardContent className="py-16 text-center">
            <Megaphone className="mx-auto size-10 text-muted-foreground/30" />
            <p className="mt-3 text-sm text-muted-foreground">No announcements yet.</p>
            <p className="text-xs text-muted-foreground/70">Click &apos;New Announcement&apos; to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {initial.map((item) => (
            <Card key={item.id} className={`rounded-2xl border-0 shadow-soft ring-1 ${item.isPinned ? "ring-brand-blue/30 bg-blue-50/30" : "ring-black/[0.03]"}`}>
              <CardContent className="flex items-start gap-4 py-4">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue">
                  <Megaphone className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-sm">{item.title}</p>
                    {item.isPinned && <Badge variant="secondary" className="text-[10px] gap-1"><Pin className="size-2.5" />Pinned</Badge>}
                    {item.expiresAt && <Badge variant="outline" className="text-[10px]">Expires {new Date(item.expiresAt).toLocaleDateString("en-IN")}</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{item.body}</p>
                  <p className="mt-1.5 text-[11px] text-muted-foreground/60">
                    By {item.authorName} · {timeAgo(item.createdAt)}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title={item.isPinned ? "Unpin" : "Pin"}
                    onClick={() => handlePin(item.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-brand-blue"
                  >
                    {item.isPinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    title="Delete"
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="text-muted-foreground hover:text-red-500"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
