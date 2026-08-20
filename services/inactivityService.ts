import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { getCompanyTimezone } from "@/services/reportsService";
import { attendanceDateForCheckIn } from "@/lib/attendance/calculations";
import type { SessionContext } from "@/types/session";
import { requirePermission } from "@/lib/rbac/permissions";

// ---------------------------------------------------------------------------
// Agent report input
// ---------------------------------------------------------------------------

export interface AgentReportInput {
  employeeId: string;
  pcName: string;
  inactiveFrom: string;
  inactiveTo: string;
  durationMin: number;
}

export async function recordInactivityEvent(input: AgentReportInput) {
  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);
  const todayAttendance = await prisma.attendance.findFirst({
    where: { employeeId: input.employeeId, attendanceDate: today },
    select: { id: true },
  });
  return prisma.inactivityEvent.create({
    data: {
      employeeId: input.employeeId,
      attendanceId: todayAttendance?.id ?? null,
      pcName: input.pcName,
      inactiveFrom: new Date(input.inactiveFrom),
      inactiveTo: new Date(input.inactiveTo),
      durationMin: input.durationMin,
      status: "PENDING",
    },
  });
}

// ---------------------------------------------------------------------------
// AgentPcSession — single source of truth for employee-PC mapping
// ---------------------------------------------------------------------------

export async function bindPcSession(pcName: string, employeeId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await tx.agentPcSession.deleteMany({ where: { employeeId, NOT: { pcName } } });
    await tx.agentPcSession.upsert({
      where: { pcName },
      create: { pcName, employeeId, loggedInAt: new Date() },
      update: { employeeId, loggedInAt: new Date() },
    });
  });
}

export async function unbindPcSession(args: { pcName?: string; employeeId?: string }): Promise<void> {
  if (args.pcName) {
    await prisma.agentPcSession.deleteMany({ where: { pcName: args.pcName } });
  } else if (args.employeeId) {
    await prisma.agentPcSession.deleteMany({ where: { employeeId: args.employeeId } });
  }
}

// ---------------------------------------------------------------------------
// Agent heartbeat + session query
// ---------------------------------------------------------------------------

export interface AgentSessionResult {
  employeeId: string | null;
  onBreak: boolean;
  thresholdMinutes: number;
}

export async function heartbeatPcSession(pcName: string, agentVersion?: string): Promise<AgentSessionResult> {
  const [setting, pcSession] = await Promise.all([
    prisma.companySetting.findFirst({ select: { inactivityThresholdMinutes: true } }),
    prisma.agentPcSession.findUnique({ where: { pcName }, select: { employeeId: true } }),
  ]);

  const thresholdMinutes = setting?.inactivityThresholdMinutes ?? env.INACTIVITY_THRESHOLD_MINUTES;

  if (pcSession) {
    prisma.agentPcSession
      .update({ where: { pcName }, data: { lastHeartbeatAt: new Date(), ...(agentVersion ? { agentVersion } : {}) } })
      .catch(() => undefined);
  }

  if (!pcSession?.employeeId) return { employeeId: null, onBreak: false, thresholdMinutes };

  const timezone = await getCompanyTimezone();
  const today = attendanceDateForCheckIn(new Date(), timezone);
  const attendance = await prisma.attendance.findFirst({
    where: { employeeId: pcSession.employeeId, attendanceDate: today, checkInAt: { not: null }, checkOutAt: null },
    include: { breaks: { where: { endAt: null }, take: 1, orderBy: { startAt: "desc" } } },
  });

  const onBreak = (attendance?.breaks.length ?? 0) > 0;
  return { employeeId: pcSession.employeeId, onBreak, thresholdMinutes };
}

export async function getAgentSession(pcName: string): Promise<AgentSessionResult> {
  return heartbeatPcSession(pcName);
}

// ---------------------------------------------------------------------------
// Admin: all PC sessions for Activity Monitor
// ---------------------------------------------------------------------------

export interface PcSessionWithStatus {
  id: string;
  pcName: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  loggedInAt: Date;
  lastHeartbeatAt: Date | null;
  agentVersion: string | null;
  agentStatus: "active" | "idle" | "offline";
}

export async function getAllPcSessions(): Promise<PcSessionWithStatus[]> {
  const sessions = await prisma.agentPcSession.findMany({
    include: { employee: { select: { id: true, fullName: true, user: { select: { employeeCode: true } } } } },
    orderBy: { pcName: "asc" },
  });

  const now = new Date();
  const OFFLINE_MS = 5 * 60 * 1000;

  const idleEmployeeIds = new Set(
    (await prisma.inactivityEvent.findMany({
      where: { status: "PENDING", inactiveTo: null, inactiveFrom: { gte: new Date(now.getTime() - 60 * 60 * 1000) } },
      select: { employeeId: true },
      distinct: ["employeeId"],
    })).map((e) => e.employeeId),
  );

  return sessions.map((s) => {
    const age = s.lastHeartbeatAt ? now.getTime() - s.lastHeartbeatAt.getTime() : Infinity;
    const agentStatus: PcSessionWithStatus["agentStatus"] =
      age > OFFLINE_MS ? "offline" : idleEmployeeIds.has(s.employeeId) ? "idle" : "active";
    return {
      id: s.id, pcName: s.pcName, employeeId: s.employeeId,
      employeeName: s.employee.fullName, employeeCode: s.employee.user.employeeCode,
      loggedInAt: s.loggedInAt, lastHeartbeatAt: s.lastHeartbeatAt,
      agentVersion: s.agentVersion, agentStatus,
    };
  });
}

// ---------------------------------------------------------------------------
// Admin: inactivity events (UNCHANGED)
// ---------------------------------------------------------------------------

export async function getInactivityEvents(filters: { status?: "PENDING" | "IGNORED" | "NOTED"; date?: Date } = {}) {
  return prisma.inactivityEvent.findMany({
    where: {
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.date ? { inactiveFrom: { gte: filters.date, lt: new Date(filters.date.getTime() + 86_400_000) } } : {}),
    },
    include: { employee: { select: { id: true, fullName: true, user: { select: { employeeCode: true } } } } },
    orderBy: { inactiveFrom: "desc" },
  });
}

export type InactivityEventWithEmployee = Awaited<ReturnType<typeof getInactivityEvents>>[number];

export async function reviewInactivityEvent(eventId: string, action: "IGNORED" | "NOTED", adminNote: string | null, actor: SessionContext) {
  requirePermission(actor, "attendance.correct");
  return prisma.inactivityEvent.update({
    where: { id: eventId },
    data: { status: action, adminNote: adminNote ?? null, reviewedById: actor.userId, reviewedAt: new Date() },
  });
}
