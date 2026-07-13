import { getSessionContext } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getEmployeeProfile } from "@/services/employeeService";
import { toEmployeeProfilePdfBuffer } from "@/lib/reports/toPdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { id } = await params;

  try {
    const profile = await getEmployeeProfile(id, session);
    const buffer = await toEmployeeProfilePdfBuffer(profile);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="employee-profile-${profile.employee.user.employeeCode}.pdf"`,
      },
    });
  } catch (err) {
    return new Response(toUserMessage(err, "Failed to generate profile PDF"), { status: 403 });
  }
}
