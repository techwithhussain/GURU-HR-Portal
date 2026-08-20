import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getInactivityEventsAction } from "@/actions/inactivity.actions";
import { getCompanyTimezone } from "@/services/reportsService";
import { InactivityTable } from "@/features/inactivity/InactivityTable";
import { env } from "@/lib/env";

export default async function InactivityReportPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "reports.view.all")) notFound();

  const [events, timezone] = await Promise.all([
    getInactivityEventsAction("PENDING"),
    getCompanyTimezone(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Inactivity Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Employees inactive for more than {env.INACTIVITY_THRESHOLD_MINUTES} minutes during their shift.
          Review and decide action.
        </p>
      </div>
      <InactivityTable initialEvents={events} timezone={timezone} />
    </div>
  );
}
