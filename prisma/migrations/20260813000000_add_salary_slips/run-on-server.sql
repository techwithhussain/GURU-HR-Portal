-- ============================================================
-- SALARY SLIP FEATURE — ONE-TIME SERVER MIGRATION SCRIPT
-- Run this in Hostinger > Databases > phpMyAdmin (PostgreSQL)
-- OR via SSH: psql -U <user> -d <database> -f this_file.sql
-- ============================================================

-- ─── 1. Create salary_slips table ───────────────────────────
CREATE TABLE IF NOT EXISTS "salary_slips" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basicSalary" DECIMAL(12,2) NOT NULL,
    "allowances" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "deductions" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "bonus" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "netSalary" DECIMAL(12,2) NOT NULL,
    "workingDays" INTEGER,
    "presentDays" INTEGER,
    "absentDays" INTEGER,
    "notes" TEXT,
    "createdByUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_slips_pkey" PRIMARY KEY ("id")
);

-- ─── 2. Indexes ──────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS "salary_slips_employeeId_month_year_key"
    ON "salary_slips"("employeeId", "month", "year");

CREATE INDEX IF NOT EXISTS "salary_slips_employeeId_idx"
    ON "salary_slips"("employeeId");

CREATE INDEX IF NOT EXISTS "salary_slips_year_month_idx"
    ON "salary_slips"("year", "month");

-- ─── 3. Foreign Keys ─────────────────────────────────────────
ALTER TABLE "salary_slips"
    ADD CONSTRAINT IF NOT EXISTS "salary_slips_employeeId_fkey"
    FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "salary_slips"
    ADD CONSTRAINT IF NOT EXISTS "salary_slips_createdByUserId_fkey"
    FOREIGN KEY ("createdByUserId") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 4. Record migration in Prisma's migration history ───────
INSERT INTO "_prisma_migrations" (
    "id", "checksum", "finished_at", "migration_name",
    "logs", "rolled_back_at", "started_at", "applied_steps_count"
)
VALUES (
    gen_random_uuid()::text,
    'manual',
    NOW(),
    '20260813000000_add_salary_slips',
    NULL, NULL, NOW(), 1
)
ON CONFLICT DO NOTHING;

-- ─── 5. Add salary.manage permission ─────────────────────────
INSERT INTO "permissions" ("id", "key", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'salary.manage', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- ─── 6. Add salary.view permission (if missing) ──────────────
INSERT INTO "permissions" ("id", "key", "createdAt", "updatedAt")
VALUES (gen_random_uuid(), 'salary.view', NOW(), NOW())
ON CONFLICT ("key") DO NOTHING;

-- ─── 7. Assign salary.manage to ADMIN role ───────────────────
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'ADMIN' AND p.key = 'salary.manage'
ON CONFLICT DO NOTHING;

-- ─── 8. Assign salary.view to ADMIN role (if missing) ────────
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'ADMIN' AND p.key = 'salary.view'
ON CONFLICT DO NOTHING;

-- ─── 9. Assign salary.view to EMPLOYEE role ──────────────────
INSERT INTO "role_permissions" ("roleId", "permissionId", "createdAt")
SELECT r.id, p.id, NOW()
FROM "roles" r, "permissions" p
WHERE r.name = 'EMPLOYEE' AND p.key = 'salary.view'
ON CONFLICT DO NOTHING;

-- ─── Done! ───────────────────────────────────────────────────
-- After running this, re-login to the HR Portal to refresh
-- your session and get the new permissions.
