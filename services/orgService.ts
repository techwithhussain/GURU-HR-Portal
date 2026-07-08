import "server-only";
import { prisma } from "@/lib/prisma";

export async function listDepartments() {
  return prisma.department.findMany({ orderBy: { name: "asc" } });
}

export async function listDesignations() {
  return prisma.designation.findMany({ orderBy: { name: "asc" } });
}

export async function listRoles() {
  return prisma.role.findMany({ orderBy: { name: "asc" } });
}

export async function listEmployees() {
  return prisma.employee.findMany({
    where: { deletedAt: null },
    select: { id: true, fullName: true },
    orderBy: { fullName: "asc" },
  });
}
