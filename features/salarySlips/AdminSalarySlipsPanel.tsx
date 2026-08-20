"use client";

import { useState, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  Eye,
  Trash2,
  FileText,
  ChevronRight,
  IndianRupee,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { deleteSalarySlipAction } from "@/actions/salarySlip.actions";
import { MONTH_NAMES } from "@/types/salarySlip";
import type { SalarySlipItem } from "@/types/salarySlip";

interface AdminSalarySlipsPanelProps {
  initial: SalarySlipItem[];
}

const selectClass =
  "h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function SlipRow({
  slip,
  onDelete,
  isDeleting,
}: {
  slip: SalarySlipItem;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}) {
  const router = useRouter();

  return (
    <tr className="group border-b border-border/50 hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4">
        <div className="font-medium text-sm text-foreground">{slip.employeeName}</div>
        <div className="text-xs text-muted-foreground">{slip.employeeCode}</div>
      </td>
      <td className="py-3 px-4 text-sm text-muted-foreground hidden sm:table-cell">
        {slip.department ?? "—"}
      </td>
      <td className="py-3 px-4">
        <Badge variant="secondary" className="text-xs font-medium">
          {slip.monthName} {slip.year}
        </Badge>
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-foreground hidden md:table-cell">
        {formatCurrency(slip.netSalary)}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5 justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={() => router.push(`/admin/salary-slips/${slip.id}`)}
            title="View slip"
          >
            <Eye className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-primary"
            onClick={() => window.open(`/api/salary-slips/${slip.id}/pdf`, "_blank")}
            title="Download PDF"
          >
            <Download className="size-3.5" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            onClick={() => {
              if (confirm(`Delete ${slip.employeeName}'s slip for ${slip.monthName} ${slip.year}?`)) {
                onDelete(slip.id);
              }
            }}
            disabled={isDeleting}
            title="Delete slip"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function AdminSalarySlipsPanel({ initial }: AdminSalarySlipsPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterMonth, setFilterMonth] = useState("");
  const [filterYear, setFilterYear] = useState("");

  const slips = useMemo(() => {
    return initial.filter((s) => {
      const matchSearch =
        !search ||
        s.employeeName.toLowerCase().includes(search.toLowerCase()) ||
        s.employeeCode.toLowerCase().includes(search.toLowerCase());
      const matchMonth = !filterMonth || s.month === parseInt(filterMonth);
      const matchYear = !filterYear || s.year === parseInt(filterYear);
      return matchSearch && matchMonth && matchYear;
    });
  }, [initial, search, filterMonth, filterYear]);

  function handleDelete(id: string) {
    setDeletingId(id);
    startTransition(async () => {
      try {
        await deleteSalarySlipAction(id);
        router.refresh();
      } finally {
        setDeletingId(null);
      }
    });
  }

  // Stats
  const totalNet = initial.reduce((sum, s) => sum + s.netSalary, 0);
  const uniqueEmployees = new Set(initial.map((s) => s.employeeId)).size;
  const currentYear = new Date().getFullYear();
  const years = Array.from(new Set(initial.map((s) => s.year))).sort((a, b) => b - a);

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Salary Slips</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage and generate monthly salary slips
          </p>
        </div>
        <Button
          onClick={() => router.push("/admin/salary-slips/new")}
          className="gap-2"
        >
          <Plus className="size-4" />
          Generate Slip
        </Button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Slips</p>
                <p className="text-xl font-bold">{initial.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-100">
                <Users className="size-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Employees</p>
                <p className="text-xl font-bold">{uniqueEmployees}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-2 sm:col-span-1">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-lg bg-orange-100">
                <IndianRupee className="size-4 text-orange-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Paid (All)</p>
                <p className="text-lg font-bold">{formatCurrency(totalNet)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters ── */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                placeholder="Search employee…"
                className="pl-9 h-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className={selectClass}
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
            >
              <option value="">All Months</option>
              {MONTH_NAMES.map((name, i) => (
                <option key={name} value={String(i + 1)}>
                  {name}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
            >
              <option value="">All Years</option>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ── */}
      <Card>
        {slips.length === 0 ? (
          <CardContent className="py-16 flex flex-col items-center gap-3 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted">
              <FileText className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium text-foreground">No salary slips found</p>
            <p className="text-sm text-muted-foreground">
              {initial.length === 0
                ? "Generate the first salary slip using the button above."
                : "Try adjusting your filters."}
            </p>
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Employee
                  </th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">
                    Department
                  </th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Period
                  </th>
                  <th className="py-2.5 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Net Pay
                  </th>
                  <th className="py-2.5 px-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {slips.map((slip) => (
                  <SlipRow
                    key={slip.id}
                    slip={slip}
                    onDelete={handleDelete}
                    isDeleting={deletingId === slip.id && isPending}
                  />
                ))}
              </tbody>
            </table>
            <div className="px-4 py-2.5 border-t border-border/40 text-xs text-muted-foreground">
              Showing {slips.length} of {initial.length} slips
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
