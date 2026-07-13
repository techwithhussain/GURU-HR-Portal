import { type NextRequest } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getAttendanceReport } from "@/services/reportsService";
import { reportFiltersSchema, reportFormatSchema } from "@/lib/validation/report";
import { toCsv, type ReportColumn } from "@/lib/reports/toCsv";
import { toExcelBuffer } from "@/lib/reports/toExcel";
import { toTablePdfBuffer } from "@/lib/reports/toPdf";

const COLUMNS: ReportColumn[] = [
  { key: "employeeCode", label: "Employee ID" },
  { key: "employeeName", label: "Employee" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "shiftName", label: "Shift" },
  { key: "date", label: "Date" },
  { key: "status", label: "Status" },
  { key: "checkInAt", label: "Check In" },
  { key: "checkOutAt", label: "Check Out" },
  { key: "workingMinutes", label: "Working Minutes" },
  { key: "breakMinutes", label: "Break Minutes" },
  { key: "lateMinutes", label: "Late Minutes" },
  { key: "overtimeMinutes", label: "Overtime Minutes" },
  { key: "earlyExitMinutes", label: "Early Exit Minutes" },
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
    const rows = await getAttendanceReport(parsed.data, session);

    if (format === "pdf") {
      const buffer = await toTablePdfBuffer(rows, COLUMNS, "Attendance Summary Report");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="attendance-report.pdf"',
        },
      });
    }

    if (format === "xlsx") {
      const buffer = await toExcelBuffer(rows, COLUMNS, "Attendance");
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="attendance-report.xlsx"',
        },
      });
    }

    const csv = toCsv(rows, COLUMNS);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="attendance-report.csv"',
      },
    });
  } catch (err) {
    return new Response(toUserMessage(err, "Failed to generate report"), {
      status: 403,
    });
  }
}
