export interface ReportColumn {
  key: string;
  label: string;
}

// Prefixing a leading =, +, -, @, tab, or CR with a single quote neutralizes
// spreadsheet formula/DDE execution (Excel/Sheets both treat a leading quote
// as a "force text" marker and don't render it) — see OWASP's CSV Injection
// guidance. Without this, a field like an employee's name could carry a
// formula payload that runs when an admin opens the exported file in Excel.
function neutralizeFormula(str: string): string {
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

function escapeCsvValue(value: unknown): string {
  const str = neutralizeFormula(value == null ? "" : String(value));
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv<T extends object>(rows: T[], columns: ReportColumn[]): string {
  const header = columns.map((c) => escapeCsvValue(c.label)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => escapeCsvValue((row as Record<string, unknown>)[c.key])).join(","),
  );
  return [header, ...lines].join("\r\n");
}
