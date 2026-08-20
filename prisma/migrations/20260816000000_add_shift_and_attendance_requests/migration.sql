-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "RequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "shift_change_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "currentShiftId" TEXT NOT NULL,
    "requestedShiftId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_change_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "attendance_correction_requests" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceDate" DATE NOT NULL,
    "requestedCheckIn" TIMESTAMP(3),
    "requestedCheckOut" TIMESTAMP(3),
    "reason" TEXT NOT NULL,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "adminNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_correction_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "shift_change_requests_employeeId_idx" ON "shift_change_requests"("employeeId");
CREATE INDEX IF NOT EXISTS "shift_change_requests_status_idx" ON "shift_change_requests"("status");
CREATE INDEX IF NOT EXISTS "shift_change_requests_createdAt_idx" ON "shift_change_requests"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "attendance_correction_requests_employeeId_idx" ON "attendance_correction_requests"("employeeId");
CREATE INDEX IF NOT EXISTS "attendance_correction_requests_status_idx" ON "attendance_correction_requests"("status");
CREATE INDEX IF NOT EXISTS "attendance_correction_requests_attendanceDate_idx" ON "attendance_correction_requests"("attendanceDate");

-- AddForeignKey
DO $$ BEGIN
    ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_currentShiftId_fkey" FOREIGN KEY ("currentShiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_requestedShiftId_fkey" FOREIGN KEY ("requestedShiftId") REFERENCES "shifts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "shift_change_requests" ADD CONSTRAINT "shift_change_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "attendance_correction_requests" ADD CONSTRAINT "attendance_correction_requests_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
