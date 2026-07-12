import ExcelJS from "exceljs";
import type { ReportColumn } from "@/lib/reports/toCsv";

// Same rationale as toCsv.ts's neutralizeFormula: a leading =, +, -, @, tab,
// or CR marks a spreadsheet formula/DDE trigger. ExcelJS writes plain JS
// strings as string-typed cells (not formula cells), so this isn't currently
// exploitable via the .xlsx path the way raw CSV is — this is defense-in-depth
// in case that assumption ever changes (e.g. a future re-import feature).
function neutralizeRow<T extends object>(row: T): T {
  const sanitized = { ...row } as Record<string, unknown>;
  for (const key of Object.keys(sanitized)) {
    const value = sanitized[key];
    if (typeof value === "string" && /^[=+\-@\t\r]/.test(value)) {
      sanitized[key] = `'${value}`;
    }
  }
  return sanitized as T;
}

export async function toExcelBuffer<T extends object>(
  rows: T[],
  columns: ReportColumn[],
  sheetName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 18 }));
  sheet.addRows(rows.map(neutralizeRow));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
