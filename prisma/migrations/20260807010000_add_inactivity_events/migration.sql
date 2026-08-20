-- CreateEnum
CREATE TYPE "InactivityStatus" AS ENUM ('PENDING', 'IGNORED', 'NOTED');

-- CreateTable
CREATE TABLE "inactivity_events" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceId" TEXT,
    "pcName" TEXT,
    "inactiveFrom" TIMESTAMP(3) NOT NULL,
    "inactiveTo" TIMESTAMP(3),
    "durationMin" INTEGER,
    "status" "InactivityStatus" NOT NULL DEFAULT 'PENDING',
    "adminNote" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inactivity_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "inactivity_events_employeeId_idx" ON "inactivity_events"("employeeId");
CREATE INDEX "inactivity_events_status_idx" ON "inactivity_events"("status");
CREATE INDEX "inactivity_events_createdAt_idx" ON "inactivity_events"("createdAt");

-- AddForeignKey
ALTER TABLE "inactivity_events" ADD CONSTRAINT "inactivity_events_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "inactivity_events" ADD CONSTRAINT "inactivity_events_attendanceId_fkey"
  FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "inactivity_events" ADD CONSTRAINT "inactivity_events_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Prisma migration record
INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count)
VALUES (gen_random_uuid(), 'inactivity_manual', NOW(), '20260807010000_add_inactivity_events', NULL, NULL, NOW(), 1);
