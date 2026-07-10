import { type NextRequest } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { hasPermission } from "@/lib/rbac/permissions";
import { searchEmployees } from "@/services/employeeService";
import { employeeSearchSchema, type EmployeeSearchInput } from "@/lib/validation/employee";
import { reportFormatSchema } from "@/lib/validation/report";
import { toCsv, type ReportColumn } from "@/lib/reports/toCsv";
import { toExcelBuffer } from "@/lib/reports/toExcel";
import { toTablePdfBuffer } from "@/lib/reports/toPdf";

interface ExportRow {
  employeeCode: string;
  fullName: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  shift: string;
  joiningDate: string;
  salary: string;
  status: string;
}

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = employeeSearchSchema.omit({ page: true, pageSize: true }).safeParse(params);
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Invalid filters", { status: 400 });
  }
  const format = reportFormatSchema.parse(params.format);
  const canViewSalary = hasPermission(session, "salary.view");

  try {
    // Pull every matching page (search enforces a 100-row page cap) so the
    // export covers all filtered employees, not just the current page.
    const allItems: Awaited<ReturnType<typeof searchEmployees>>["items"] = [];
    let page = 1;
    const filters: EmployeeSearchInput = { ...parsed.data, page: 1, pageSize: 100 };
    while (true) {
      const result = await searchEmployees({ ...filters, page }, session);
      allItems.push(...result.items);
      if (page * result.pageSize >= result.total) break;
      page++;
    }

    const rows: ExportRow[] = allItems.map((e) => ({
      employeeCode: e.user.employeeCode,
      fullName: e.fullName,
      email: e.user.email,
      phone: e.phone ?? "",
      department: e.department?.name ?? "",
      designation: e.designation?.name ?? "",
      shift: e.shift?.name ?? "",
      joiningDate: e.joiningDate.toISOString().slice(0, 10),
      salary: e.salary != null ? String(e.salary) : "",
      status: e.status,
    }));

    const columns: ReportColumn[] = [
      { key: "employeeCode", label: "Employee ID" },
      { key: "fullName", label: "Full Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "department", label: "Department" },
      { key: "designation", label: "Designation" },
      { key: "shift", label: "Shift" },
      { key: "joiningDate", label: "Joining Date" },
      ...(canViewSalary ? [{ key: "salary", label: "Salary" }] : []),
      { key: "status", label: "Status" },
    ];

    if (format === "pdf") {
      const buffer = await toTablePdfBuffer(rows, columns, "Employee List");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="employees.pdf"',
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, columns, "Employees");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="employees.xlsx"',
        },
      });
    }

    const csv = toCsv(rows, columns);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="employees.csv"',
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to generate export", { status: 403 });
  }
}
