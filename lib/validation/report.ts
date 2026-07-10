import { z } from "zod";

export const reportTypeSchema = z.enum(["attendance", "leave"]);

export const attendanceStatusFilterSchema = z.enum([
  "PRESENT",
  "LATE",
  "HALF_DAY",
  "ABSENT",
  "ON_LEAVE",
  "HOLIDAY",
  "WEEKLY_OFF",
]);

export const leaveStatusFilterSchema = z.enum(["APPLIED", "APPROVED", "REJECTED", "CANCELLED"]);

export const reportFiltersSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    employeeId: z.string().optional(),
    departmentId: z.string().optional(),
    designationId: z.string().optional(),
    shiftId: z.string().optional(),
    leaveTypeId: z.string().optional(),
    status: z.union([attendanceStatusFilterSchema, leaveStatusFilterSchema]).optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be on or before the end date.",
    path: ["endDate"],
  });

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const reportFormatSchema = z.enum(["csv", "xlsx", "pdf"]).default("csv");

export const updateAttendanceNotesSchema = z.object({
  notes: z.string().max(4000, "Notes must be 4000 characters or fewer."),
});
