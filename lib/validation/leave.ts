import { z } from "zod";

export const applyLeaveSchema = z
  .object({
    typeId: z.string().min(1),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    isHalfDay: z.boolean().default(false),
    reason: z.string().optional(),
    attachmentPath: z.string().optional(),
    attachmentFileName: z.string().optional(),
  })
  .refine((data) => data.startDate <= data.endDate, {
    message: "Start date must be on or before the end date.",
    path: ["endDate"],
  })
  .refine((data) => !data.isHalfDay || data.startDate.getTime() === data.endDate.getTime(), {
    message: "A half-day leave must be a single day.",
    path: ["isHalfDay"],
  });

export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;

export const updateLeaveSchema = applyLeaveSchema;
export type UpdateLeaveInput = z.infer<typeof updateLeaveSchema>;

export const decideLeaveSchema = z.object({
  decision: z.enum(["APPROVED", "REJECTED"]),
  decisionReason: z.string().min(1, "A remark is required to approve or reject a leave request."),
});

export type DecideLeaveInput = z.infer<typeof decideLeaveSchema>;

export const cancelLeaveSchema = z.object({
  reason: z.string().optional(),
});

export type CancelLeaveInput = z.infer<typeof cancelLeaveSchema>;

export const setLeaveBalanceSchema = z.object({
  employeeId: z.string().min(1),
  typeId: z.string().min(1),
  year: z.coerce.number().int(),
  allocated: z.coerce.number().nonnegative(),
});

export type SetLeaveBalanceInput = z.infer<typeof setLeaveBalanceSchema>;
