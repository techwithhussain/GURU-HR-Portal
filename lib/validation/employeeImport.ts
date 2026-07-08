import { z } from "zod";

export const EMPLOYEE_IMPORT_HEADER = [
  "employeeCode",
  "email",
  "fullName",
  "phone",
  "roleName",
  "departmentName",
  "designationName",
  "shiftName",
  "joiningDate",
  "salary",
  "emergencyContact",
] as const;

export const employeeImportRowSchema = z.object({
  employeeCode: z.string().min(1, "employeeCode is required").max(20),
  email: z.email("email is not valid"),
  fullName: z.string().min(1, "fullName is required"),
  phone: z.string().optional(),
  roleName: z.string().min(1, "roleName is required"),
  departmentName: z.string().optional(),
  designationName: z.string().optional(),
  shiftName: z.string().optional(),
  joiningDate: z.string().min(1, "joiningDate is required"),
  salary: z.string().optional(),
  emergencyContact: z.string().optional(),
});

export type EmployeeImportRow = z.infer<typeof employeeImportRowSchema>;
