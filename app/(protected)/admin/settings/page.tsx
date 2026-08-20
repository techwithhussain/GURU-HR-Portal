import { notFound } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { getCompanySettingsAction } from "@/actions/companySettings.actions";
import { CompanySettingsForm } from "@/features/settings/CompanySettingsForm";
import { CopyTvLinkButton } from "@/features/settings/CopyTvLinkButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { env } from "@/lib/env";

export default async function CompanySettingsPage() {
  const session = await getSessionContext();
  if (!session || !hasPermission(session, "settings.manage")) notFound();

  const settings = await getCompanySettingsAction();
  const tvUrl = `${env.APP_URL}/tv/breaks?token=${env.TV_DISPLAY_TOKEN}`;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Company Settings</h1>
      <CompanySettingsForm settings={settings} />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle className="text-base">Office TV Break Board</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Open this link on the office TV (no login required) to show who&apos;s currently on break, with a
            sound alert whenever someone starts or ends a break.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-muted px-3 py-2 text-xs">{tvUrl}</code>
            <CopyTvLinkButton url={tvUrl} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
