import "server-only";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/rbac/permissions";
import { recordAudit } from "@/services/auditService";
import { NotFoundError, type RequestMeta } from "@/services/employeeService";
import * as shiftService from "@/services/shiftService";
import type { SessionContext } from "@/types/session";
import type {
  CreateShiftChangeRequestInput,
  ReviewShiftChangeRequestInput,
} from "@/lib/validation/shift";

export async function createShiftChangeRequest(
  input: CreateShiftChangeRequestInput,
  actor: SessionContext,
  meta: RequestMeta = {}
) {
  if (!actor.employeeId) {
    throw new NotFoundError("No employee profile linked to your account");
  }

  const employee = await prisma.employee.findUnique({
    where: { id: actor.employeeId },
    select: { id: true, fullName: true, shiftId: true, status: true, deletedAt: true },
  });

  if (!employee || employee.deletedAt || employee.status !== "ACTIVE") {
    throw new NotFoundError("Active employee profile not found");
  }

  if (!employee.shiftId) {
    throw new Error("You do not have a current shift assigned. Please contact HR.");
  }

  if (employee.shiftId === input.requestedShiftId) {
    throw new Error("You are already assigned to this shift.");
  }

  // Check if there is already a pending request
  const existingPending = await prisma.shiftChangeRequest.findFirst({
    where: {
      employeeId: actor.employeeId,
      status: "PENDING",
    },
  });

  if (existingPending) {
    throw new Error("You already have a pending shift change request. Please wait for admin approval.");
  }

  const targetShift = await prisma.shift.findUnique({
    where: { id: input.requestedShiftId },
  });
  if (!targetShift || !targetShift.isActive) {
    throw new NotFoundError("Requested shift not found or inactive.");
  }

  const request = await prisma.shiftChangeRequest.create({
    data: {
      employeeId: actor.employeeId,
      currentShiftId: employee.shiftId,
      requestedShiftId: input.requestedShiftId,
      reason: input.reason.trim(),
      status: "PENDING",
    },
    include: {
      currentShift: true,
      requestedShift: true,
    },
  });

  await recordAudit({
    actorUserId: actor.userId,
    action: "shift_request.created",
    targetEntity: "shift_change_request",
    targetId: request.id,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      employeeName: employee.fullName,
      currentShift: request.currentShift.name,
      requestedShift: request.requestedShift.name,
      reason: request.reason,
    },
  });

  return request;
}

export async function listMyShiftChangeRequests(actor: SessionContext) {
  if (!actor.employeeId) return [];
  try {
    return await prisma.shiftChangeRequest.findMany({
      where: { employeeId: actor.employeeId },
      include: {
        currentShift: { select: { id: true, name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
        requestedShift: { select: { id: true, name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
        reviewedBy: { select: { id: true, employeeCode: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });
  } catch (err) {
    console.error("listMyShiftChangeRequests error:", err);
    return [];
  }
}

export async function listAllShiftChangeRequestsForAdmin(status?: "PENDING" | "APPROVED" | "REJECTED") {
  try {
    return await prisma.shiftChangeRequest.findMany({
      where: status ? { status } : undefined,
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            user: { select: { employeeCode: true, email: true } },
            department: { select: { name: true } },
            designation: { select: { name: true } },
          },
        },
        currentShift: { select: { id: true, name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
        requestedShift: { select: { id: true, name: true, startMinutesOfDay: true, endMinutesOfDay: true } },
        reviewedBy: { select: { id: true, employeeCode: true, email: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
  } catch (err) {
    console.error("listAllShiftChangeRequestsForAdmin error:", err);
    return [];
  }
}


export async function getPendingShiftRequestsCount() {
  return prisma.shiftChangeRequest.count({
    where: { status: "PENDING" },
  });
}

export async function reviewShiftChangeRequest(
  requestId: string,
  input: ReviewShiftChangeRequestInput,
  actor: SessionContext,
  meta: RequestMeta = {}
) {
  requirePermission(actor, "employee.manage");

  const request = await prisma.shiftChangeRequest.findUnique({
    where: { id: requestId },
    include: {
      employee: { select: { id: true, fullName: true, shiftId: true } },
      requestedShift: { select: { id: true, name: true } },
    },
  });

  if (!request) throw new NotFoundError("Shift change request not found");
  if (request.status !== "PENDING") {
    throw new Error(`This request has already been ${request.status.toLowerCase()}`);
  }

  const updated = await prisma.shiftChangeRequest.update({
    where: { id: requestId },
    data: {
      status: input.status,
      adminNote: input.adminNote?.trim() || null,
      reviewedByUserId: actor.userId,
      reviewedAt: new Date(),
    },
  });

  // If approved, automatically apply the shift change to the employee
  if (input.status === "APPROVED") {
    await shiftService.assignEmployeeShift(
      request.employeeId,
      request.requestedShiftId,
      actor,
      meta
    );
  }

  await recordAudit({
    actorUserId: actor.userId,
    action: `shift_request.${input.status.toLowerCase()}`,
    targetEntity: "shift_change_request",
    targetId: requestId,
    ip: meta.ip,
    userAgent: meta.userAgent,
    metadata: {
      employeeName: request.employee.fullName,
      requestedShift: request.requestedShift.name,
      adminNote: input.adminNote,
    },
  });

  return updated;
}
