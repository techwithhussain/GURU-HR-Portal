import ipaddr from "ipaddr.js";
import { z } from "zod";

export function isValidCidr(value: string): boolean {
  try {
    ipaddr.parseCIDR(value);
    return true;
  } catch {
    return false;
  }
}

export const officeHoursSchema = z.object({
  start: z.string().regex(/^\d{2}:\d{2}$/),
  end: z.string().regex(/^\d{2}:\d{2}$/),
});

export const holidaySchema = z.object({
  date: z.coerce.date(),
  name: z.string().min(1),
});

export const updateCompanySettingsSchema = z.object({
  name: z.string().min(1),
  timezone: z.string().min(1),
  officeIps: z
    .array(z.string().refine(isValidCidr, "Not a valid CIDR (e.g. 203.0.113.5/32)"))
    .default([]),
  officeHours: officeHoursSchema.optional(),
  holidayCalendar: z.array(holidaySchema).default([]),
  maxConcurrentBreaks: z.coerce.number().int().min(1).max(100),
  inactivityThresholdMinutes: z.coerce.number().int().min(1).max(480).default(20),
  pcAssignments: z.record(z.string(), z.string()).default({}),
});

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;
