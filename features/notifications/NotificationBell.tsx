"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  listMyNotificationsAction,
  markAllAsReadAction,
  markAsReadAction,
} from "@/actions/notification.actions";
import { notificationTypeLabel, formatNotificationDetails } from "@/lib/notifications/format";

type NotificationRow = Awaited<ReturnType<typeof listMyNotificationsAction>>[number];

/** Emoji icon per notification type */
const TYPE_ICON: Record<string, string> = {
  LEAVE_APPLIED: "📋",
  LEAVE_APPROVED: "✅",
  LEAVE_REJECTED: "❌",
  LEAVE_CANCELLED: "🚫",
  LATE_CHECK_IN: "⏰",
  MISSED_CHECKOUT_AUTO_CLOSE: "🚪",
  ACCOUNT_LOCKED: "🔒",
  BREAK_LIMIT_EXCEEDED: "☕",
  ADMIN_ANNOUNCEMENT: "📢",
  FORCED_LOGOUT: "⚠️",
  BIRTHDAY_REMINDER: "🎂",
};

/** "2h ago", "just now", "3d ago" */
function timeAgo(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationBell({ initialUnreadCount }: { initialUnreadCount: number }) {
  const [isPending, startTransition] = useTransition();
  const [unreadCount, setUnreadCount] = useState(initialUnreadCount);
  const [notifications, setNotifications] = useState<NotificationRow[] | null>(null);

  function loadNotifications() {
    startTransition(async () => {
      const list = await listMyNotificationsAction();
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.readAt).length);
    });
  }

  function handleItemClick(n: NotificationRow) {
    if (n.readAt) return;
    startTransition(async () => {
      await markAsReadAction(n.id);
      setNotifications((prev) =>
        prev ? prev.map((x) => (x.id === n.id ? { ...x, readAt: new Date() } : x)) : prev,
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    });
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await markAllAsReadAction();
      setNotifications((prev) =>
        prev ? prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date() })) : prev,
      );
      setUnreadCount(0);
    });
  }

  return (
    <DropdownMenu onOpenChange={(open) => open && loadNotifications()}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -right-1 -top-1 h-4 min-w-4 justify-center px-1 text-[10px]"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <button
              type="button"
              className="text-xs font-normal text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.preventDefault();
                handleMarkAllRead();
              }}
              disabled={isPending}
            >
              Mark all as read
            </button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        {notifications === null && (
          <div className="px-3 py-4 text-sm text-muted-foreground">Loading...</div>
        )}
        {notifications?.length === 0 && (
          <div className="px-3 py-4 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}

        {notifications?.slice(0, 10).map((n) => {
          const icon = TYPE_ICON[n.type] ?? "🔔";
          const label = notificationTypeLabel(n.type);
          const detail = formatNotificationDetails(n.type, n.payload);
          const isUnread = !n.readAt;

          return (
            <DropdownMenuItem
              key={n.id}
              onSelect={(e) => {
                e.preventDefault();
                handleItemClick(n);
              }}
              className={`flex items-start gap-3 px-3 py-2.5 ${isUnread ? "bg-brand-orange/5" : ""}`}
            >
              {/* Emoji icon */}
              <span className="mt-0.5 shrink-0 text-base">{icon}</span>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className={`text-sm ${isUnread ? "font-semibold text-foreground" : "font-medium text-muted-foreground"}`}>
                    {label}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                  {detail}
                </p>
              </div>

              {/* Unread dot */}
              {isUnread && (
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand-orange" />
              )}
            </DropdownMenuItem>
          );
        })}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications" className="justify-center text-xs text-muted-foreground">
            View all notifications →
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
