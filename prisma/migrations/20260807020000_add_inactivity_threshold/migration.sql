ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "inactivityThresholdMinutes" INTEGER NOT NULL DEFAULT 20;

INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), 'inactivity_threshold_manual', NOW(), '20260807020000_add_inactivity_threshold', NULL, NULL, NOW(), 1);
