export interface ReportColumn {
  key: string;
  label: string;
}

function escapeCsvValue(value: unknown): string {
  const str = value == null ? "" : String(value);
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
