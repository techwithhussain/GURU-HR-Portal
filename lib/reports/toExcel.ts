import ExcelJS from "exceljs";
import type { ReportColumn } from "@/lib/reports/toCsv";

export async function toExcelBuffer<T extends object>(
  rows: T[],
  columns: ReportColumn[],
  sheetName: string,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);
  sheet.columns = columns.map((c) => ({ header: c.label, key: c.key, width: 18 }));
  sheet.addRows(rows);
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
