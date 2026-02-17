/**
 * Client-side data export utility
 * Supports CSV, Excel (.xlsx), and PDF formats
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

export type ExportFormat = "csv" | "excel" | "pdf";

export interface ExportColumn {
  /** Header label */
  header: string;
  /** Key in the data row, or accessor function */
  accessor: string | ((row: Record<string, unknown>) => string | number);
  /** Optional width (for Excel, in characters) */
  width?: number;
}

/**
 * Export tabular data to CSV, Excel, or PDF.
 *
 * PDF generates a printable HTML table in a new window.
 */
export function exportData(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  format: ExportFormat
) {
  const headers = columns.map((c) => c.header);

  const data = rows.map((row) =>
    columns.map((col) => {
      if (typeof col.accessor === "function") return col.accessor(row);
      return row[col.accessor] ?? "";
    })
  );

  switch (format) {
    case "csv":
      return exportCSV(headers, data, filename);
    case "excel":
      return exportExcel(headers, data, columns, filename);
    case "pdf":
      return exportPDF(headers, data, filename);
  }
}

// ─── CSV ────────────────────────────────────────────────────

function escapeCSV(value: unknown): string {
  const str = String(value ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function exportCSV(
  headers: string[],
  data: (string | number)[][],
  filename: string
) {
  const lines = [
    headers.map(escapeCSV).join(","),
    ...data.map((row) => row.map(escapeCSV).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  saveAs(blob, `${filename}.csv`);
}

// ─── Excel ──────────────────────────────────────────────────

function exportExcel(
  headers: string[],
  data: (string | number)[][],
  columns: ExportColumn[],
  filename: string
) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...data]);

  // Column widths
  ws["!cols"] = columns.map((col) => ({
    wch: col.width ?? Math.max(col.header.length + 2, 14),
  }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Export");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${filename}.xlsx`);
}

// ─── PDF (print-ready HTML) ─────────────────────────────────

function exportPDF(
  headers: string[],
  data: (string | number)[][],
  filename: string
) {
  const headerRow = headers
    .map(
      (h) =>
        `<th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;background:#f8fafc;border-bottom:2px solid #e2e8f0;white-space:nowrap">${h}</th>`
    )
    .join("");

  const bodyRows = data
    .map(
      (row) =>
        `<tr>${row
          .map(
            (cell) =>
              `<td style="padding:6px 12px;font-size:11px;border-bottom:1px solid #f1f5f9">${cell}</td>`
          )
          .join("")}</tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>${filename}</title>
  <style>
    @page { size: landscape; margin: 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; }
    h1 { font-size: 16px; font-weight: 600; margin: 0 0 4px; }
    .meta { font-size: 11px; color: #64748b; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
  </style>
</head>
<body>
  <h1>${filename}</h1>
  <p class="meta">Exported ${new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })} &bull; ${data.length} records</p>
  <table>
    <thead><tr>${headerRow}</tr></thead>
    <tbody>${bodyRows}</tbody>
  </table>
  <script>window.onload=()=>{window.print()}</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
