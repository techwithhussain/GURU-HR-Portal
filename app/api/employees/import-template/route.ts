import { toCsv, type ReportColumn } from "@/lib/reports/toCsv";
import { EMPLOYEE_IMPORT_HEADER } from "@/lib/validation/employeeImport";

const COLUMNS: ReportColumn[] = EMPLOYEE_IMPORT_HEADER.map((key) => ({ key, label: key }));

const EXAMPLE_ROW: Record<string, string> = {
  employeeCode: "EMP1001",
  email: "jane.doe@example.com",
  fullName: "Jane Doe",
  phone: "9876543210",
  roleName: "EMPLOYEE",
  departmentName: "Engineering",
  designationName: "Software Engineer",
  shiftName: "Day Shift",
  joiningDate: "2026-01-15",
  salary: "50000",
  emergencyContact: "9123456789",
};

export async function GET() {
  const csv = toCsv([EXAMPLE_ROW], COLUMNS);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="employee-import-template.csv"',
    },
  });
}
