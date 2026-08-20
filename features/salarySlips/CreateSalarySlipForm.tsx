"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Calculator, User, Calendar, IndianRupee, FileText, Loader2, Sparkles, TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSalarySlipAction, getAttendanceSummaryAction } from "@/actions/salarySlip.actions";
import { MONTH_NAMES } from "@/types/salarySlip";

interface EmployeeOption {
  id: string;
  fullName: string;
  salary: unknown;
  allowances: unknown;
  deductions: unknown;
  department: { name: string } | null;
  designation?: { name: string } | null;
  user: { employeeCode: string };
}

interface CreateSalarySlipFormProps {
  employees: EmployeeOption[];
}

const selectClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

function toNum(v: unknown): number {
  if (v === null || v === undefined) return 0;
  return Number(v);
}

export function CreateSalarySlipForm({ employees }: CreateSalarySlipFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isFetchingAttendance, setIsFetchingAttendance] = useState(false);

  // Form state
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year, setYear] = useState(String(currentYear));

  // Earnings
  const [basicSalary, setBasicSalary] = useState("");
  const [specialAllowance, setSpecialAllowance] = useState("0");
  const [nightAllowance, setNightAllowance] = useState("0");
  const [otherAllowance, setOtherAllowance] = useState("0");
  const [bonus, setBonus] = useState("0");

  // Deductions
  const [pfDeduction, setPfDeduction] = useState("0");
  const [profTaxDeduction, setProfTaxDeduction] = useState("0");
  const [tdsDeduction, setTdsDeduction] = useState("0");
  const [lopDeduction, setLopDeduction] = useState("0");
  const [otherDeduction, setOtherDeduction] = useState("0");

  // Attendance
  const [workingDays, setWorkingDays] = useState("30");
  const [presentDays, setPresentDays] = useState("30");
  const [paidLeaveDays, setPaidLeaveDays] = useState("0");
  const [lopDays, setLopDays] = useState("0");

  const [notes, setNotes] = useState("");

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId),
    [employees, selectedEmployeeId],
  );

  function handleEmployeeChange(empId: string) {
    setSelectedEmployeeId(empId);
    const emp = employees.find((e) => e.id === empId);
    if (emp) {
      const base = toNum(emp.salary) || 15000;
      const allow = toNum(emp.allowances) || 4000;
      const ded = toNum(emp.deductions) || 1800;

      setBasicSalary(String(base));
      setSpecialAllowance(String(allow));
      setPfDeduction(String(ded));
    }
  }

  // Fetch Attendance Summary automatically when employee & month/year change
  useEffect(() => {
    if (!selectedEmployeeId) return;

    let isSubscribed = true;
    async function fetchAttendance() {
      setIsFetchingAttendance(true);
      try {
        const summary = await getAttendanceSummaryAction(
          selectedEmployeeId,
          parseInt(year),
          parseInt(month),
        );
        if (isSubscribed && summary) {
          setWorkingDays(String(summary.workingDays));
          setPresentDays(String(summary.presentDays));
          setPaidLeaveDays(String(summary.paidLeaveDays));
          setLopDays(String(summary.lopDays));

          // Auto-calculate LOP Deduction if LOP days > 0
          if (summary.lopDays > 0) {
            const b = parseFloat(basicSalary) || 15000;
            const sa = parseFloat(specialAllowance) || 0;
            const na = parseFloat(nightAllowance) || 0;
            const oa = parseFloat(otherAllowance) || 0;
            const wDays = summary.workingDays || 30;
            const dailyRate = (b + sa + na + oa) / wDays;
            const autoLop = Math.round(dailyRate * summary.lopDays);
            setLopDeduction(String(autoLop));
          } else {
            setLopDeduction("0");
          }
        }
      } catch (err) {
        console.error("Failed to fetch attendance summary:", err);
      } finally {
        if (isSubscribed) setIsFetchingAttendance(false);
      }
    }

    fetchAttendance();

    return () => {
      isSubscribed = false;
    };
  }, [selectedEmployeeId, month, year]);

  // Recalculate LOP deduction when LOP days or salaries change
  function handleLopDaysChange(val: string) {
    setLopDays(val);
    const lDays = parseFloat(val) || 0;
    if (lDays > 0) {
      const b = parseFloat(basicSalary) || 0;
      const sa = parseFloat(specialAllowance) || 0;
      const na = parseFloat(nightAllowance) || 0;
      const oa = parseFloat(otherAllowance) || 0;
      const wDays = parseFloat(workingDays) || 30;
      const dailyRate = (b + sa + na + oa) / wDays;
      const autoLop = Math.round(dailyRate * lDays);
      setLopDeduction(String(autoLop));
    } else {
      setLopDeduction("0");
    }
  }

  // Calculations
  const grossEarnings = useMemo(() => {
    const b = parseFloat(basicSalary) || 0;
    const sa = parseFloat(specialAllowance) || 0;
    const na = parseFloat(nightAllowance) || 0;
    const oa = parseFloat(otherAllowance) || 0;
    const bo = parseFloat(bonus) || 0;
    return b + sa + na + oa + bo;
  }, [basicSalary, specialAllowance, nightAllowance, otherAllowance, bonus]);

  const totalDeductions = useMemo(() => {
    const pf = parseFloat(pfDeduction) || 0;
    const pt = parseFloat(profTaxDeduction) || 0;
    const tds = parseFloat(tdsDeduction) || 0;
    const lop = parseFloat(lopDeduction) || 0;
    const od = parseFloat(otherDeduction) || 0;
    return pf + pt + tds + lop + od;
  }, [pfDeduction, profTaxDeduction, tdsDeduction, lopDeduction, otherDeduction]);

  const netPay = useMemo(() => {
    return grossEarnings - totalDeductions;
  }, [grossEarnings, totalDeductions]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selectedEmployeeId) {
      setError("Please select an employee.");
      return;
    }
    if (!basicSalary || parseFloat(basicSalary) <= 0) {
      setError("Basic salary must be greater than zero.");
      return;
    }

    startTransition(async () => {
      try {
        const pDays = parseInt(paidLeaveDays) || 0;
        const lDays = parseInt(lopDays) || 0;

        await createSalarySlipAction({
          employeeId: selectedEmployeeId,
          month: parseInt(month),
          year: parseInt(year),

          basicSalary: parseFloat(basicSalary) || 0,
          specialAllowance: parseFloat(specialAllowance) || 0,
          nightAllowance: parseFloat(nightAllowance) || 0,
          otherAllowance: parseFloat(otherAllowance) || 0,
          bonus: parseFloat(bonus) || 0,

          pfDeduction: parseFloat(pfDeduction) || 0,
          profTaxDeduction: parseFloat(profTaxDeduction) || 0,
          tdsDeduction: parseFloat(tdsDeduction) || 0,
          lopDeduction: parseFloat(lopDeduction) || 0,
          otherDeduction: parseFloat(otherDeduction) || 0,

          workingDays: workingDays ? parseInt(workingDays) : 30,
          presentDays: presentDays ? parseInt(presentDays) : 30,
          paidLeaveDays: pDays,
          lopDays: lDays,
          absentDays: pDays + lDays,

          notes: notes.trim() || null,
        });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Something went wrong.";
        if (msg.includes("Unique constraint")) {
          setError(
            `A salary slip for this employee in ${MONTH_NAMES[parseInt(month) - 1]} ${year} already exists.`,
          );
        } else {
          setError(msg);
        }
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive font-medium">
          {error}
        </div>
      )}

      {/* ── Employee & Period Selection ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <User className="size-4 text-orange-500" />
            Employee & Pay Period
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="employeeId">Employee *</Label>
            <select
              id="employeeId"
              className={selectClass}
              value={selectedEmployeeId}
              onChange={(e) => handleEmployeeChange(e.target.value)}
              required
            >
              <option value="">Select employee…</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.fullName} ({emp.user.employeeCode})
                </option>
              ))}
            </select>
            {selectedEmployee?.department && (
              <p className="text-xs text-muted-foreground">
                {selectedEmployee.department.name} {selectedEmployee.designation ? `· ${selectedEmployee.designation.name}` : ""}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="month">Month *</Label>
            <select
              id="month"
              className={selectClass}
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            >
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="year">Year *</Label>
            <select
              id="year"
              className={selectClass}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              required
            >
              {YEARS.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Attendance Summary Section ── */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <Calendar className="size-4 text-orange-500" />
            Pay Period & Attendance
          </CardTitle>
          {isFetchingAttendance && (
            <span className="text-xs text-orange-600 flex items-center gap-1 font-medium">
              <Loader2 className="size-3 animate-spin" /> Fetching attendance data…
            </span>
          )}
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="workingDays">Working Days</Label>
            <Input
              id="workingDays"
              type="number"
              min="1"
              max="31"
              value={workingDays}
              onChange={(e) => setWorkingDays(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="presentDays">Present Days</Label>
            <Input
              id="presentDays"
              type="number"
              min="0"
              max="31"
              value={presentDays}
              onChange={(e) => setPresentDays(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="paidLeaveDays">Paid Leave Days</Label>
            <Input
              id="paidLeaveDays"
              type="number"
              min="0"
              max="31"
              value={paidLeaveDays}
              onChange={(e) => setPaidLeaveDays(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lopDays">LOP Days (Unpaid)</Label>
            <Input
              id="lopDays"
              type="number"
              min="0"
              max="31"
              value={lopDays}
              onChange={(e) => handleLopDaysChange(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Itemized Earnings & Deductions Grid ── */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Earnings */}
        <Card className="border-emerald-200 dark:border-emerald-900/50">
          <CardHeader className="pb-3 bg-emerald-50/50 dark:bg-emerald-950/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
              <TrendingUp className="size-4 text-emerald-600" />
              Itemized Earnings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label htmlFor="basicSalary" className="text-xs font-semibold">Basic Salary (₹) *</Label>
              <Input
                id="basicSalary"
                type="number"
                min="0"
                step="0.01"
                placeholder="15000"
                value={basicSalary}
                onChange={(e) => setBasicSalary(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="specialAllowance" className="text-xs font-semibold">Special Allowance (₹)</Label>
              <Input
                id="specialAllowance"
                type="number"
                min="0"
                step="0.01"
                placeholder="4000"
                value={specialAllowance}
                onChange={(e) => setSpecialAllowance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="nightAllowance" className="text-xs font-semibold">Night Allowance (₹)</Label>
              <Input
                id="nightAllowance"
                type="number"
                min="0"
                step="0.01"
                placeholder="2000"
                value={nightAllowance}
                onChange={(e) => setNightAllowance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="otherAllowance" className="text-xs font-semibold">Other Allowance (₹)</Label>
              <Input
                id="otherAllowance"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={otherAllowance}
                onChange={(e) => setOtherAllowance(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="bonus" className="text-xs font-semibold">Bonus / Incentive (₹)</Label>
              <Input
                id="bonus"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={bonus}
                onChange={(e) => setBonus(e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-between items-center text-sm font-bold text-emerald-700 border-t border-emerald-100 dark:border-emerald-900">
              <span>Gross Earnings Total:</span>
              <span className="text-base font-black">₹{grossEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Deductions */}
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader className="pb-3 bg-red-50/50 dark:bg-red-950/20">
            <CardTitle className="text-sm font-bold flex items-center gap-2 text-red-800 dark:text-red-300">
              <TrendingDown className="size-4 text-red-600" />
              Itemized Deductions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="space-y-1">
              <Label htmlFor="pfDeduction" className="text-xs font-semibold">Employee PF (₹)</Label>
              <Input
                id="pfDeduction"
                type="number"
                min="0"
                step="0.01"
                placeholder="1800"
                value={pfDeduction}
                onChange={(e) => setPfDeduction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="profTaxDeduction" className="text-xs font-semibold">Professional Tax (₹)</Label>
              <Input
                id="profTaxDeduction"
                type="number"
                min="0"
                step="0.01"
                placeholder="200"
                value={profTaxDeduction}
                onChange={(e) => setProfTaxDeduction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="tdsDeduction" className="text-xs font-semibold">TDS (₹)</Label>
              <Input
                id="tdsDeduction"
                type="number"
                min="0"
                step="0.01"
                placeholder="500"
                value={tdsDeduction}
                onChange={(e) => setTdsDeduction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="lopDeduction" className="text-xs font-semibold">
                LOP Deduction (₹) {lopDays !== "0" ? `(${lopDays} Days)` : ""}
              </Label>
              <Input
                id="lopDeduction"
                type="number"
                min="0"
                step="0.01"
                placeholder="900"
                value={lopDeduction}
                onChange={(e) => setLopDeduction(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="otherDeduction" className="text-xs font-semibold">Other Deductions (₹)</Label>
              <Input
                id="otherDeduction"
                type="number"
                min="0"
                step="0.01"
                placeholder="0"
                value={otherDeduction}
                onChange={(e) => setOtherDeduction(e.target.value)}
              />
            </div>

            <div className="pt-2 flex justify-between items-center text-sm font-bold text-red-700 border-t border-red-100 dark:border-red-900">
              <span>Total Deductions Total:</span>
              <span className="text-base font-black">₹{totalDeductions.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Net Pay Prominent Preview Banner ── */}
      <div className="rounded-xl bg-slate-900 text-white p-5 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-orange-500/20 flex items-center justify-center border border-orange-500/30">
            <Calculator className="size-5 text-orange-400" />
          </div>
          <div>
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
              NET PAY (Take Home) PREVIEW
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Gross ₹{grossEarnings.toLocaleString("en-IN")} − Deductions ₹{totalDeductions.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-2xl font-black text-orange-400">
            ₹{netPay.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </span>
        </div>
      </div>

      {/* ── Additional Notes ── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <FileText className="size-4 text-orange-500" />
            Notes (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <textarea
            id="notes"
            className="h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none resize-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            placeholder="Any additional notes for this salary slip…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </CardContent>
      </Card>

      {/* ── Action Buttons ── */}
      <div className="flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/salary-slips")}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending} className="gap-2 min-w-40 bg-slate-900 hover:bg-slate-800 text-white font-bold">
          {isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generating…
            </>
          ) : (
            "Generate Salary Slip"
          )}
        </Button>
      </div>
    </form>
  );
}
