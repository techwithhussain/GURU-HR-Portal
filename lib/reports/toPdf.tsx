import { Document, Page, Text, View, StyleSheet, renderToBuffer } from "@react-pdf/renderer";
import type { ReportColumn } from "@/lib/reports/toCsv";
import type { EmployeeAttendanceDetail } from "@/services/reportsService";
import type { getEmployeeProfile } from "@/services/employeeService";

const tableStyles = StyleSheet.create({
  page: { padding: 24, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 14, marginBottom: 12, fontFamily: "Helvetica-Bold" },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111827", paddingVertical: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  cell: { flex: 1, paddingHorizontal: 2 },
  headerCell: { flex: 1, paddingHorizontal: 2, fontFamily: "Helvetica-Bold" },
});

export async function toTablePdfBuffer<T extends object>(
  rows: T[],
  columns: ReportColumn[],
  title: string,
): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" orientation="landscape" style={tableStyles.page}>
        <Text style={tableStyles.title}>{title}</Text>
        <View style={tableStyles.headerRow}>
          {columns.map((c) => (
            <Text key={c.key} style={tableStyles.headerCell}>
              {c.label}
            </Text>
          ))}
        </View>
        {rows.map((row, i) => (
          <View key={i} style={tableStyles.row} wrap={false}>
            {columns.map((c) => (
              <Text key={c.key} style={tableStyles.cell}>
                {String((row as Record<string, unknown>)[c.key] ?? "—")}
              </Text>
            ))}
          </View>
        ))}
      </Page>
    </Document>,
  );
}

const detailStyles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica", color: "#111827" },
  title: { fontSize: 16, marginBottom: 4, fontFamily: "Helvetica-Bold" },
  subtitle: { fontSize: 10, color: "#6b7280", marginBottom: 16 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  field: { width: "33%", marginBottom: 6 },
  fieldLabel: { fontSize: 7.5, color: "#6b7280" },
  fieldValue: { fontSize: 9.5, marginTop: 1 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#111827", paddingVertical: 4 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingVertical: 4 },
  cell: { flex: 1, paddingHorizontal: 2 },
  headerCell: { flex: 1, paddingHorizontal: 2, fontFamily: "Helvetica-Bold" },
  timelineRow: { flexDirection: "row", marginBottom: 3 },
  timelineTime: { width: 70, fontFamily: "Helvetica-Bold" },
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <View style={detailStyles.field}>
      <Text style={detailStyles.fieldLabel}>{label}</Text>
      <Text style={detailStyles.fieldValue}>{value}</Text>
    </View>
  );
}

function minutesLabel(min: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatClock(iso: string | null): string {
  if (!iso) return "—";
  // Explicit timeZone is required here — this renders on the server (no
  // browser locale to fall back on), and without it the server's own system
  // timezone (often UTC in hosting) would be used instead of company local time.
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export async function toEmployeeDetailPdfBuffer(data: EmployeeAttendanceDetail): Promise<Buffer> {
  return renderToBuffer(
    <Document>
      <Page size="A4" style={detailStyles.page}>
        <Text style={detailStyles.title}>Employee Attendance Detail Report</Text>
        <Text style={detailStyles.subtitle}>
          {data.employee.fullName} — {data.attendance.date}
        </Text>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Employee Information</Text>
          <View style={detailStyles.grid}>
            <Field label="Employee ID" value={data.employee.employeeCode} />
            <Field label="Full Name" value={data.employee.fullName} />
            <Field label="Email" value={data.employee.email} />
            <Field label="Phone" value={data.employee.phone ?? "—"} />
            <Field label="Department" value={data.employee.department} />
            <Field label="Designation" value={data.employee.designation} />
            <Field label="Shift" value={data.employee.shiftName} />
            <Field label="Joining Date" value={data.employee.joiningDate} />
            <Field label="Status" value={data.employee.status} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Attendance Information</Text>
          <View style={detailStyles.grid}>
            <Field label="Date" value={data.attendance.date} />
            <Field label="Shift Start" value={formatClock(data.attendance.shiftStart)} />
            <Field label="Shift End" value={formatClock(data.attendance.shiftEnd)} />
            <Field label="Login" value={formatClock(data.attendance.checkInAt)} />
            <Field label="Logout" value={formatClock(data.attendance.checkOutAt)} />
            <Field label="Working Hours" value={minutesLabel(data.attendance.workingMinutes)} />
            <Field label="Break Hours" value={minutesLabel(data.attendance.breakMinutes)} />
            <Field label="Late Minutes" value={String(data.attendance.lateMinutes)} />
            <Field label="Early Exit" value={String(data.attendance.earlyExitMinutes)} />
            <Field label="Overtime" value={String(data.attendance.overtimeMinutes)} />
            <Field label="Status" value={data.attendance.status} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Break History</Text>
          {data.breaks.length === 0 ? (
            <Text>No breaks recorded.</Text>
          ) : (
            <>
              <View style={detailStyles.headerRow}>
                <Text style={detailStyles.headerCell}>Type</Text>
                <Text style={detailStyles.headerCell}>Start</Text>
                <Text style={detailStyles.headerCell}>End</Text>
                <Text style={detailStyles.headerCell}>Duration</Text>
              </View>
              {data.breaks.map((b, i) => (
                <View key={i} style={detailStyles.row}>
                  <Text style={detailStyles.cell}>{b.type}</Text>
                  <Text style={detailStyles.cell}>{formatClock(b.startAt)}</Text>
                  <Text style={detailStyles.cell}>{formatClock(b.endAt)}</Text>
                  <Text style={detailStyles.cell}>{minutesLabel(b.durationMin)}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Complete Timeline</Text>
          {data.timeline.map((event, i) => (
            <View key={i} style={detailStyles.timelineRow}>
              <Text style={detailStyles.timelineTime}>{formatClock(event.time)}</Text>
              <Text>{event.label}</Text>
            </View>
          ))}
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Working Hours Summary</Text>
          <View style={detailStyles.grid}>
            <Field label="Expected Shift Hours" value={minutesLabel(data.summary.expectedMinutes)} />
            <Field label="Actual Working Hours" value={minutesLabel(data.summary.actualSpanMinutes)} />
            <Field label="Break Time" value={minutesLabel(data.summary.breakMinutes)} />
            <Field label="Net Working Hours" value={minutesLabel(data.summary.netWorkingMinutes)} />
            <Field label="Late Time" value={`${data.summary.lateMinutes} min`} />
            <Field label="Early Exit" value={`${data.summary.earlyExitMinutes} min`} />
            <Field label="Overtime" value={`${data.summary.overtimeMinutes} min`} />
            <Field label="Attendance % (this month)" value={`${data.summary.attendancePercentThisMonth}%`} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Device Information</Text>
          <View style={detailStyles.grid}>
            <Field label="Browser" value={data.deviceInfo.loginBrowser ?? "—"} />
            <Field label="Operating System" value={data.deviceInfo.loginOs ?? "—"} />
            <Field label="Login IP" value={data.deviceInfo.loginIp ?? "—"} />
            <Field label="Logout IP" value={data.deviceInfo.logoutIp ?? "—"} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Notes</Text>
          <Text style={detailStyles.fieldLabel}>Admin Notes</Text>
          <Text style={detailStyles.fieldValue}>{data.notes.adminNotes ?? "—"}</Text>
          <Text style={[detailStyles.fieldLabel, { marginTop: 6 }]}>Attendance Remarks</Text>
          <Text style={detailStyles.fieldValue}>{data.notes.attendanceRemarks ?? "—"}</Text>
        </View>
      </Page>
    </Document>,
  );
}

const TIMELINE_LABEL_MAP: Record<string, string> = {
  "employee.created": "Employee Created",
  "employee.updated": "Employee Updated",
  "employee.activated": "Employee Activated",
  "employee.deactivated": "Employee Deactivated",
  "employee.resigned": "Marked Resigned",
  "employee.deleted": "Employee Deleted",
  "employee.document_uploaded": "Document Uploaded",
  "employee.document_deleted": "Document Deleted",
  "user.password_reset_by_admin": "Password Reset by Admin",
  "user.locked_by_admin": "Account Locked",
  "user.unlocked_by_admin": "Account Unlocked",
};

function formatDateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString();
}

export async function toEmployeeProfilePdfBuffer(
  data: Awaited<ReturnType<typeof getEmployeeProfile>>,
): Promise<Buffer> {
  const e = data.employee;
  return renderToBuffer(
    <Document>
      <Page size="A4" style={detailStyles.page}>
        <Text style={detailStyles.title}>Employee Profile</Text>
        <Text style={detailStyles.subtitle}>
          {e.fullName} — {e.user.employeeCode}
        </Text>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Personal Information</Text>
          <View style={detailStyles.grid}>
            <Field label="Employee ID" value={e.user.employeeCode} />
            <Field label="Full Name" value={e.fullName} />
            <Field label="Email" value={e.user.email} />
            <Field label="Phone" value={e.phone ?? "—"} />
            <Field label="Address" value={e.address ?? "—"} />
            <Field label="Emergency Contact" value={e.emergencyContact ?? "—"} />
            <Field label="Joining Date" value={formatDateOnly(new Date(e.joiningDate).toISOString())} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Company Information</Text>
          <View style={detailStyles.grid}>
            <Field label="Department" value={e.department?.name ?? "—"} />
            <Field label="Designation" value={e.designation?.name ?? "—"} />
            <Field label="Shift" value={e.shift?.name ?? "—"} />
            <Field label="Role" value={e.user.role.name} />
            <Field label="Manager" value={e.manager?.fullName ?? "—"} />
            <Field label="Status" value={e.status} />
          </View>
        </View>

        {e.salary != null && (
          <View style={detailStyles.section}>
            <Text style={detailStyles.sectionTitle}>Salary</Text>
            <View style={detailStyles.grid}>
              <Field label="Monthly Salary" value={String(e.salary)} />
              <Field label="Salary Type" value={e.salaryType ?? "—"} />
              <Field label="Allowances" value={e.allowances != null ? String(e.allowances) : "—"} />
              <Field label="Deductions" value={e.deductions != null ? String(e.deductions) : "—"} />
            </View>
          </View>
        )}

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Attendance Summary (this month)</Text>
          <View style={detailStyles.grid}>
            <Field label="Present Days" value={String(data.attendanceSummary.presentDays)} />
            <Field label="Absent Days" value={String(data.attendanceSummary.absentDays)} />
            <Field label="Late Days" value={String(data.attendanceSummary.lateDays)} />
            <Field label="Leave Days" value={String(data.attendanceSummary.leaveDays)} />
            <Field label="Attendance %" value={`${data.attendanceSummary.attendancePercent}%`} />
            <Field label="Working Hours" value={minutesLabel(data.attendanceSummary.workingMinutes)} />
            <Field label="Overtime" value={minutesLabel(data.attendanceSummary.overtimeMinutes)} />
          </View>
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Leave Balances</Text>
          {data.leaveBalances.length === 0 ? (
            <Text>No leave balances set.</Text>
          ) : (
            <>
              <View style={detailStyles.headerRow}>
                <Text style={detailStyles.headerCell}>Type</Text>
                <Text style={detailStyles.headerCell}>Allocated</Text>
                <Text style={detailStyles.headerCell}>Used</Text>
                <Text style={detailStyles.headerCell}>Remaining</Text>
              </View>
              {data.leaveBalances.map((b, i) => (
                <View key={i} style={detailStyles.row}>
                  <Text style={detailStyles.cell}>{b.type.name}</Text>
                  <Text style={detailStyles.cell}>{String(b.allocated)}</Text>
                  <Text style={detailStyles.cell}>{String(b.used)}</Text>
                  <Text style={detailStyles.cell}>{String(Number(b.allocated) - Number(b.used))}</Text>
                </View>
              ))}
            </>
          )}
        </View>

        <View style={detailStyles.section}>
          <Text style={detailStyles.sectionTitle}>Audit Timeline</Text>
          {data.timeline.length === 0 ? (
            <Text>No activity recorded.</Text>
          ) : (
            data.timeline.map((event, i) => (
              <View key={i} style={detailStyles.timelineRow}>
                <Text style={detailStyles.timelineTime}>{formatDateOnly(event.createdAt)}</Text>
                <Text>{TIMELINE_LABEL_MAP[event.action] ?? event.action}</Text>
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>,
  );
}
