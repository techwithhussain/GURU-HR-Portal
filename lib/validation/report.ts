import { z } from "zod";

export const reportTypeSchema = z.enum(["attendance", "leave"]);

export const reportFiltersSchema = z
  .object({
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    employeeId: z.string().optional(),
    departmentId: z.string().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be on or before the end date.",
    path: ["endDate"],
  });

export type ReportFilters = z.infer<typeof reportFiltersSchema>;

export const reportFormatSchema = z.enum(["csv", "xlsx"]).default("csv");
