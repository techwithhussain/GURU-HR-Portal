import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(20),
  email: z.email(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  address: z.string().optional(),
  roleId: z.string().min(1),
  departmentId: z.string().min(1).optional(),
  designationId: z.string().min(1).optional(),
  shiftId: z.string().min(1).optional(),
  managerId: z.string().min(1).optional(),
  joiningDate: z.coerce.date(),
  salary: z.coerce.number().nonnegative().optional(),
  salaryType: z.enum(["MONTHLY", "HOURLY", "ANNUAL"]).optional(),
  allowances: z.coerce.number().nonnegative().optional(),
  deductions: z.coerce.number().nonnegative().optional(),
  emergencyContact: z.string().optional(),
  photoPath: z.string().optional(),
  photoFileName: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  departmentId: z.string().min(1).optional(),
  designationId: z.string().min(1).optional(),
  shiftId: z.string().min(1).optional(),
  managerId: z.string().min(1).optional(),
  roleId: z.string().min(1).optional(),
  joiningDate: z.coerce.date().optional(),
  salary: z.coerce.number().nonnegative().optional(),
  salaryType: z.enum(["MONTHLY", "HOURLY", "ANNUAL"]).optional(),
  allowances: z.coerce.number().nonnegative().optional(),
  deductions: z.coerce.number().nonnegative().optional(),
  emergencyContact: z.string().optional(),
  photoPath: z.string().optional(),
  photoFileName: z.string().optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeSearchSchema = z.object({
  query: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  shiftId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "RESIGNED"]).optional(),
  attendanceStatus: z
    .enum(["PRESENT", "LATE", "HALF_DAY", "ABSENT", "ON_LEAVE", "HOLIDAY", "WEEKLY_OFF"])
    .optional(),
  joiningDateFrom: z.coerce.date().optional(),
  joiningDateTo: z.coerce.date().optional(),
  sortBy: z.enum(["fullName", "joiningDate", "department", "employeeCode"]).default("fullName"),
  sortDir: z.enum(["asc", "desc"]).default("asc"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;

export const bulkEmployeeIdsSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
});

export const bulkAssignShiftSchema = z.object({
  employeeIds: z.array(z.string().min(1)).min(1),
  shiftId: z.string().min(1),
});
