import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import * as employeeService from "@/services/employeeService";
import type { RequestMeta } from "@/services/employeeService";
import * as orgService from "@/services/orgService";
import { listShifts } from "@/services/shiftService";
import type { SessionContext } from "@/types/session";
import { parseCsv } from "@/lib/import/parseCsv";
import { EMPLOYEE_IMPORT_HEADER, employeeImportRowSchema } from "@/lib/validation/employeeImport";
import { createEmployeeSchema } from "@/lib/validation/employee";

export interface EmployeeImportRowResult {
  row: number;
  employeeCode: string;
  status: "created" | "error";
  message: string;
}

export interface EmployeeImportResult {
  totalRows: number;
  createdCount: number;
  errorCount: number;
  results: EmployeeImportRowResult[];
}

function rowArrayToRecord(header: string[], row: string[]): Record<string, string> {
  const record: Record<string, string> = {};
  header.forEach((key, i) => {
    record[key] = (row[i] ?? "").trim();
  });
  return record;
}

export async function importEmployeesFromCsv(
  csvText: string,
  actor: SessionContext,
  meta: RequestMeta = {},
): Promise<EmployeeImportResult> {
  requirePermission(actor, "employee.manage");

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    throw new Error("The CSV file is empty.");
  }

  const header = rows[0].map((h) => h.trim());
  const expected = [...EMPLOYEE_IMPORT_HEADER];
  if (header.length !== expected.length || header.some((h, i) => h !== expected[i])) {
    throw new Error(
      `CSV header does not match the expected template. Expected: ${expected.join(", ")}`,
    );
  }

  const dataRows = rows.slice(1);

  const [roles, departments, designations, shifts] = await Promise.all([
    orgService.listRoles(),
    orgService.listDepartments(),
    orgService.listDesignations(),
    listShifts(),
  ]);

  const roleByName = new Map(roles.map((r) => [r.name.toLowerCase(), r.id]));
  const departmentByName = new Map(departments.map((d) => [d.name.toLowerCase(), d.id]));
  const shiftByName = new Map(shifts.map((s) => [s.name.toLowerCase(), s.id]));
  const designationByDeptAndName = new Map(
    designations.map((d) => [`${d.departmentId}:${d.name.toLowerCase()}`, d.id]),
  );

  const records = dataRows.map((row) => rowArrayToRecord(header, row));

  const codesInFile = new Map<string, number>();
  const emailsInFile = new Map<string, number>();
  const intraFileDuplicates = new Map<number, string>();
  records.forEach((record, idx) => {
    const rowNum = idx + 2; // +1 for header, +1 for 1-indexing
    const code = record.employeeCode.toLowerCase();
    const email = record.email.toLowerCase();
    if (code && codesInFile.has(code)) {
      intraFileDuplicates.set(rowNum, `Duplicate employeeCode "${record.employeeCode}" also appears on row ${codesInFile.get(code)}.`);
    } else if (code) {
      codesInFile.set(code, rowNum);
    }
    if (email && emailsInFile.has(email)) {
      intraFileDuplicates.set(rowNum, `Duplicate email "${record.email}" also appears on row ${emailsInFile.get(email)}.`);
    } else if (email) {
      emailsInFile.set(email, rowNum);
    }
  });

  const existingUsers = await prisma.user.findMany({
    select: { employeeCode: true, email: true },
  });
  const existingCodes = new Set(existingUsers.map((u) => u.employeeCode.toLowerCase()));
  const existingEmails = new Set(existingUsers.map((u) => u.email.toLowerCase()));

  const results: EmployeeImportRowResult[] = [];

  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];
    const rowNum = idx + 2;

    if (intraFileDuplicates.has(rowNum)) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: intraFileDuplicates.get(rowNum)!,
      });
      continue;
    }

    if (existingCodes.has(record.employeeCode.toLowerCase())) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: `An employee with code "${record.employeeCode}" already exists.`,
      });
      continue;
    }
    if (existingEmails.has(record.email.toLowerCase())) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: `An employee with email "${record.email}" already exists.`,
      });
      continue;
    }

    const parsedRow = employeeImportRowSchema.safeParse(record);
    if (!parsedRow.success) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: parsedRow.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    const roleId = roleByName.get(parsedRow.data.roleName.toLowerCase());
    if (!roleId) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: `Role "${parsedRow.data.roleName}" not found.`,
      });
      continue;
    }

    let departmentId: string | undefined;
    if (parsedRow.data.departmentName) {
      departmentId = departmentByName.get(parsedRow.data.departmentName.toLowerCase());
      if (!departmentId) {
        results.push({
          row: rowNum,
          employeeCode: record.employeeCode,
          status: "error",
          message: `Department "${parsedRow.data.departmentName}" not found.`,
        });
        continue;
      }
    }

    let designationId: string | undefined;
    if (parsedRow.data.designationName) {
      if (!departmentId) {
        results.push({
          row: rowNum,
          employeeCode: record.employeeCode,
          status: "error",
          message: `Designation "${parsedRow.data.designationName}" requires a departmentName.`,
        });
        continue;
      }
      designationId = designationByDeptAndName.get(
        `${departmentId}:${parsedRow.data.designationName.toLowerCase()}`,
      );
      if (!designationId) {
        results.push({
          row: rowNum,
          employeeCode: record.employeeCode,
          status: "error",
          message: `Designation "${parsedRow.data.designationName}" not found in department "${parsedRow.data.departmentName}".`,
        });
        continue;
      }
    }

    let shiftId: string | undefined;
    if (parsedRow.data.shiftName) {
      shiftId = shiftByName.get(parsedRow.data.shiftName.toLowerCase());
      if (!shiftId) {
        results.push({
          row: rowNum,
          employeeCode: record.employeeCode,
          status: "error",
          message: `Shift "${parsedRow.data.shiftName}" not found.`,
        });
        continue;
      }
    }

    const candidate = createEmployeeSchema.safeParse({
      employeeCode: parsedRow.data.employeeCode,
      email: parsedRow.data.email,
      fullName: parsedRow.data.fullName,
      phone: parsedRow.data.phone || undefined,
      roleId,
      departmentId,
      designationId,
      shiftId,
      joiningDate: parsedRow.data.joiningDate,
      salary: parsedRow.data.salary || undefined,
      emergencyContact: parsedRow.data.emergencyContact || undefined,
    });

    if (!candidate.success) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: candidate.error.issues[0]?.message ?? "Invalid row",
      });
      continue;
    }

    try {
      const { tempPassword } = await employeeService.createEmployee(candidate.data, actor, meta);
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "created",
        message: `Created — temporary password: ${tempPassword}`,
      });
    } catch (err) {
      results.push({
        row: rowNum,
        employeeCode: record.employeeCode,
        status: "error",
        message: err instanceof Error ? err.message : "Failed to create employee",
      });
    }
  }

  return {
    totalRows: records.length,
    createdCount: results.filter((r) => r.status === "created").length,
    errorCount: results.filter((r) => r.status === "error").length,
    results,
  };
}
