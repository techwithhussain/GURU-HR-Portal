import { z } from "zod";

export const sendAdminAnnouncementSchema = z
  .object({
    audience: z.enum(["ALL", "DEPARTMENT", "EMPLOYEE"]),
    departmentId: z.string().optional(),
    employeeId: z.string().optional(),
    subject: z.string().min(1, "Subject is required"),
    message: z.string().min(1, "Message is required"),
    sendEmail: z.boolean().optional().default(false),
  })
  .refine(
    (data) =>
      (data.audience === "DEPARTMENT" && !!data.departmentId) ||
      (data.audience === "EMPLOYEE" && !!data.employeeId) ||
      data.audience === "ALL",
    { message: "Select a target for this audience.", path: ["departmentId"] },
  );

export type SendAdminAnnouncementInput = z.infer<typeof sendAdminAnnouncementSchema>;

export const NOTIFICATION_TYPES = [
  "LEAVE_APPLIED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LEAVE_CANCELLED",
  "LATE_CHECK_IN",
  "MISSED_CHECKOUT_AUTO_CLOSE",
  "ACCOUNT_LOCKED",
  "BREAK_LIMIT_EXCEEDED",
  "ADMIN_ANNOUNCEMENT",
  "FORCED_LOGOUT",
  "BIRTHDAY_REMINDER",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
