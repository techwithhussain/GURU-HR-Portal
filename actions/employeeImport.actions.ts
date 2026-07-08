"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import * as employeeImportService from "@/services/employeeImportService";
import { requireSession } from "@/services/sessionService";
import { getClientIp } from "@/lib/network/getClientIp";
import type { EmployeeImportResult } from "@/services/employeeImportService";

async function requestMeta() {
  const hdrs = await headers();
  return { ip: getClientIp(hdrs), userAgent: hdrs.get("user-agent") };
}

export interface ImportActionResult {
  success: boolean;
  data?: EmployeeImportResult;
  error?: string;
}

export async function importEmployeesAction(formData: FormData): Promise<ImportActionResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { success: false, error: "Please choose a CSV file to upload." };
  }

  try {
    const csvText = await file.text();
    const session = await requireSession();
    const meta = await requestMeta();
    const result = await employeeImportService.importEmployeesFromCsv(csvText, session, meta);
    revalidatePath("/admin/employees");
    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to import employees" };
  }
}
