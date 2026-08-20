"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/services/sessionService";
import * as salarySlipService from "@/services/salarySlipService";
import type { CreateSalarySlipInput } from "@/types/salarySlip";

export async function createSalarySlipAction(input: CreateSalarySlipInput) {
  const session = await requireSession();
  const slip = await salarySlipService.createSalarySlip(input, session);
  revalidatePath("/admin/salary-slips");
  redirect(`/admin/salary-slips/${slip.id}`);
}

export async function deleteSalarySlipAction(id: string) {
  const session = await requireSession();
  await salarySlipService.deleteSalarySlip(id, session);
  revalidatePath("/admin/salary-slips");
  redirect("/admin/salary-slips");
}

export async function getAttendanceSummaryAction(
  employeeId: string,
  year: number,
  month: number,
) {
  const session = await requireSession();
  return salarySlipService.getAttendanceSummaryForMonth(employeeId, year, month, session);
}
