import { z } from "zod";

export const LEAVE_TYPES = ["CASUAL", "SICK", "PAID", "EMERGENCY"] as const;
export const leaveTypeSchema = z.enum(LEAVE_TYPES);

export const applyLeaveSchema = z
  .object({
    type: leaveTypeSchema,
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    reason: z.string().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be on or before the end date.",
    path: ["endDate"],
  });

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const decideLeaveSchema = z
  .object({
    decision: z.enum(["APPROVED", "REJECTED"]),
    decisionReason: z.string().optional(),
  })
  .refine((data) => data.decision !== "REJECTED" || !!data.decisionReason, {
    message: "A reason is required when rejecting a leave request.",
    path: ["decisionReason"],
  });

export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;

export const setLeaveBalanceSchema = z.object({
  employeeId: z.string().min(1),
  type: leaveTypeSchema,
  year: z.coerce.number().int(),
  allocated: z.coerce.number().nonnegative(),
});

export type SetLeaveBalanceInput = z.infer<typeof setLeaveBalanceSchema>;
