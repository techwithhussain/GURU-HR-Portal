ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "windowsUsername" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "employees_windowsUsername_key" ON "employees"("windowsUsername");

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), 'windows_username_manual', NOW(), '20260807040000_add_windows_username', NULL, NULL, NOW(), 1);
