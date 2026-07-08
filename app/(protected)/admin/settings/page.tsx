import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getCompanySettingsAction } from "@/actions/companySettings.actions";
import { CompanySettingsForm } from "@/features/settings/CompanySettingsForm";

export default async function CompanySettingsPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "settings.manage")) redirect("/dashboard");

  const settings = await getCompanySettingsAction();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Company Settings</h1>
      <CompanySettingsForm settings={settings} />
    </div>
  );
}
