import "server-only";
import { DateTime } from "luxon";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import * as attendanceService from "@/services/attendanceService";
import type { SessionContext } from "@/types/session";
import type {
  CreateAttendanceCorrectionRequestInput,
  ReviewAttendanceCorrectionRequestInput,
} from "@/lib/validation/attendance";

async function getCompanyTimezone(): Promise<string> {
  const settings = await prisma.companySetting.findFirst({ select: { timezone: true } });
  return settings?.timezone ?? "Asia/Kolkata";
}

export async function createAttendanceCorrectionRequest(
  input: CreateAttendanceCorrectionRequestInput,
  actor: SessionContext,
  meta: RequestMeta = {}
) {
  if (!actor.employeeId) {
    throw new NotFoundError("No employee profile linked to your account");
  }

  const timezone = await getCompanyTimezone();
  const dateObj = DateTime.fromISO(input.attendanceDate, { zone: timezone }).startOf("day").toJSDate();

  const existingPending = await prisma.attendanceCorrectionRequest.findFirst({
    where: {
      employeeId: actor.employeeId,
      attendanceDate: dateObj,
      status: "PENDING",
    },
  });

  if (existingPending) {
    throw new Error("You already have a pending correction request for this date.");
  }

  const checkIn = input.requestedCheckIn ? new Date(input.requestedCheckIn) : null;
  const checkOut = input.requestedCheckOut ? new Date(input.requestedCheckOut) : null;

  const request = await prisma.attendanceCorrectionRequest.create({
    data: {
      employeeId: actor.employeeId,
      attendanceDate: dateObj,
      requestedCheckIn: checkIn,
      requestedCheckOut: checkOut,
      reason: input.reason.trim(),
      status: "PENDING",
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "attendance_correction_request.created",
    targetEntity: "attendance_correction_request",
    targetId: request.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      attendanceDate: input.attendanceDate,
      reason: input.reason,
    },
  });

  return request;
}

export async function listMyAttendanceCorrectionRequests(actor: SessionContext) {
  if (!actor.employeeId) return [];
  try {
    return await prisma.attendanceCorrectionRequest.findMany({
      where: { employeeId: actor.employeeId },
      include: {
        reviewedBy: { select: { id: true, employeeCode: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    });
  } catch (err) {
    console.error("listMyAttendanceCorrectionRequests error:", err);
    return [];
  }
}

export async function listAllAttendanceCorrectionRequestsForAdmin(status?: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    return await prisma.attendanceCorrectionRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            shift: { select: { name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
            user: { select: { employeeCode: true, email: true } },
            department: { select: { name: true } },
          },
        },
        reviewedBy: { select: { id: true, employeeCode: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  } catch (err) {
    console.error("listAllAttendanceCorrectionRequestsForAdmin error:", err);
    return [];
  }
}


export async function getPendingAttendanceCorrectionsCount() {
  return prisma.attendanceCorrectionRequest.count({
    where: { status: "PENDING" },
  });
}

export async function reviewAttendanceCorrectionRequest(
  requestId: string,
  input: ReviewAttendanceCorrectionRequestInput,
  actor: SessionContext,
  meta: RequestMeta = {}
) {
  requirePermission(actor, "attendance.correct");

  const request = await prisma.attendanceCorrectionRequest.findUnique({
    where: { id: requestId },
    include: {
      employee: { select: { id: true, fullName: true, shiftId: true } },
    },
  });

  if (!request) throw new NotFoundError("Attendance correction request not found");
  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}`);
  }

  const updated = await prisma.attendanceCorrectionRequest.update({
    where: { id: requestId },
    data: {
      status: input.status,
      adminNote: input.adminNote?.trim() || null,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    },
  });

  if (input.status === "APPROVED") {
    // Find existing attendance or create new row for that date
    let attendanceRow = await prisma.attendance.findUnique({
      where: {
        employeeId_attendanceDate: {
          employeeId: request.employeeId,
          attendanceDate: request.attendanceDate,
        },
      },
    });

    if (!attendanceRow) {
      if (!request.employee.shiftId) {
        throw new Error("Employee has no shift assigned. Please assign a shift first.");
      }
      attendanceRow = await prisma.attendance.create({
        data: {
          employeeId: request.employeeId,
          attendanceDate: request.attendanceDate,
          shiftId: request.employee.shiftId,
          status: "PRESENT",
          checkInAt: request.requestedCheckIn,
          checkOutAt: request.requestedCheckOut,
          correctedByUserId: actor.userId,
          correctionReason: request.reason,
        },
      });
    }

    if (request.requestedCheckIn || request.requestedCheckOut) {
      await attendanceService.correctAttendance(
        attendanceRow.id,
        {
          checkInAt: request.requestedCheckIn ?? undefined,
          checkOutAt: request.requestedCheckOut ?? undefined,
          reason: `Correction Request Approved: ${request.reason}`,
        },
        actor,
        meta
      );
    }
  }

  await recordAudit({
    actorUserId: actor.userId,
    action: `attendance_correction_request.${input.status.toLowerCase()}`,
    targetEntity: "attendance_correction_request",
    targetId: requestId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      employeeName: request.employee.fullName,
      attendanceDate: request.attendanceDate.toISOString(),
      adminNote: input.adminNote,
    },
  });

  return updated;
}
