/**
 * OneGate sign-off result export — Excel + PDF.
 *
 * Same xlsx + window.print stack as Ozow's exporter. Two sheets in Excel
 * (Deposits, Payouts); two stacked sections in PDF. Each row includes the
 * "will use in production" intent and notes the merchant has set — those
 * answers are literally what OneGate asks for in the enablement email.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import type {
  OneGateDepositRow,
  OneGatePayoutRow,
  OneGateSignoffIntent,
  SignoffBadge,
} from "@/lib/onegate-api";

export interface OnegateExportContext {
  accountName: string;
  environment: string;
  transactionCount: number;
}

export interface OnegateExportArgs {
  deposits: OneGateDepositRow[];
  payouts: OneGatePayoutRow[];
  context: OnegateExportContext;
}

function badgeLabel(b: SignoffBadge): string {
  if (b === "passed") return "Passed";
  if (b === "failures_only") return "Failures only";
  return "Untested";
}

function intentLabel(i: OneGateSignoffIntent): string {
  if (i.will_use === true) return "Yes";
  if (i.will_use === false) return "No";
  return "Undecided";
}

function exportFilename(env: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `onegate-signoff-${env}-${ts}`;
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export function exportOnegateSignoffExcel(args: OnegateExportArgs) {
  const { context, deposits, payouts } = args;

  const wb = XLSX.utils.book_new();

  // -------- Deposits sheet --------
  const depBanner: (string | number)[][] = [
    ["OneGate Sign-off — Deposits"],
    [`Account: ${context.accountName} (${context.environment})`],
    [`Total transactions inspected: ${context.transactionCount}`],
    [`Exported: ${new Date().toISOString()}`],
    [],
  ];
  const depHeader = [
    "Method slug",
    "Label",
    "payment_type",
    "Status",
    "Paid",
    "Failed",
    "Pending",
    "Total",
    "Last paid",
    "Last failed",
    "Will use in production",
    "Notes",
  ];
  const depRows = deposits.map((r) => [
    r.slug,
    r.label,
    r.payment_type,
    badgeLabel(r.status),
    r.paid,
    r.failed,
    r.pending,
    r.total,
    r.last_paid ?? "",
    r.last_failed ?? "",
    intentLabel(r.intent),
    r.intent.notes ?? "",
  ]);
  const depSheet = XLSX.utils.aoa_to_sheet([
    ...depBanner,
    depHeader,
    ...depRows,
  ]);
  depSheet["!cols"] = [
    { wch: 22 }, { wch: 32 }, { wch: 18 }, { wch: 14 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 },
    { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, depSheet, "Deposits");

  // -------- Payouts sheet --------
  const payBanner: (string | number)[][] = [
    ["OneGate Sign-off — Payouts (OTT REST)"],
    [`Account: ${context.accountName} (${context.environment})`],
    [`Exported: ${new Date().toISOString()}`],
    [],
  ];
  const payHeader = [
    "Method slug",
    "Method name",
    "Status",
    "Paid",
    "Failed",
    "Pending",
    "Batched",
    "Total",
    "Will use in production",
    "Notes",
  ];
  const payRows = payouts.map((r) => [
    r.slug,
    r.name,
    badgeLabel(r.status),
    r.paid,
    r.failed,
    r.pending,
    r.batched,
    r.total,
    intentLabel(r.intent),
    r.intent.notes ?? "",
  ]);
  const paySheet = XLSX.utils.aoa_to_sheet([
    ...payBanner,
    payHeader,
    ...payRows,
  ]);
  paySheet["!cols"] = [
    { wch: 28 }, { wch: 32 }, { wch: 14 },
    { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 10 }, { wch: 8 },
    { wch: 22 }, { wch: 50 },
  ];
  XLSX.utils.book_append_sheet(wb, paySheet, "Payouts");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${exportFilename(context.environment)}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF (via print dialog)
// ---------------------------------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function statusPill(b: SignoffBadge): string {
  let bg = "#e2e8f0",
    color = "#475569",
    label = "Untested";
  if (b === "passed") {
    bg = "#d1fae5";
    color = "#065f46";
    label = "Passed";
  } else if (b === "failures_only") {
    bg = "#fee2e2";
    color = "#991b1b";
    label = "Failures only";
  }
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:600;background:${bg};color:${color}">${label}</span>`;
}

function intentPill(i: OneGateSignoffIntent): string {
  if (i.will_use === true) {
    return `<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:500;background:#dbeafe;color:#1e3a8a">Will use in prod</span>`;
  }
  if (i.will_use === false) {
    return `<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:500;background:#f1f5f9;color:#475569">Not using</span>`;
  }
  return `<span style="display:inline-block;padding:1px 8px;border-radius:999px;font-size:10px;font-weight:500;background:#fef3c7;color:#92400e">Undecided</span>`;
}

function depositRow(r: OneGateDepositRow): string {
  return `
    <section class="card">
      <div class="head">
        <div>
          <div class="slug">${esc(r.slug)} · payment_type=${esc(r.payment_type)}</div>
          <h3>${esc(r.label)}</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          ${statusPill(r.status)}
          ${intentPill(r.intent)}
        </div>
      </div>
      ${r.note ? `<div class="note">${esc(r.note)}</div>` : ""}
      <div class="counts">
        <span>Paid: <strong style="color:#047857">${r.paid}</strong></span>
        <span>Failed: <strong style="color:#b91c1c">${r.failed}</strong></span>
        <span>Pending: <strong>${r.pending}</strong></span>
        <span>Total: <strong>${r.total}</strong></span>
      </div>
      ${r.intent.notes ? `<div class="notes-block"><span class="k">Notes</span> ${esc(r.intent.notes)}</div>` : ""}
    </section>
  `;
}

function payoutRow(r: OneGatePayoutRow): string {
  return `
    <section class="card">
      <div class="head">
        <div>
          <div class="slug">${esc(r.slug)}</div>
          <h3>${esc(r.name)}</h3>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;align-items:flex-end">
          ${statusPill(r.status)}
          ${intentPill(r.intent)}
        </div>
      </div>
      <div class="counts">
        <span>Paid: <strong style="color:#047857">${r.paid}</strong></span>
        <span>Failed: <strong style="color:#b91c1c">${r.failed}</strong></span>
        <span>Pending: <strong>${r.pending}</strong></span>
        <span>Batched: <strong>${r.batched}</strong></span>
        <span>Total: <strong>${r.total}</strong></span>
      </div>
      ${r.intent.notes ? `<div class="notes-block"><span class="k">Notes</span> ${esc(r.intent.notes)}</div>` : ""}
    </section>
  `;
}

export function exportOnegateSignoffPDF(args: OnegateExportArgs) {
  const { context, deposits, payouts } = args;
  const filename = exportFilename(context.environment);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(filename)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 20px; color: #0f172a; }
    header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
    h1 { font-size: 18px; margin: 0 0 6px; }
    h2 { font-size: 14px; margin: 20px 0 10px; color: #1e293b; }
    h3 { font-size: 13px; margin: 0; }
    .meta { font-size: 11px; color: #475569; line-height: 1.6; }
    .meta code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 10.5px; }
    .card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin-bottom: 10px; page-break-inside: avoid; }
    .card .head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
    .card .slug { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 10px; color: #64748b; margin-bottom: 2px; }
    .note { font-size: 10.5px; color: #475569; margin-top: 6px; }
    .counts { font-size: 11px; display: flex; gap: 14px; margin-top: 8px; }
    .notes-block { font-size: 11px; margin-top: 8px; padding: 6px 8px; background: #f8fafc; border-radius: 4px; }
    .notes-block .k { color: #64748b; font-weight: 500; margin-right: 6px; }
  </style>
</head>
<body>
  <header>
    <h1>OneGate Sign-off Report</h1>
    <div class="meta">
      Account: <code>${esc(context.accountName)}</code> · Environment: <code>${esc(context.environment)}</code><br />
      Transactions inspected: <code>${context.transactionCount}</code><br />
      Exported: <code>${new Date().toLocaleString()}</code>
    </div>
  </header>
  <h2>Deposit methods</h2>
  ${deposits.map(depositRow).join("")}
  <h2>Payout methods (OTT REST)</h2>
  ${payouts.length ? payouts.map(payoutRow).join("") : `<p class="meta">No payout methods returned.</p>`}
  <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    saveAs(blob, `${filename}.html`);
    return;
  }
  win.document.write(html);
  win.document.close();
}
