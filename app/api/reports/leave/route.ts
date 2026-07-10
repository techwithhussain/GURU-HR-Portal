import { type NextRequest } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { getLeaveReport } from "@/services/reportsService";
import { reportFiltersSchema, reportFormatSchema } from "@/lib/validation/report";
import { toCsv, type ReportColumn } from "@/lib/reports/toCsv";
import { toExcelBuffer } from "@/lib/reports/toExcel";
import { toTablePdfBuffer } from "@/lib/reports/toPdf";

const COLUMNS: ReportColumn[] = [
  { key: "employeeCode", label: "Employee ID" },
  { key: "employeeName", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "type", label: "Type" },
  { key: "startDate", label: "Start Date" },
  { key: "endDate", label: "End Date" },
  { key: "days", label: "Days" },
  { key: "status", label: "Status" },
  { key: "reason", label: "Reason" },
  { key: "decisionReason", label: "Decision Reason" },
];

export async function GET(request: NextRequest) {
  const session = await getSessionContext();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const parsed = reportFiltersSchema.safeParse(params);
  if (!parsed.success) {
    return new Response(parsed.error.issues[0]?.message ?? "Invalid filters", { status: 400 });
  }
  const format = reportFormatSchema.parse(params.format);

  try {
    const rows = await getLeaveReport(parsed.data, session);

    if (format === "pdf") {
      const buffer = await toTablePdfBuffer(rows, COLUMNS, "Leave Report");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="leave-report.pdf"',
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, COLUMNS, "Leave");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="leave-report.xlsx"',
        },
      });
    }

    const csv = toCsv(rows, COLUMNS);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leave-report.csv"',
      },
    });
  } catch (err) {
    return new Response(err instanceof Error ? err.message : "Failed to generate report", {
      status: 403,
    });
  }
}
