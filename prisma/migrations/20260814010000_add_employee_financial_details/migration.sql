-- AlterTable: Add financial and statutory fields to employees table
ALTER TABLE "employees"
  ADD COLUMN IF NOT EXISTS "panNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "aadhaarNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "bankAccount" TEXT,
  ADD COLUMN IF NOT EXISTS "bankName" TEXT;
