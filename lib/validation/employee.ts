import { z } from "zod";

export const createEmployeeSchema = z.object({
  employeeCode: z.string().min(1).max(20),
  email: z.email(),
  fullName: z.string().min(1),
  phone: z.string().optional(),
  roleId: z.string().min(1),
  departmentId: z.string().min(1).optional(),
  designationId: z.string().min(1).optional(),
  shiftId: z.string().min(1).optional(),
  managerId: z.string().min(1).optional(),
  joiningDate: z.coerce.date(),
  salary: z.coerce.number().nonnegative().optional(),
  emergencyContact: z.string().optional(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  departmentId: z.string().min(1).optional(),
  designationId: z.string().min(1).optional(),
  shiftId: z.string().min(1).optional(),
  managerId: z.string().min(1).optional(),
  salary: z.coerce.number().nonnegative().optional(),
  emergencyContact: z.string().optional(),
});

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;

export const employeeSearchSchema = z.object({
  query: z.string().optional(),
  departmentId: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export type EmployeeSearchInput = z.infer<typeof employeeSearchSchema>;
