-- CreateEnum
CREATE TYPE "OvertimeStatus" AS ENUM ('ACTIVE', 'COMPLETED');

-- CreateTable
CREATE TABLE "overtime_sessions" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "durationMin" INTEGER,
    "status" "OvertimeStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "overtime_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "overtime_sessions_employeeId_idx" ON "overtime_sessions"("employeeId");

-- CreateIndex
CREATE INDEX "overtime_sessions_attendanceId_idx" ON "overtime_sessions"("attendanceId");

-- AddForeignKey
ALTER TABLE "overtime_sessions" ADD CONSTRAINT "overtime_sessions_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "overtime_sessions" ADD CONSTRAINT "overtime_sessions_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "attendance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
