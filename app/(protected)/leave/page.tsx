import { listMyLeavesAction, getMyBalancesAction } from "@/actions/leave.actions";
import { ApplyLeaveForm } from "@/features/leave/ApplyLeaveForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString();
}

export default async function LeavePage() {
  const year = new Date().getFullYear();
  const [leaves, balances] = await Promise.all([listMyLeavesAction(), getMyBalancesAction(year)]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Leave</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {balances.map((balance) => {
          const allocated = Number(balance.allocated);
          const used = Number(balance.used);
          return (
            <Card key={balance.id}>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">{balance.type}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold">{allocated - used}</p>
                <p className="text-xs text-muted-foreground">
                  {used} used of {allocated}
                </p>
              </CardContent>
            </Card>
          );
        })}
        {balances.length === 0 && (
          <p className="col-span-full text-sm text-muted-foreground">
            No leave balance set yet — contact HR.
          </p>
        )}
      </div>

      <ApplyLeaveForm />

      <div className="space-y-2">
        <h2 className="text-lg font-semibold tracking-tight">My Leaves</h2>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Days</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {leaves.map((leave) => (
              <TableRow key={leave.id}>
                <TableCell>{leave.type}</TableCell>
                <TableCell>
                  {formatDate(leave.startDate)} – {formatDate(leave.endDate)}
                </TableCell>
                <TableCell>{String(leave.days)}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      leave.status === "APPROVED"
                        ? "default"
                        : leave.status === "REJECTED"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {leave.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {leaves.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No leave requests yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
