import { notFound } from "next/navigation";
import { getShiftAction } from "@/actions/shift.actions";
import { getSessionContext } from "@/services/sessionService";
import { ShiftForm } from "@/features/shifts/ShiftForm";

export default async function EditShiftPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSessionContext();
  if (!session || session.roleName !== "ADMIN") notFound();

  const { id } = await params;
  const shift = await getShiftAction(id);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit Shift</h1>
      <ShiftForm mode="edit" shift={shift} />
    </div>
  );
}
