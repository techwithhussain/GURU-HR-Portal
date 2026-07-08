import { z } from "zod";

export const breakTypeSchema = z.enum(["LUNCH", "TEA", "MEETING", "PERSONAL", "WASHROOM", "OTHER"]);

export const startBreakSchema = z.object({ type: breakTypeSchema });

export const correctAttendanceSchema = z
  .object({
    checkInAt: z.coerce.date().optional(),
    checkOutAt: z.coerce.date().optional(),
    reason: z.string().min(1, "A reason is required for attendance corrections."),
  })
  .refine((data) => data.checkInAt || data.checkOutAt, {
    message: "Provide at least one corrected time.",
  });

export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;
