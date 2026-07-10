
-- CreateEnum
CREATE TYPE "EmployeeDocumentType" AS ENUM ('AADHAAR', 'PAN', 'RESUME', 'OFFER_LETTER', 'EXPERIENCE_LETTER', 'OTHER');

-- AlterEnum
ALTER TYPE "EmployeeStatus" ADD VALUE 'RESIGNED';

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "address" TEXT,
ADD COLUMN     "allowances" DECIMAL(12,2),
ADD COLUMN     "deductions" DECIMAL(12,2),
ADD COLUMN     "resignedAt" TIMESTAMP(3),
ADD COLUMN     "salaryType" TEXT;

-- CreateTable
CREATE TABLE "employee_documents" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "type" "EmployeeDocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "storagePath" TEXT NOT NULL,
    "uploadedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "employee_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "employee_documents_employeeId_idx" ON "employee_documents"("employeeId");

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_documents" ADD CONSTRAINT "employee_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

