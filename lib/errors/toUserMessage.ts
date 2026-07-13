import { Prisma } from "@/lib/generated/prisma/client";
import { ConflictError } from "@/services/attendanceService";
import { NotFoundError } from "@/services/employeeService";
import { UnauthorizedError } from "@/services/sessionService";
import { ForbiddenError } from "@/lib/rbac/permissions";

// Field names as they appear in Prisma's P2002 error metadata → a plain
// sentence a non-technical user can act on.
const DUPLICATE_FIELD_MESSAGES: Record<string, string> = {
  employeeCode: "This Employee ID is already in use. Please choose a different one.",
  email: "This email address is already registered to another account.",
  employeeId_typeId_year: "A leave balance for this employee and leave type already exists for this year.",
  employeeId_attendanceDate: "An attendance record already exists for this employee on this date.",
};

// Prisma 7's @prisma/adapter-pg driver nests the actual constraint fields
// under meta.driverAdapterError.cause.constraint.fields (quoted column
// names) instead of the classic flat meta.target array — handle both shapes.
function extractConstraintFields(err: Prisma.PrismaClientKnownRequestError): string[] {
  const target = err.meta?.target;
  if (Array.isArray(target)) return target as string[];
  if (typeof target === "string") return [target];

  const nested = err.meta as
    | { driverAdapterError?: { cause?: { constraint?: { fields?: string[] } } } }
    | undefined;
  const nestedFields = nested?.driverAdapterError?.cause?.constraint?.fields;
  if (Array.isArray(nestedFields)) return nestedFields.map((f) => f.replace(/"/g, ""));

  return [];
}

function duplicateFieldMessage(err: Prisma.PrismaClientKnownRequestError): string {
  for (const field of extractConstraintFields(err)) {
    if (DUPLICATE_FIELD_MESSAGES[field]) return DUPLICATE_FIELD_MESSAGES[field];
  }
  return "That value is already in use. Please choose a different one.";
}

/**
 * Converts any thrown error into a message safe to show a non-technical
 * user (employee or admin) — never leaks a raw Prisma/DB error message.
 * Our own intentional error classes already carry a clean, user-facing
 * message, so those pass through unchanged; everything else (Prisma errors,
 * unexpected bugs, network issues) is mapped to a generic, safe fallback.
 */
export function toUserMessage(err: unknown, fallback: string): string {
  if (
    err instanceof ConflictError ||
    err instanceof NotFoundError ||
    err instanceof UnauthorizedError ||
    err instanceof ForbiddenError
  ) {
    return err.message;
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002") return duplicateFieldMessage(err);
    if (err.code === "P2025") return "The record you're trying to update no longer exists.";
    return fallback;
  }

  return fallback;
}
