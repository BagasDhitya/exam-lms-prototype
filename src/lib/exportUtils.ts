import * as XLSX from "xlsx";

export interface SpreadsheetRow {
  [key: string]: string | number;
}

export function exportToCsv(filename: string, rows: SpreadsheetRow[]): void {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(","),
    ...rows.map((row) =>
      headers
        .map((h) => `"${String(row[h] ?? "").replace(/"/g, '""')}"`)
        .join(","),
    ),
  ];
  const blob = new Blob([csvLines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportToXlsx(filename: string, rows: SpreadsheetRow[]): void {
  if (!rows.length) return;
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Ujian");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}
