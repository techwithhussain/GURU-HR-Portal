import { redirect } from "next/navigation";
import { Send } from "lucide-react";
import { listDepartments, listEmployees } from "@/services/orgService";
import { getSessionContext } from "@/services/sessionService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SendAnnouncementForm } from "@/features/notifications/SendAnnouncementForm";

export default async function SendNotificationPage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  const [departments, employees] = await Promise.all([listDepartments(), listEmployees()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Send Notification</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="size-4" /> Compose Announcement
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SendAnnouncementForm
            departments={departments.map((d) => ({ id: d.id, name: d.name }))}
            employees={employees}
          />
        </CardContent>
      </Card>
    </div>
  );
}
