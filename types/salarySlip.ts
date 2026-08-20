// Shared SalarySlip types — safe to import in both Server and Client Components

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export type MonthName = (typeof MONTH_NAMES)[number];

export interface SalarySlipItem {
  id: string;
  month: number; // 1-12
  year: number;
  monthName: string;

  // Earnings
  basicSalary: number;
  specialAllowance: number;
  nightAllowance: number;
  otherAllowance: number;
  allowances: number; // Total allowances
  bonus: number;

  // Deductions
  pfDeduction: number;
  profTaxDeduction: number;
  tdsDeduction: number;
  lopDeduction: number;
  otherDeduction: number;
  deductions: number; // Total deductions

  netSalary: number;

  // Attendance
  workingDays: number | null;
  presentDays: number | null;
  paidLeaveDays: number | null;
  lopDays: number | null;
  absentDays: number | null;

  notes: string | null;
  createdAt: Date;

  // Employee Snapshot & Info
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  department: string | null;
  designation: string | null;
  joiningDate: Date | string | null;
  employmentType: string | null;
  location: string | null;
  panNumber: string | null;
  aadhaarNumber: string | null;
  bankAccount: string | null;
  bankName: string | null;

  createdByName: string;
}

export interface CreateSalarySlipInput {
  employeeId: string;
  month: number;
  year: number;

  basicSalary: number;
  specialAllowance?: number;
  nightAllowance?: number;
  otherAllowance?: number;
  allowances?: number;
  bonus?: number;

  pfDeduction?: number;
  profTaxDeduction?: number;
  tdsDeduction?: number;
  lopDeduction?: number;
  otherDeduction?: number;
  deductions?: number;

  workingDays?: number | null;
  presentDays?: number | null;
  paidLeaveDays?: number | null;
  lopDays?: number | null;
  absentDays?: number | null;
  notes?: string | null;
}
