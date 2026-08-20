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

export const correctBreakSchema = z.object({
  startAt: z.coerce.date(),
  endAt: z.preprocess(
    (val) => (val === "" || val === null ? null : val),
    z.coerce.date().nullable()
  ),
  reason: z.string().min(1, "A reason is required for break corrections."),
});

export type CorrectBreakInput = z.infer<typeof correctBreakSchema>;

export const createAttendanceCorrectionRequestSchema = z.object({
  attendanceDate: z.string().min(1, "Attendance date is required"),
  requestedCheckIn: z.string().optional(),
  requestedCheckOut: z.string().optional(),
  reason: z.string().trim().min(3, "Reason / Note is required for attendance correction"),
});

export type CreateAttendanceCorrectionRequestInput = z.infer<typeof createAttendanceCorrectionRequestSchema>;

export const reviewAttendanceCorrectionRequestSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"]),
  adminNote: z.string().trim().optional(),
});

export type ReviewAttendanceCorrectionRequestInput = z.infer<typeof reviewAttendanceCorrectionRequestSchema>;

