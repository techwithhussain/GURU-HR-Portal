"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Zap,
  Search,
  CheckCircle2,
  Clock,
  User,
  Sparkles,
  Users,
  Filter,
  Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { quickAssignShiftAction } from "@/actions/shift.actions";

export interface EmployeeWithShift {
  id: string;
  fullName: string;
  user: {
    employeeCode: string;
    email: string;
  };
  department: {
    name: string;
  } | null;
  designation: {
    name: string;
  } | null;
  shift: {
    id: string;
    name: string;
    startMinutesOfDay: number;
    endMinutesOfDay: number;
  } | null;
}

export interface ShiftOption {
  id: string;
  name: string;
  startMinutesOfDay: number;
  endMinutesOfDay: number;
}

function formatTime(minutesOfDay: number): string {
  const h24 = Math.floor(minutesOfDay / 60) % 24;
  const m = minutesOfDay % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${m.toString().padStart(2, "0")} ${period}`;
}

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function QuickShiftSwitcherWidget({
  initialEmployees,
  shifts,
}: {
  initialEmployees: EmployeeWithShift[];
  shifts: ShiftOption[];
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithShift[]>(initialEmployees);
  const [activeTab, setActiveTab] = useState<"quick" | "roster">("quick");

  // Quick Switcher state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialEmployees[0]?.id ?? ""
  );
  const [targetShiftId, setTargetShiftId] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [updatingRowId, setUpdatingRowId] = useState<string | null>(null);

  // Roster view search & filter
  const [rosterSearch, setRosterSearch] = useState("");
  const [rosterShiftFilter, setRosterShiftFilter] = useState<string>("ALL");

  const selectedEmployee = useMemo(
    () => employees.find((e) => e.id === selectedEmployeeId) ?? null,
    [employees, selectedEmployeeId]
  );

  const filteredEmployeesForQuick = useMemo(() => {
    if (!searchQuery.trim()) return employees.slice(0, 10);
    const q = searchQuery.toLowerCase().trim();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.user.employeeCode.toLowerCase().includes(q) ||
        e.user.email.toLowerCase().includes(q) ||
        (e.department?.name && e.department.name.toLowerCase().includes(q))
    );
  }, [employees, searchQuery]);

  const filteredRoster = useMemo(() => {
    return employees.filter((e) => {
      const matchesSearch =
        !rosterSearch.trim() ||
        e.fullName.toLowerCase().includes(rosterSearch.toLowerCase().trim()) ||
        e.user.employeeCode.toLowerCase().includes(rosterSearch.toLowerCase().trim()) ||
        (e.department?.name && e.department.name.toLowerCase().includes(rosterSearch.toLowerCase().trim()));

      const matchesShift =
        rosterShiftFilter === "ALL" ||
        (rosterShiftFilter === "NONE" && !e.shift) ||
        e.shift?.id === rosterShiftFilter;

      return matchesSearch && matchesShift;
    });
  }, [employees, rosterSearch, rosterShiftFilter]);

  // Execute shift assignment
  function handleAssignShift(empId: string, shiftId: string) {
    if (!empId || !shiftId) {
      toast.error("Please select an employee and a shift");
      return;
    }

    const emp = employees.find((e) => e.id === empId);
    const shf = shifts.find((s) => s.id === shiftId);

    if (emp?.shift?.id === shiftId) {
      toast.info(`${emp.fullName} is already assigned to ${shf?.name ?? "this shift"}`);
      return;
    }

    setUpdatingRowId(empId);

    // Optimistic UI update
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === empId
          ? {
              ...e,
              shift: shf
                ? {
                    id: shf.id,
                    name: shf.name,
                    startMinutesOfDay: shf.startMinutesOfDay,
                    endMinutesOfDay: shf.endMinutesOfDay,
                  }
                : null,
            }
          : e
      )
    );

    startTransition(async () => {
      const res = await quickAssignShiftAction(empId, shiftId);
      setUpdatingRowId(null);
      if (!res.success) {
        toast.error(res.error ?? "Failed to change shift");
        // Revert on error
        setEmployees(initialEmployees);
        return;
      }
      toast.success(
        `Shift changed! ${res.data?.employeeName ?? "Employee"} ➔ ${res.data?.shiftName ?? "New Shift"}`,
        { icon: <CheckCircle2 className="size-4 text-emerald-500" /> }
      );
      router.refresh();
    });
  }

  return (
    <Card className="relative overflow-hidden rounded-2xl border-0 bg-gradient-to-b from-card to-background shadow-soft ring-1 ring-black/[0.04]">
      {/* Top accent gradient */}
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-brand-orange via-amber-500 to-brand-blue" />

      <CardHeader className="flex flex-col gap-3 pb-4 pt-5 sm:flex-row sm:items-center sm:justify-between border-b border-border/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-brand-orange to-amber-500 text-white shadow-xs">
            <Zap className="size-4.5" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base font-semibold truncate">1-Click Quick Shift Switcher</CardTitle>
              <Badge variant="secondary" className="bg-amber-100/80 text-amber-800 text-[10px] font-semibold">
                Instant Change
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate">
              Change any employee&apos;s shift in 1 click without opening settings
            </p>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-muted/60 p-1 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("quick")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "quick"
                ? "bg-white text-foreground shadow-xs dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Sparkles className="size-3.5" />
            Quick Switcher
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("roster")}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              activeTab === "roster"
                ? "bg-white text-foreground shadow-xs dark:bg-card"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Users className="size-3.5" />
            Live Roster ({employees.length})
          </button>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5">
        {activeTab === "quick" ? (
          /* TAB 1: QUICK SWITCHER PANEL */
          <div className="grid gap-5 lg:grid-cols-12">
            {/* Step 1: Employee Selection Column */}
            <div className="space-y-3 lg:col-span-5 flex flex-col">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  1. Select Employee
                </label>
                <span className="text-[11px] text-muted-foreground">
                  {employees.length} active
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, EMP ID, department..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-xs rounded-xl bg-muted/30"
                />
              </div>

              {/* Quick Pick Employee List */}
              <div className="max-h-[280px] space-y-1.5 overflow-y-auto pr-1 flex-1">
                {filteredEmployeesForQuick.map((emp) => {
                  const isSelected = emp.id === selectedEmployeeId;
                  return (
                    <button
                      key={emp.id}
                      type="button"
                      onClick={() => {
                        setSelectedEmployeeId(emp.id);
                        if (emp.shift?.id) {
                          setTargetShiftId(emp.shift.id);
                        }
                      }}
                      className={`flex w-full items-center justify-between gap-2.5 rounded-xl p-2.5 text-left transition-all ${
                        isSelected
                          ? "border border-brand-blue/40 bg-brand-blue/10 text-foreground ring-1 ring-brand-blue/20"
                          : "border border-transparent hover:border-border hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-[10px] font-bold text-white">
                          {initials(emp.fullName)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold">{emp.fullName}</p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {emp.user.employeeCode} {emp.department ? `• ${emp.department.name}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 max-w-[130px]">
                        {emp.shift ? (
                          <span className="block truncate rounded-md border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
                            {emp.shift.name}
                          </span>
                        ) : (
                          <span className="block truncate rounded-md border border-rose-200 bg-rose-50 px-2 py-0.5 text-[10px] font-medium text-rose-600">
                            No Shift
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {filteredEmployeesForQuick.length === 0 && (
                  <p className="py-8 text-center text-xs text-muted-foreground">
                    No employees matching &ldquo;{searchQuery}&rdquo;
                  </p>
                )}
              </div>
            </div>

            {/* Step 2 & 3: Shift Selection & Action */}
            <div className="flex flex-col justify-between space-y-4 rounded-xl border border-border/60 bg-muted/20 p-4 lg:col-span-7">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    2. Choose New Shift
                  </label>
                  {selectedEmployee && (
                    <span className="text-xs font-medium text-foreground truncate max-w-[200px]">
                      Selected: <strong className="text-brand-blue">{selectedEmployee.fullName}</strong>
                    </span>
                  )}
                </div>

                {/* Selected Employee Info Banner */}
                {selectedEmployee && (
                  <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-background/90 p-3 shadow-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary font-bold text-xs">
                        <User className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight truncate">{selectedEmployee.fullName}</p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          ID: {selectedEmployee.user.employeeCode} • {selectedEmployee.department?.name ?? "General"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] uppercase font-semibold text-muted-foreground">Current Shift</p>
                      <p className="text-xs font-semibold text-brand-orange">
                        {selectedEmployee.shift?.name ?? "None"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Shift Options Scrollable Grid */}
                <div className="grid gap-2 sm:grid-cols-2 max-h-[220px] overflow-y-auto pr-1">
                  {shifts.map((shf) => {
                    const isSelected = targetShiftId === shf.id;
                    const isCurrent = selectedEmployee?.shift?.id === shf.id;

                    return (
                      <button
                        key={shf.id}
                        type="button"
                        onClick={() => setTargetShiftId(shf.id)}
                        className={`group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all ${
                          isSelected
                            ? "border-brand-orange bg-brand-orange/10 shadow-xs ring-1 ring-brand-orange/30"
                            : "border-border/70 bg-background/80 hover:border-brand-blue/50 hover:bg-background"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold text-xs leading-snug truncate">{shf.name}</p>
                            <p className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground truncate">
                              <Clock className="size-3 shrink-0" />
                              {formatTime(shf.startMinutesOfDay)} – {formatTime(shf.endMinutesOfDay)}
                            </p>
                          </div>
                          {isCurrent && (
                            <span className="shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">
                              CURRENT
                            </span>
                          )}
                          {isSelected && !isCurrent && (
                            <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-brand-orange text-white">
                              <CheckCircle2 className="size-3" />
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Action Bar */}
              <div className="pt-3 border-t border-border/40 flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-muted-foreground min-w-0 flex-1">
                  {targetShiftId && selectedEmployee ? (
                    <span className="truncate block">
                      Assign <strong className="text-foreground">{selectedEmployee.fullName}</strong> ➔{" "}
                      <strong className="text-brand-orange">
                        {shifts.find((s) => s.id === targetShiftId)?.name}
                      </strong>
                    </span>
                  ) : (
                    <span>Select an employee and new shift</span>
                  )}
                </div>

                <Button
                  type="button"
                  size="sm"
                  disabled={
                    !selectedEmployeeId ||
                    !targetShiftId ||
                    isPending ||
                    selectedEmployee?.shift?.id === targetShiftId
                  }
                  onClick={() => handleAssignShift(selectedEmployeeId, targetShiftId)}
                  className="bg-gradient-to-r from-brand-orange to-amber-600 hover:opacity-95 text-white shadow-sm font-semibold text-xs px-4 h-9 shrink-0"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Zap className="mr-1.5 size-3.5 fill-current" />
                      1-Click Assign Shift
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 2: LIVE ROSTER TABLE WITH DIRECT INLINE DROPDOWNS */
          <div className="space-y-3">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-1">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Filter by name, ID, dept..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                  className="pl-8.5 h-8.5 text-xs rounded-xl bg-muted/30"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-xs overflow-x-auto max-w-full">
                <Filter className="size-3.5 text-muted-foreground mr-1 shrink-0" />
                <button
                  type="button"
                  onClick={() => setRosterShiftFilter("ALL")}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    rosterShiftFilter === "ALL"
                      ? "bg-foreground text-background"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                >
                  All ({employees.length})
                </button>
                {shifts.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setRosterShiftFilter(s.id)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors truncate max-w-[150px] ${
                      rosterShiftFilter === s.id
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto rounded-xl border border-border/70 max-h-[360px]">
              <table className="w-full text-left text-xs min-w-[580px]">
                <thead className="sticky top-0 bg-muted/90 backdrop-blur-xs text-[11px] font-semibold text-muted-foreground border-b border-border/60">
                  <tr>
                    <th className="py-2.5 px-3">Employee</th>
                    <th className="py-2.5 px-3">Employee ID</th>
                    <th className="py-2.5 px-3">Department</th>
                    <th className="py-2.5 px-3">Current Shift</th>
                    <th className="py-2.5 px-3 text-right">Quick 1-Click Change</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredRoster.map((emp) => {
                    const isUpdatingThis = updatingRowId === emp.id;
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-2 px-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-orange to-brand-orange-light text-[9px] font-bold text-white">
                              {initials(emp.fullName)}
                            </div>
                            <span className="font-semibold text-foreground truncate">{emp.fullName}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-muted-foreground font-mono">{emp.user.employeeCode}</td>
                        <td className="py-2 px-3 text-muted-foreground truncate">{emp.department?.name ?? "—"}</td>
                        <td className="py-2 px-3">
                          {emp.shift ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 border border-emerald-200">
                              <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span className="truncate">{emp.shift.name} ({formatTime(emp.shift.startMinutesOfDay)})</span>
                            </span>
                          ) : (
                            <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600 border border-rose-200">
                              No Shift
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5 justify-end">
                            {isUpdatingThis ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-brand-orange font-medium">
                                <Loader2 className="size-3 animate-spin" />
                                Saving...
                              </span>
                            ) : (
                              <select
                                value={emp.shift?.id ?? ""}
                                onChange={(e) => handleAssignShift(emp.id, e.target.value)}
                                disabled={isPending}
                                className="h-7.5 max-w-[200px] rounded-lg border border-border/80 bg-background px-2 text-xs font-medium shadow-2xs outline-none hover:border-brand-orange focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/30 cursor-pointer truncate"
                              >
                                <option value="" disabled>
                                  Choose Shift
                                </option>
                                {shifts.map((s) => (
                                  <option key={s.id} value={s.id}>
                                    {s.name} ({formatTime(s.startMinutesOfDay)} - {formatTime(s.endMinutesOfDay)})
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRoster.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-muted-foreground text-xs">
                        No employees found matching your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
