export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  LEAVE_APPLIED: "New leave request",
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  LATE_CHECK_IN: "Late login",
  MISSED_CHECKOUT_AUTO_CLOSE: "Missed logout",
  ACCOUNT_LOCKED: "Account locked",
  BREAK_LIMIT_EXCEEDED: "Break time exceeded",
};

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

export function formatNotificationDetails(type: string, payload: unknown): string {
  const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;

  switch (type) {
    case "LEAVE_APPLIED":
      return `${p.days ?? "?"} day(s) requested`;
    case "LEAVE_APPROVED":
    case "LEAVE_REJECTED":
      return p.decisionReason ? String(p.decisionReason) : "No reason given";
    case "LATE_CHECK_IN":
      return `${p.lateMinutes ?? "?"} minute(s) late`;
    case "MISSED_CHECKOUT_AUTO_CLOSE": {
      const date = typeof p.attendanceDate === "string" ? p.attendanceDate.slice(0, 10) : "unknown date";
      return `Attendance auto-closed for ${date}`;
    }
    case "ACCOUNT_LOCKED":
      return `Locked after ${p.attempts ?? "?"} failed login attempt(s)`;
    case "BREAK_LIMIT_EXCEEDED":
      return `${p.employeeName ?? "An employee"} took a ${p.durationMin ?? "?"} min ${p.type ?? ""} break (limit ${p.maxMinutes ?? "?"} min)`;
    default:
      return JSON.stringify(payload);
  }
}
