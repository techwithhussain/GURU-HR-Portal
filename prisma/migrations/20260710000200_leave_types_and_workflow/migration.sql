
-- AlterEnum
ALTER TYPE "LeaveStatus" ADD VALUE 'CANCELLED';

-- DropIndex
DROP INDEX "leave_balances_employeeId_type_year_key";

-- AlterTable
ALTER TABLE "leave_balances" DROP COLUMN "type",
ADD COLUMN     "typeId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "leaves" DROP COLUMN "type",
ADD COLUMN     "attachmentFileName" TEXT,
ADD COLUMN     "attachmentPath" TEXT,
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledByUserId" TEXT,
ADD COLUMN     "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "typeId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "leave_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "defaultAllocationDays" DECIMAL(5,1),
    "requiresAttachment" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#f97316',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leave_types_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "leave_types_code_key" ON "leave_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "leave_balances_employeeId_typeId_year_key" ON "leave_balances"("employeeId", "typeId", "year");

-- CreateIndex
CREATE INDEX "leaves_employeeId_status_idx" ON "leaves"("employeeId", "status");

-- CreateIndex
CREATE INDEX "leaves_status_idx" ON "leaves"("status");

-- CreateIndex
CREATE INDEX "leaves_typeId_idx" ON "leaves"("typeId");

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_cancelledByUserId_fkey" FOREIGN KEY ("cancelledByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leave_balances" ADD CONSTRAINT "leave_balances_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "leave_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

