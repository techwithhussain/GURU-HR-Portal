import { listMyNotificationsAction } from "@/actions/notification.actions";
import { MarkAllReadButton } from "@/features/notifications/MarkAllReadButton";
import { Badge } from "@/components/ui/badge";
import { notificationTypeLabel, formatNotificationDetails } from "@/lib/notifications/format";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function NotificationsPage() {
  const notifications = await listMyNotificationsAction();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
        <MarkAllReadButton />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Type</TableHead>
            <TableHead>Details</TableHead>
            <TableHead>Received</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {notifications.map((n) => (
            <TableRow key={n.id}>
              <TableCell>{notificationTypeLabel(n.type)}</TableCell>
              <TableCell className="max-w-md text-xs text-muted-foreground">
                {formatNotificationDetails(n.type, n.payload)}
              </TableCell>
              <TableCell>{new Date(n.createdAt).toLocaleString()}</TableCell>
              <TableCell>
                <Badge variant={n.readAt ? "secondary" : "default"}>
                  {n.readAt ? "READ" : "UNREAD"}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
          {notifications.length === 0 && (
            <TableRow>
              <TableCell colSpan={4} className="text-center text-muted-foreground">
                No notifications yet.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
