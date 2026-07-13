import { type NextRequest } from "next/server";
import { getSessionContext } from "@/services/sessionService";
import { toUserMessage } from "@/lib/errors/toUserMessage";
import { getEmployeeAttendanceDetail } from "@/services/reportsService";
import { reportFormatSchema } from "@/lib/validation/report";
import { toExcelBuffer } from "@/lib/reports/toExcel";
import { toEmployeeDetailPdfBuffer } from "@/lib/reports/toPdf";
import type { ReportColumn } from "@/lib/reports/toCsv";

const SUMMARY_COLUMNS: ReportColumn[] = [
  { key: "field", label: "Field" },
  { key: "value", label: "Value" },
];

export async function GET(request: NextRequest, { params }: { params: Promise<{ attendanceId: string }> }) {
  const session = await getSessionContext();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const { attendanceId } = await params;
  const format = reportFormatSchema.parse(request.nextUrl.searchParams.get("format") ?? undefined);

  try {
    const detail = await getEmployeeAttendanceDetail(attendanceId, session);

    if (format === "pdf") {
      const buffer = await toEmployeeDetailPdfBuffer(detail);
      return new Response(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="attendance-detail-${detail.employee.employeeCode}-${detail.attendance.date}.pdf"`,
        },
      });
    }

    const rows = [
      { field: "Employee ID", value: detail.employee.employeeCode },
      { field: "Full Name", value: detail.employee.fullName },
      { field: "Email", value: detail.employee.email },
      { field: "Department", value: detail.employee.department },
      { field: "Designation", value: detail.employee.designation },
      { field: "Shift", value: detail.employee.shiftName },
      { field: "Date", value: detail.attendance.date },
      { field: "Check In", value: detail.attendance.checkInAt ?? "—" },
      { field: "Check Out", value: detail.attendance.checkOutAt ?? "—" },
      { field: "Working Minutes", value: String(detail.attendance.workingMinutes ?? "—") },
      { field: "Break Minutes", value: String(detail.attendance.breakMinutes ?? "—") },
      { field: "Late Minutes", value: String(detail.attendance.lateMinutes) },
      { field: "Early Exit Minutes", value: String(detail.attendance.earlyExitMinutes) },
      { field: "Overtime Minutes", value: String(detail.attendance.overtimeMinutes) },
      { field: "Status", value: detail.attendance.status },
      ...detail.breaks.map((b, i) => ({
        field: `Break ${i + 1} (${b.type})`,
        value: `${b.startAt} — ${b.endAt ?? "ongoing"} (${b.durationMin ?? "—"} min)`,
      })),
      { field: "Admin Notes", value: detail.notes.adminNotes ?? "—" },
      { field: "Attendance Remarks", value: detail.notes.attendanceRemarks ?? "—" },
    ];

    const buffer = await toExcelBuffer(rows, SUMMARY_COLUMNS, "Attendance Detail");
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="attendance-detail-${detail.employee.employeeCode}-${detail.attendance.date}.xlsx"`,
      },
    });
  } catch (err) {
    return new Response(toUserMessage(err, "Failed to generate report"), {
      status: 403,
    });
  }
}
