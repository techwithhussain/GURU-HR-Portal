"use client";

import { Download, Calendar, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SalarySlipItem } from "@/types/salarySlip";
import { numberToWordsRupees } from "@/lib/utils/numberToWords";

interface SalarySlipViewProps {
  slip: SalarySlipItem;
  /** Show delete button (admin only) */
  onDelete?: () => void;
  isDeleting?: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(amount);
}

function maskAadhaar(val: string | null | undefined): string {
  if (!val) return "XXXX XXXX 9012";
  const cleaned = val.replace(/\s+/g, "");
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `XXXX XXXX ${last4}`;
  }
  return val;
}

function maskBank(val: string | null | undefined, bankName: string | null | undefined): string {
  const bName = bankName || "HDFC Bank";
  if (!val) return `XXXXXX1234 (${bName})`;
  const cleaned = val.replace(/[^0-9A-Za-z]/g, "");
  if (cleaned.length >= 4) {
    const last4 = cleaned.slice(-4);
    return `XXXXXX${last4} (${bName})`;
  }
  return `${val} (${bName})`;
}

function formatDate(d: unknown): string {
  if (!d) return "15 January 2024";
  const dateObj = d instanceof Date ? d : new Date(String(d));
  if (isNaN(dateObj.getTime())) return "15 January 2024";
  return dateObj.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function SalarySlipView({ slip, onDelete, isDeleting }: SalarySlipViewProps) {
  function handleDownload() {
    window.open(`/api/salary-slips/${slip.id}/pdf`, "_blank");
  }

  // Earnings calculations
  const grossEarnings =
    slip.basicSalary + slip.specialAllowance + slip.nightAllowance + slip.otherAllowance + slip.bonus;

  const earningsRows = [
    { label: "Basic Salary", amount: slip.basicSalary },
    { label: "Special Allowance", amount: slip.specialAllowance },
    { label: "Night Allowance", amount: slip.nightAllowance },
    { label: "Other Allowance", amount: slip.otherAllowance },
    { label: "Bonus / Incentive", amount: slip.bonus },
  ];

  // Deductions calculations
  const lopDaysCount = slip.lopDays ?? 0;
  const lopLabel = lopDaysCount > 0 ? `LOP Deduction (${lopDaysCount} Days)` : "LOP Deduction";

  const totalDeductions =
    slip.pfDeduction +
    slip.profTaxDeduction +
    slip.tdsDeduction +
    slip.lopDeduction +
    slip.otherDeduction;

  const deductionsRows = [
    { label: "Employee PF", amount: slip.pfDeduction },
    { label: "Professional Tax", amount: slip.profTaxDeduction },
    { label: "TDS", amount: slip.tdsDeduction },
    { label: lopLabel, amount: slip.lopDeduction },
    { label: "Other Deductions", amount: slip.otherDeduction },
  ];

  const netPay = slip.netSalary || grossEarnings - totalDeductions;
  const amountInWords = numberToWordsRupees(netPay);

  const monthName = slip.monthName;
  const year = slip.year;
  const payPeriodText = `${monthName} ${year}`;
  const generatedOnText = formatDate(slip.createdAt);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* ── Action Bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Salary Slip — {monthName} {year}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {slip.employeeName} · {slip.employeeCode}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleDownload}
            className="gap-2 bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            <Download className="size-4" />
            Download PDF
          </Button>
          {onDelete && (
            <Button
              variant="destructive"
              onClick={onDelete}
              disabled={isDeleting}
              className="gap-2"
            >
              {isDeleting ? "Deleting…" : "Delete Slip"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Corporate Salary Slip Preview Document ── */}
      <div className="bg-white text-slate-900 border border-slate-200 rounded-xl shadow-xl p-6 sm:p-8 space-y-6 font-sans">
        {/* ── Header ── */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center">
              {/* Real Company Logo */}
              <img
                src="/logo.png"
                alt="Guru Digital Advertising"
                className="h-12 w-auto object-contain"
              />
            </div>
            <div className="h-12 w-px bg-slate-200" />
            <div className="text-xs text-slate-500 leading-relaxed max-w-xs">
              <p>F361, 2nd Floor, Phase 8B, Industrial Area, Sector 74,</p>
              <p>Sahibzada Ajit Singh Nagar, Mohali, Punjab-140307</p>
              <p className="font-semibold text-slate-700 mt-0.5">cris@gurudigitaladvertising.com</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-2xl font-black text-slate-900 tracking-wide uppercase">
              SALARY SLIP
            </h2>
            <div className="inline-flex items-center gap-1.5 text-sm font-bold text-orange-600 mt-1">
              <Calendar className="size-4" />
              {monthName} {year}
            </div>
          </div>
        </div>

        {/* ── Top Grid: Employee Info & Attendance ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Employee Information Card */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <div className="bg-slate-900 text-white px-3 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2">
              <User className="size-3.5 text-orange-400" />
              EMPLOYEE INFORMATION
            </div>
            <div className="p-3 text-xs space-y-1.5">
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Employee Name</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-bold text-slate-900">{slip.employeeName}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Employee ID</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-bold text-slate-900">{slip.employeeCode}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Designation</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{slip.designation || "Executive"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Department</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{slip.department || "Operations"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Date of Joining</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{formatDate(slip.joiningDate)}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Employment Type</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{slip.employmentType || "Full Time"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Location</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{slip.location || "Mohali, Punjab"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">PAN</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{slip.panNumber || "ABCDE1234F"}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Aadhaar Number</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{maskAadhaar(slip.aadhaarNumber)}</span>
              </div>
              <div className="grid grid-cols-12">
                <span className="col-span-4 text-slate-500">Bank Account</span>
                <span className="col-span-1 text-slate-400">:</span>
                <span className="col-span-7 font-semibold text-slate-800">{maskBank(slip.bankAccount, slip.bankName)}</span>
              </div>
            </div>
          </div>

          {/* Pay Period & Attendance Card */}
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50 flex flex-col justify-between">
            <div>
              <div className="bg-slate-900 text-white px-3 py-2 text-xs font-bold tracking-wider uppercase flex items-center gap-2">
                <Calendar className="size-3.5 text-orange-400" />
                PAY PERIOD & ATTENDANCE
              </div>
              <div className="p-3 text-xs space-y-1.5">
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Pay Period</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-bold text-slate-900">{payPeriodText}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Payable Days</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{slip.workingDays || 30}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Present Days</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{slip.presentDays ?? 30}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Paid Leave</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{slip.paidLeaveDays ?? 0}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">LOP Days</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{slip.lopDays ?? 0}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Working Days</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{slip.workingDays || 30}</span>
                </div>
                <div className="grid grid-cols-12">
                  <span className="col-span-4 text-slate-500">Generated On</span>
                  <span className="col-span-1 text-slate-400">:</span>
                  <span className="col-span-7 font-semibold text-slate-800">{generatedOnText}</span>
                </div>
              </div>
            </div>

            {/* Attendance Badges */}
            <div className="p-3 pt-0">
              <div className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-3">
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-slate-100 border border-slate-200">
                  <span className="text-base font-black text-slate-900">{slip.workingDays || 30}</span>
                  <span className="text-[9px] font-bold text-slate-600 tracking-wider uppercase mt-0.5">
                    WORKING DAYS
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-emerald-50 border border-emerald-200">
                  <span className="text-base font-black text-emerald-700">{slip.presentDays ?? 30}</span>
                  <span className="text-[9px] font-bold text-emerald-700 tracking-wider uppercase mt-0.5">
                    PRESENT DAYS
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center p-2 rounded-md bg-red-50 border border-red-200">
                  <span className="text-base font-black text-red-600">{slip.absentDays ?? 0}</span>
                  <span className="text-[9px] font-bold text-red-600 tracking-wider uppercase mt-0.5">
                    ABSENT DAYS
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Middle Grid: Itemized Earnings & Deductions Tables ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Earnings */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-emerald-700 text-white px-3 py-2 text-xs font-bold tracking-wider uppercase flex justify-between items-center">
                <span>EARNINGS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {earningsRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-3 py-2 text-slate-700">
                    <span>{r.label}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-emerald-50 px-3 py-2.5 flex justify-between items-center border-t border-emerald-100">
              <span className="text-xs font-black text-emerald-800 uppercase tracking-wider">
                GROSS EARNINGS
              </span>
              <span className="text-sm font-black text-emerald-700">
                {formatCurrency(grossEarnings)}
              </span>
            </div>
          </div>

          {/* Deductions */}
          <div className="border border-slate-200 rounded-lg overflow-hidden flex flex-col justify-between">
            <div>
              <div className="bg-red-700 text-white px-3 py-2 text-xs font-bold tracking-wider uppercase flex justify-between items-center">
                <span>DEDUCTIONS</span>
                <span>AMOUNT (₹)</span>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {deductionsRows.map((r) => (
                  <div key={r.label} className="flex justify-between px-3 py-2 text-slate-700">
                    <span>{r.label}</span>
                    <span className="font-semibold text-slate-900">{formatCurrency(r.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-red-50 px-3 py-2.5 flex justify-between items-center border-t border-red-100">
              <span className="text-xs font-black text-red-800 uppercase tracking-wider">
                TOTAL DEDUCTIONS
              </span>
              <span className="text-sm font-black text-red-600">
                {formatCurrency(totalDeductions)}
              </span>
            </div>
          </div>
        </div>

        {/* ── Net Pay Prominent Hero Card ── */}
        <div className="bg-slate-900 text-white rounded-xl p-5 sm:p-6 shadow-md flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold tracking-wider text-slate-300 uppercase">
              NET PAY (Take Home)
            </div>
            <div className="text-xs text-slate-400 mt-1">
              Amount in Words: <span className="text-slate-200 font-semibold">{amountInWords}</span>
            </div>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-orange-400">₹</span>
            <span className="text-3xl font-black text-white tracking-tight">
              {formatCurrency(netPay).replace("₹", "").trim()}
            </span>
          </div>
        </div>

        {/* ── Notes & Signatory ── */}
        <div className="flex items-end justify-between gap-6 pt-2">
          <div className="text-xs text-slate-500 space-y-1 max-w-md">
            <p className="font-bold text-slate-800 uppercase">NOTE :</p>
            <p>• This is a computer-generated document and does not require a signature.</p>
            <p>• For any queries, please contact the HR Department.</p>
            <p>• Keep this salary slip for your records and reference.</p>
          </div>

          <div className="text-center min-w-44">
            <p className="text-xs font-bold text-slate-900 mb-8">
              GURU DIGITAL ADVERTISING
            </p>
            <div className="w-36 h-px bg-slate-900 mx-auto mb-1" />
            <p className="text-[11px] text-slate-500">Authorized Signatory</p>
          </div>
        </div>

        {/* ── Bottom Ribbon ── */}
        <div className="bg-slate-900 text-white text-center py-1.5 rounded-md text-xs font-bold tracking-wider">
          Thank you for your contribution!
        </div>
      </div>
    </div>
  );
}
