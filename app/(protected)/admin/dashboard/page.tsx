import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getDashboardSummaryAction, getEmployeesOnBreakAction } from "@/actions/dashboard.actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmployeesOnBreakWidget } from "@/features/dashboard/EmployeesOnBreakWidget";

const STAT_TILES = [
  { key: "totalEmployees", label: "Total Employees" },
  { key: "presentToday", label: "Present Today" },
  { key: "lateToday", label: "Late Today" },
  { key: "onBreakNow", label: "On Break" },
  { key: "workingNow", label: "Working Now" },
  { key: "checkedOutToday", label: "Logged Out" },
  { key: "absentToday", label: "Absent Today" },
] as const;

export default async function AdminDashboardPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "reports.view.all")) redirect("/dashboard");

  const [summary, employeesOnBreak] = await Promise.all([
    getDashboardSummaryAction(),
    getEmployeesOnBreakAction(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Admin Dashboard</h1>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {STAT_TILES.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader>
              <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{summary[key]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <EmployeesOnBreakWidget initialData={employeesOnBreak} />
    </div>
  );
}
