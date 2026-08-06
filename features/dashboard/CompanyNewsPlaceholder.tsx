import { Megaphone, Pin } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnnouncementItem } from "@/services/announcementService";

function timeAgo(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function AnnouncementsCard({ announcements }: { announcements: AnnouncementItem[] }) {
  return (
    <Card className="rounded-2xl border-0 shadow-soft ring-1 ring-black/[0.03]">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Megaphone className="size-4 text-brand-blue" /> Company News
        </CardTitle>
        {announcements.length > 0 && (
          <span className="rounded-full bg-brand-blue/10 px-2 py-0.5 text-[10px] font-medium text-brand-blue">
            {announcements.length} post{announcements.length !== 1 ? "s" : ""}
          </span>
        )}
      </CardHeader>
      <CardContent className="pt-4">
        {announcements.length === 0 ? (
          <div className="py-8 text-center">
            <Megaphone className="mx-auto size-8 text-muted-foreground/20" />
            <p className="mt-2 text-sm text-muted-foreground">No announcements yet</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {announcements.map((item) => (
              <div
                key={item.id}
                className={`rounded-xl p-3.5 ${
                  item.isPinned
                    ? "bg-brand-blue/5 ring-1 ring-brand-blue/20"
                    : "bg-muted/50"
                }`}
              >
                {item.isPinned && (
                  <div className="mb-1.5 flex items-center gap-1 text-[10px] font-medium text-brand-blue">
                    <Pin className="size-2.5" /> Pinned
                  </div>
                )}
                <p className="text-sm font-semibold leading-tight">{item.title}</p>
                <p className="mt-1 text-xs text-muted-foreground line-clamp-3">{item.body}</p>
                <p className="mt-2 text-[10px] text-muted-foreground/60">
                  {item.authorName} · {timeAgo(item.createdAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
