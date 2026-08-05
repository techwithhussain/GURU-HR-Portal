export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  LEAVE_APPLIED: "New leave request",
  LEAVE_APPROVED: "Leave approved",
  LEAVE_REJECTED: "Leave rejected",
  LATE_CHECK_IN: "Late login",
  MISSED_CHECKOUT_AUTO_CLOSE: "Missed logout",
  ACCOUNT_LOCKED: "Account locked",
  BREAK_LIMIT_EXCEEDED: "Break time exceeded",
  ADMIN_ANNOUNCEMENT: "Announcement",
  FORCED_LOGOUT: "Logged out by admin",
  BIRTHDAY_REMINDER: "🎂 Birthday",
};

/** Maps internal break type codes → user-friendly labels */
const BREAK_TYPE_LABELS: Record<string, string> = {
  LUNCH: "Meal Break",
  WASHROOM: "Bio Break",
  PERSONAL: "Casual Break",
  MEETING: "Super Break",
};

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABELS[type] ?? type;
}

/** Title to show in the browser popup — uses the admin's actual Subject line
 * for announcements instead of the generic "Announcement" label. */
export function notificationPopupTitle(type: string, payload: unknown): string {
  if (type === "ADMIN_ANNOUNCEMENT") {
    const p = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
    if (p.subject) return String(p.subject);
  }
  return notificationTypeLabel(type);
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
    case "BREAK_LIMIT_EXCEEDED": {
      const breakLabel = (typeof p.type === "string" && BREAK_TYPE_LABELS[p.type]) ? BREAK_TYPE_LABELS[p.type] : (p.type ?? "Break");
      return `${p.employeeName ?? "An employee"} took a ${p.durationMin ?? "?"} min ${breakLabel} (limit ${p.maxMinutes ?? "?"} min)`;
    }
    case "ADMIN_ANNOUNCEMENT":
      return p.message ? String(p.message) : "New announcement from Admin";
    case "FORCED_LOGOUT":
      return p.reason ? String(p.reason) : "An admin logged you out";
    case "BIRTHDAY_REMINDER":
      return p.daysUntil === 0
        ? `Today is ${p.name ?? "a colleague"}'s birthday! 🎉`
        : `${p.name ?? "A colleague"}'s birthday is tomorrow!`;
    default:
      return JSON.stringify(payload);
  }
}
