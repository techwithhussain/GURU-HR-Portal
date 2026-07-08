export const NOTIFICATION_TYPES = [
  "LEAVE_APPLIED",
  "LEAVE_APPROVED",
  "LEAVE_REJECTED",
  "LATE_CHECK_IN",
  "MISSED_CHECKOUT_AUTO_CLOSE",
  "ACCOUNT_LOCKED",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];
