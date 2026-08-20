import { z } from "zod";

export const overtimeRuleSchema = z.object({
  thresholdMin: z.coerce.number().int().nonnegative(),
  roundingMin: z.coerce.number().int().positive(),
});

export const createShiftSchema = z.object({
  name: z.string().min(1),
  startMinutesOfDay: z.coerce.number().int().min(0).max(1439),
  endMinutesOfDay: z.coerce.number().int().min(0).max(1439),
  gracePeriodMin: z.coerce.number().int().nonnegative().default(0),
  halfDayThresholdMin: z.coerce.number().int().positive(),
  overtimeRule: overtimeRuleSchema,
  weeklyOff: z.array(z.number().int().min(0).max(6)).default([]),
  breakAllowanceMin: z.coerce.number().int().nonnegative().optional(),
});

export type CreateShiftInput = z.infer<typeof createShiftSchema>;

export const updateShiftSchema = createShiftSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;

export const createShiftChangeRequestSchema = z.object({
  requestedShiftId: z.string().min(1, "Please select a shift"),
  reason: z.string().trim().min(3, "Reason / Note is required for shift change request"),
});

export type CreateShiftChangeRequestInput = z.infer<typeof createShiftChangeRequestSchema>;

export const reviewShiftChangeRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().trim().optional(),
});

export type ReviewShiftChangeRequestInput = z.infer<typeof reviewShiftChangeRequestSchema>;

