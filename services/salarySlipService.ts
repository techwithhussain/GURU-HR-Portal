import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requirePermission, hasPermission, ForbiddenError } from "@/lib/rbac/permissions";
import { MONTH_NAMES, type SalarySlipItem, type CreateSalarySlipInput } from "@/types/salarySlip";
import type { SessionContext } from "@/types/session";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function toDecimalNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

// Format date to ISO string safely
function formatDateString(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

const SLIP_INCLUDE = {
  employee: {
    select: {
      fullName: true,
      joiningDate: true,
      address: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      user: { select: { employeeCode: true } },
    },
  },
  createdBy: {
    select: {
      employeeCode: true,
      employee: { select: { fullName: true } },
    },
  },
} as const;

function mapSlip(r: any): SalarySlipItem {
  const basicSalary = toDecimalNumber(r.basicSalary);
  const rawAllowances = toDecimalNumber(r.allowances);
  const rawDeductions = toDecimalNumber(r.deductions);
  const bonus = toDecimalNumber(r.bonus);

  let specialAllowance = toDecimalNumber(r.specialAllowance);
  let nightAllowance = toDecimalNumber(r.nightAllowance);
  let otherAllowance = toDecimalNumber(r.otherAllowance);

  // Legacy fallback for allowances
  if (specialAllowance === 0 && nightAllowance === 0 && otherAllowance === 0 && rawAllowances > 0) {
    specialAllowance = rawAllowances;
  }
  const totalAllowances = specialAllowance + nightAllowance + otherAllowance || rawAllowances;

  let pfDeduction = toDecimalNumber(r.pfDeduction);
  let profTaxDeduction = toDecimalNumber(r.profTaxDeduction);
  let tdsDeduction = toDecimalNumber(r.tdsDeduction);
  let lopDeduction = toDecimalNumber(r.lopDeduction);
  let otherDeduction = toDecimalNumber(r.otherDeduction);

  // Legacy fallback for deductions
  if (
    pfDeduction === 0 &&
    profTaxDeduction === 0 &&
    tdsDeduction === 0 &&
    lopDeduction === 0 &&
    otherDeduction === 0 &&
    rawDeductions > 0
  ) {
    otherDeduction = rawDeductions;
  }
  const totalDeductions =
    pfDeduction + profTaxDeduction + tdsDeduction + lopDeduction + otherDeduction || rawDeductions;

  const netSalary = toDecimalNumber(r.netSalary);

  // Snapshot employee details with fallback to live relations
  const employeeName = r.snapEmployeeName || r.employee?.fullName || "Employee";
  const employeeCode = r.snapEmployeeCode || r.employee?.user?.employeeCode || "";
  const department = r.snapDepartment ?? r.employee?.department?.name ?? null;
  const designation = r.snapDesignation ?? r.employee?.designation?.name ?? null;
  const joiningDate = formatDateString(r.snapJoiningDate || r.employee?.joiningDate);
  const employmentType = r.snapEmploymentType || "Full Time";
  const location = r.snapLocation || "Mohali, Punjab";
  const panNumber = r.snapPanNumber || "ABCDE1234F";
  const aadhaarNumber = r.snapAadhaarNumber || "1234 5678 9012";
  const bankAccount = r.snapBankAccount || "XXXXXX1234 (HDFC Bank)";
  const bankName = r.snapBankName || "HDFC Bank";

  return {
    id: r.id,
    month: r.month,
    year: r.year,
    monthName: MONTH_NAMES[r.month - 1],

    basicSalary,
    specialAllowance,
    nightAllowance,
    otherAllowance,
    allowances: totalAllowances,
    bonus,

    pfDeduction,
    profTaxDeduction,
    tdsDeduction,
    lopDeduction,
    otherDeduction,
    deductions: totalDeductions,

    netSalary,

    workingDays: r.workingDays,
    presentDays: r.presentDays,
    paidLeaveDays: r.paidLeaveDays ?? 0,
    lopDays: r.lopDays ?? 0,
    absentDays: r.absentDays ?? (r.paidLeaveDays ?? 0) + (r.lopDays ?? 0),

    notes: r.notes,
    createdAt: r.createdAt,

    employeeId: r.employeeId,
    employeeName,
    employeeCode,
    department,
    designation,
    joiningDate,
    employmentType,
    location,
    panNumber,
    aadhaarNumber,
    bankAccount,
    bankName,

    createdByName: r.createdBy?.employee?.fullName ?? r.createdBy?.employeeCode ?? "Admin",
  };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

/** Admin: get all salary slips, optionally filtered */
export async function getAllSalarySlips(
  actor: SessionContext,
  filters?: { employeeId?: string; year?: number; month?: number },
): Promise<SalarySlipItem[]> {
  requirePermission(actor, "salary.manage");

  const rows = await prisma.salarySlip.findMany({
    where: {
      ...(filters?.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters?.year ? { year: filters.year } : {}),
      ...(filters?.month ? { month: filters.month } : {}),
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: SLIP_INCLUDE,
  });

  return rows.map(mapSlip);
}

/** Employee: get only own salary slips */
export async function getMySalarySlips(actor: SessionContext): Promise<SalarySlipItem[]> {
  if (!hasPermission(actor, "salary.view")) throw new ForbiddenError("salary.view");
  if (!actor.employeeId) return [];

  const rows = await prisma.salarySlip.findMany({
    where: { employeeId: actor.employeeId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
    include: SLIP_INCLUDE,
  });

  return rows.map(mapSlip);
}

/** Get a single slip by ID — admin sees all, employee sees own */
export async function getSalarySlipById(
  id: string,
  actor: SessionContext,
): Promise<SalarySlipItem | null> {
  const row = await prisma.salarySlip.findUnique({
    where: { id },
    include: SLIP_INCLUDE,
  });

  if (!row) return null;

  // Permission check
  if (hasPermission(actor, "salary.manage")) {
    return mapSlip(row);
  }
  if (hasPermission(actor, "salary.view") && row.employeeId === actor.employeeId) {
    return mapSlip(row);
  }

  throw new ForbiddenError("salary.view");
}

/** Pre-fill attendance summary for an employee for a selected month/year */
export async function getAttendanceSummaryForMonth(
  employeeId: string,
  year: number,
  month: number,
  actor: SessionContext,
) {
  requirePermission(actor, "salary.manage");

  const monthStart = DateTime.local(year, month, 1).startOf("month").toJSDate();
  const monthEnd = DateTime.local(year, month, 1).endOf("month").toJSDate();
  const daysInMonth = DateTime.local(year, month, 1).daysInMonth ?? 30;

  const attendanceRecords = await prisma.attendance.findMany({
    where: {
      employeeId,
      attendanceDate: { gte: monthStart, lte: monthEnd },
    },
    select: { status: true },
  });

  const presentDays = attendanceRecords.filter((a) =>
    ["PRESENT", "LATE", "HALF_DAY"].includes(a.status),
  ).length;

  const approvedLeaves = await prisma.leave.findMany({
    where: {
      employeeId,
      status: "APPROVED",
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { days: true },
  });

  const paidLeaveDays = Math.round(
    approvedLeaves.reduce((acc, l) => acc + Number(l.days), 0),
  );

  const recordedAbsent = attendanceRecords.filter((a) => a.status === "ABSENT").length;
  const lopDays = Math.max(0, daysInMonth - (presentDays + paidLeaveDays));
  const absentDays = paidLeaveDays + lopDays;

  return {
    workingDays: daysInMonth,
    presentDays,
    paidLeaveDays,
    lopDays,
    absentDays: Math.max(absentDays, recordedAbsent),
  };
}

// ---------------------------------------------------------------------------
// Mutations
// ---------------------------------------------------------------------------

/** Admin: create a new salary slip */
export async function createSalarySlip(
  input: CreateSalarySlipInput,
  actor: SessionContext,
): Promise<SalarySlipItem> {
  requirePermission(actor, "salary.manage");

  // Fetch employee info for historical snapshot
  const employee = await prisma.employee.findUnique({
    where: { id: input.employeeId },
    select: {
      fullName: true,
      joiningDate: true,
      address: true,
      panNumber: true,
      aadhaarNumber: true,
      bankAccount: true,
      bankName: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      user: { select: { employeeCode: true } },
    },
  });

  if (!employee) throw new Error("Employee not found");

  const specialAllowance = input.specialAllowance ?? 0;
  const nightAllowance = input.nightAllowance ?? 0;
  const otherAllowance = input.otherAllowance ?? 0;
  const allowances = input.allowances ?? specialAllowance + nightAllowance + otherAllowance;
  const bonus = input.bonus ?? 0;

  const grossEarnings = input.basicSalary + (specialAllowance + nightAllowance + otherAllowance || allowances) + bonus;

  const pfDeduction = input.pfDeduction ?? 0;
  const profTaxDeduction = input.profTaxDeduction ?? 0;
  const tdsDeduction = input.tdsDeduction ?? 0;
  const lopDeduction = input.lopDeduction ?? 0;
  const otherDeduction = input.otherDeduction ?? 0;
  const totalDeductions =
    input.deductions ??
    pfDeduction + profTaxDeduction + tdsDeduction + lopDeduction + otherDeduction;

  const netSalary = grossEarnings - totalDeductions;

  const paidLeaveDays = input.paidLeaveDays ?? 0;
  const lopDays = input.lopDays ?? 0;
  const absentDays = input.absentDays ?? paidLeaveDays + lopDays;

  const row = await prisma.salarySlip.create({
    data: {
      employeeId: input.employeeId,
      month: input.month,
      year: input.year,
      basicSalary: input.basicSalary,
      specialAllowance,
      nightAllowance,
      otherAllowance,
      allowances: specialAllowance + nightAllowance + otherAllowance || allowances,
      bonus,

      pfDeduction,
      profTaxDeduction,
      tdsDeduction,
      lopDeduction,
      otherDeduction,
      deductions: totalDeductions,

      netSalary,
      workingDays: input.workingDays ?? 30,
      presentDays: input.presentDays ?? 30,
      paidLeaveDays,
      lopDays,
      absentDays,
      notes: input.notes ?? null,

      // Historical Employee Snapshot
      snapEmployeeName: employee.fullName,
      snapEmployeeCode: employee.user.employeeCode,
      snapDepartment: employee.department?.name ?? null,
      snapDesignation: employee.designation?.name ?? null,
      snapJoiningDate: employee.joiningDate,
      snapEmploymentType: "Full Time",
      snapLocation: "Mohali, Punjab",
      snapPanNumber: employee.panNumber || "ABCDE1234F",
      snapAadhaarNumber: employee.aadhaarNumber || "1234 5678 9012",
      snapBankAccount: employee.bankAccount || "XXXXXX1234",
      snapBankName: employee.bankName || "HDFC Bank",

      createdByUserId: actor.userId,
    },
    include: SLIP_INCLUDE,
  });

  return mapSlip(row);
}

/** Admin: delete a salary slip */
export async function deleteSalarySlip(id: string, actor: SessionContext): Promise<void> {
  requirePermission(actor, "salary.manage");
  await prisma.salarySlip.delete({ where: { id } });
}

/** Get list of all active employees for the admin create-slip dropdown */
export async function getEmployeesForSlipDropdown(actor: SessionContext) {
  requirePermission(actor, "salary.manage");

  return prisma.employee.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      fullName: true,
      salary: true,
      allowances: true,
      deductions: true,
      joiningDate: true,
      department: { select: { name: true } },
      designation: { select: { name: true } },
      user: { select: { employeeCode: true } },
    },
    orderBy: { fullName: "asc" },
  });
}
