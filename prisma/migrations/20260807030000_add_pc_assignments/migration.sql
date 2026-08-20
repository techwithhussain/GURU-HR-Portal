ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "pcAssignments" JSONB NOT NULL DEFAULT '{}';

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), 'pc_assignments_manual', NOW(), '20260807030000_add_pc_assignments', NULL, NULL, NOW(), 1);
