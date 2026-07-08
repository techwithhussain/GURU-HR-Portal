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

type NotificationRow = Awaited<ReturnType<typeof listMyNotificationsAction>>[number];

const TYPE_LABELS: Record<string, string> = {
  LEAVE_APPLIED: "New leave request",
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  LATE_CHECK_IN: "Late check-in",
  MISSED_CHECKOUT_AUTO_CLOSE: "Missed checkout",
  ACCOUNT_LOCKED: "Account locked",
};

function describe(n: NotificationRow): string {
  return TYPE_LABELS[n.type] ?? n.type;
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
      setNotifications((prev) => (prev ? prev.map((x) => ({ ...x, readAt: x.readAt ?? new Date() })) : prev));
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
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          Notifications
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
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications === null && (
          <div className="px-2 py-3 text-sm text-muted-foreground">Loading...</div>
        )}
        {notifications?.length === 0 && (
          <div className="px-2 py-3 text-sm text-muted-foreground">No notifications yet.</div>
        )}
        {notifications?.slice(0, 10).map((n) => (
          <DropdownMenuItem
            key={n.id}
            onSelect={(e) => {
              e.preventDefault();
              handleItemClick(n);
            }}
            className="flex flex-col items-start gap-0.5"
          >
            <span className={n.readAt ? "text-muted-foreground" : "font-medium"}>{describe(n)}</span>
            <span className="text-xs text-muted-foreground">
              {new Date(n.createdAt).toLocaleString()}
            </span>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/notifications">View all</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
