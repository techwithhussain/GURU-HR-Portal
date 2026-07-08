import { redirect } from "next/navigation";
import { getSessionContext } from "@/services/sessionService";
import { ShiftForm } from "@/features/shifts/ShiftForm";

export default async function NewShiftPage() {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") redirect("/dashboard");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Add Shift</h1>
      <ShiftForm mode="create" />
    </div>
  );
}
