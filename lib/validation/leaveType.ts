import { z } from "zod";

export const createLeaveTypeSchema = z.object({
  code: z
    .string()
    .min(1)
    .max(20)
    .transform((v) => v.toUpperCase().replace(/\s+/g, "_")),
  name: z.string().min(1),
  defaultAllocationDays: z.coerce.number().positive().optional(),
  requiresAttachment: z.boolean().default(false),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Must be a hex color like #f97316").default("#f97316"),
});

export type CreateLeaveTypeInput = z.infer<typeof createLeaveTypeSchema>;

export const updateLeaveTypeSchema = createLeaveTypeSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export type UpdateLeaveTypeInput = z.infer<typeof updateLeaveTypeSchema>;
