import "server-only";
import { prisma } from "@/lib/prisma";
import { hasPermission } from "@/lib/rbac/permissions";
import { notificationTypeLabel, formatNotificationDetails } from "@/lib/notifications/format";
import type { SessionContext } from "@/types/session";

export interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

export interface GlobalSearchResults {
  employees: SearchHit[];
  leaves: SearchHit[];
  attendance: SearchHit[];
  notifications: SearchHit[];
}

const MAX_PER_GROUP = 5;
const EMPTY_RESULTS: GlobalSearchResults = { employees: [], leaves: [], attendance: [], notifications: [] };

export async function globalSearch(rawQuery: string, actor: SessionContext): Promise<GlobalSearchResults> {
  const query = rawQuery.trim();
  if (query.length < 2) return EMPTY_RESULTS;

  const [employees, leaves, attendance, notifications] = await Promise.all([
    searchEmployees(query, actor),
    searchLeaves(query, actor),
    searchAttendance(query, actor),
    searchNotifications(query, actor),
  ]);

  return { employees, leaves, attendance, notifications };
}

async function searchEmployees(query: string, actor: SessionContext): Promise<SearchHit[]> {
  if (!hasPermission(actor, "employee.manage")) return [];

  const rows = await prisma.employee.findMany({
    where: {
      deletedAt: null,
      OR: [
        { fullName: { contains: query, mode: "insensitive" } },
        { user: { employeeCode: { contains: query, mode: "insensitive" } } },
        { user: { email: { contains: query, mode: "insensitive" } } },
      ],
    },
    select: {
      id: true,
      fullName: true,
      department: { select: { name: true } },
      user: { select: { employeeCode: true } },
    },
    take: MAX_PER_GROUP,
  });

  return rows.map((e) => ({
    id: e.id,
    title: e.fullName,
    subtitle: [e.user.employeeCode, e.department?.name].filter(Boolean).join(" · "),
    href: `/admin/employees/${e.id}`,
  }));
}

async function searchLeaves(query: string, actor: SessionContext): Promise<SearchHit[]> {
  const isAdmin = hasPermission(actor, "leave.approve");
  if (!isAdmin && !actor.employeeId) return [];

  const rows = await prisma.leave.findMany({
    where: {
      ...(isAdmin ? {} : { employeeId: actor.employeeId! }),
      OR: [
        { reason: { contains: query, mode: "insensitive" } },
        { type: { name: { contains: query, mode: "insensitive" } } },
        ...(isAdmin ? [{ employee: { fullName: { contains: query, mode: "insensitive" as const } } }] : []),
      ],
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      status: true,
      type: { select: { name: true } },
      employee: { select: { fullName: true } },
    },
    orderBy: { createdAt: "desc" },
    take: MAX_PER_GROUP,
  });

  return rows.map((l) => ({
    id: l.id,
    title: isAdmin ? `${l.employee.fullName} — ${l.type.name}` : l.type.name,
    subtitle: `${l.startDate.toISOString().slice(0, 10)} to ${l.endDate.toISOString().slice(0, 10)} · ${l.status}`,
    href: isAdmin ? `/admin/leave/${l.id}` : "/leave",
  }));
}

async function searchAttendance(query: string, actor: SessionContext): Promise<SearchHit[]> {
  const isAdmin = hasPermission(actor, "reports.view.all");
  const isSelf = hasPermission(actor, "reports.view.self");
  if (!isAdmin && !(isSelf && actor.employeeId)) return [];

  const rows = await prisma.attendance.findMany({
    where: {
      ...(isAdmin ? {} : { employeeId: actor.employeeId! }),
      ...(isAdmin ? { employee: { fullName: { contains: query, mode: "insensitive" } } } : {}),
    },
    select: {
      id: true,
      attendanceDate: true,
      status: true,
      employee: { select: { fullName: true } },
    },
    orderBy: { attendanceDate: "desc" },
    take: MAX_PER_GROUP,
  });

  return rows.map((a) => ({
    id: a.id,
    title: a.employee.fullName,
    subtitle: `${a.attendanceDate.toISOString().slice(0, 10)} · ${a.status}`,
    href: `/reports/attendance/${a.id}`,
  }));
}

async function searchNotifications(query: string, actor: SessionContext): Promise<SearchHit[]> {
  const lowerQuery = query.toLowerCase();

  const rows = await prisma.notification.findMany({
    where: { userId: actor.userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const matches = rows.filter((n) => {
    const label = notificationTypeLabel(n.type);
    const details = formatNotificationDetails(n.type, n.payload);
    return label.toLowerCase().includes(lowerQuery) || details.toLowerCase().includes(lowerQuery);
  });

  return matches.slice(0, MAX_PER_GROUP).map((n) => ({
    id: n.id,
    title: notificationTypeLabel(n.type),
    subtitle: formatNotificationDetails(n.type, n.payload),
    href: "/notifications",
  }));
}
