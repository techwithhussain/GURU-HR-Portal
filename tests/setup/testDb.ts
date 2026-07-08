import { prisma } from "@/lib/prisma";

const TABLES = [
  "sessions",
  "audit_logs",
  "notifications",
  "leave_balances",
  "leaves",
  "breaks",
  "attendance",
  "employees",
  "role_permissions",
  "users",
  "designations",
  "departments",
  "shifts",
  "permissions",
  "roles",
  "company_settings",
];

/** Wipes all tables — call from an integration test's beforeEach for isolation. */
export async function resetDatabase(): Promise<void> {
  const quoted = TABLES.map((t) => `"${t}"`).join(", ");
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE;`);
}

/** Call from an integration test's afterAll to release the Prisma connection pool. */
export async function closeDb(): Promise<void> {
  await prisma.$disconnect();
}
