import { z } from "zod";

export const breakTypeSchema = z.enum(["LUNCH", "TEA", "MEETING", "PERSONAL", "WASHROOM", "OTHER"]);

export const startBreakSchema = z.object({ type: breakTypeSchema });

export const correctAttendanceSchema = z
  .object({
    checkInAt: z.coerce.date().optional(),
    checkOutAt: z.preprocess(
      (val) => (val === "" || val === null ? null : val),
      z.coerce.date().nullable().optional()
    ),
    reason: z.string().min(1, "A reason is required for attendance corrections."),
  })
  .refine((data) => data.checkInAt !== undefined || data.checkOutAt !== undefined, {
    message: "Provide at least one corrected time.",
  });

export type CorrectAttendanceInput = z.infer<typeof correctAttendanceSchema>;

