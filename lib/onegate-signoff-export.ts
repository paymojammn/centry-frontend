/**
 * OneGate sign-off result export — Excel + PDF.
 *
 * Mirrors the structure OneGate's UAT team sent in their observations email:
 *
 *   | Service Name | Test Reference(s) | Status | Observations |
 *
 * One row per deposit / payout service. The "Test Reference(s)" column lists
 * the actual transaction references the merchant generated for that method —
 * so when OneGate replies "I can't find any payment attempts for OZOW EFT",
 * the merchant can point to the exact references in this sheet.
 *
 * Two sheets / two stacked sections — Deposits, Payouts — each carrying the
 * merchant's "will use in production" intent and free-text notes, since
 * those are literally what OneGate asks for in the enablement email.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import type {
  OneGateDepositRow,
  OneGatePayoutRow,
  OneGateSignoffIntent,
  OneGateTestRef,
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

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

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

/** Format refs newest-first as "REF (status)" lines. */
function formatRefsLines(refs: OneGateTestRef[]): string[] {
  if (!refs || refs.length === 0) return ["—"];
  return refs.map((r) => {
    const status = r.status || r.classification || "unknown";
    return `${r.reference || "(no ref)"} · ${status}`;
  });
}

function formatRefsExcelCell(refs: OneGateTestRef[]): string {
  return formatRefsLines(refs).join("\n");
}

/**
 * Auto-generate an "Observations" string when the merchant hasn't written
 * their own notes — mirrors what OneGate's UAT team writes per service so
 * the report is self-explanatory even before the merchant adds context.
 */
function autoObservation(
  paid: number,
  failed: number,
  pending: number,
  total: number,
  intent: OneGateSignoffIntent,
): string {
  if (intent.notes && intent.notes.trim()) return intent.notes.trim();
  if (total === 0) {
    return intent.will_use === false
      ? "Not in scope for production — no testing required."
      : "No test transactions yet.";
  }
  const parts: string[] = [];
  if (paid > 0) parts.push(`${paid} successful`);
  if (failed > 0) parts.push(`${failed} failed`);
  if (pending > 0) parts.push(`${pending} pending`);
  let line = parts.join(", ") + ` (${total} total).`;
  if (paid === 0 && failed > 0) line += " Needs at least one successful transaction.";
  if (intent.will_use === true) line += " Confirmed for production use.";
  else if (intent.will_use === false) line += " Not planned for production.";
  return line;
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export function exportOnegateSignoffExcel(args: OnegateExportArgs) {
  const { context, deposits, payouts } = args;
  const wb = XLSX.utils.book_new();

  const banner = (title: string): (string | number)[][] => [
    [title],
    [`Account: ${context.accountName} (${context.environment})`],
    [`Transactions inspected: ${context.transactionCount}`],
    [`Exported: ${new Date().toISOString()}`],
    [],
  ];

  // -------- Deposits sheet --------
  const depHeader = [
    "Service Name",
    "payment_type",
    "Test Reference(s)",
    "Status",
    "Paid",
    "Failed",
    "Pending",
    "Total",
    "Will use in production",
    "Observations",
  ];
  const depRows = deposits.map((r) => [
    r.label,
    r.payment_type,
    formatRefsExcelCell(r.references),
    badgeLabel(r.status),
    r.paid,
    r.failed,
    r.pending,
    r.total,
    intentLabel(r.intent),
    autoObservation(r.paid, r.failed, r.pending, r.total, r.intent),
  ]);
  const depSheet = XLSX.utils.aoa_to_sheet([
    ...banner("OneGate Sign-off — Deposits (observations table)"),
    depHeader,
    ...depRows,
  ]);
  depSheet["!cols"] = [
    { wch: 36 }, // Service Name
    { wch: 18 }, // payment_type
    { wch: 40 }, // Test refs
    { wch: 14 }, // Status
    { wch: 8 },  // Paid
    { wch: 8 },  // Failed
    { wch: 10 }, // Pending
    { wch: 8 },  // Total
    { wch: 22 }, // Will use
    { wch: 60 }, // Observations
  ];
  // Wrap text in the refs and observations columns so all references stay
  // visible per row (rather than being truncated).
  const refsCol = 2;
  const obsCol = 9;
  const headerRowIdx = banner("").length; // banner emits N rows + header next
  for (let i = 0; i < depRows.length; i++) {
    const rowIdx = headerRowIdx + 1 + i;
    [refsCol, obsCol].forEach((c) => {
      const addr = XLSX.utils.encode_cell({ r: rowIdx, c });
      if (depSheet[addr]) {
        depSheet[addr].s = { alignment: { wrapText: true, vertical: "top" } };
      }
    });
  }
  XLSX.utils.book_append_sheet(wb, depSheet, "Deposits");

  // -------- Payouts sheet --------
  const payHeader = [
    "Service Name",
    "Slug",
    "RSA ID required",
    "Test Reference(s)",
    "Status",
    "Paid",
    "Failed",
    "Pending",
    "Batched",
    "Total",
    "Will use in production",
    "Observations",
  ];
  const payRows = payouts.map((r) => [
    r.name,
    r.slug,
    r.rsa_id_required ? "Yes" : "No",
    formatRefsExcelCell(r.references),
    badgeLabel(r.status),
    r.paid,
    r.failed,
    r.pending,
    r.batched,
    r.total,
    intentLabel(r.intent),
    autoObservation(r.paid, r.failed, r.pending + r.batched, r.total, r.intent),
  ]);
  const paySheet = XLSX.utils.aoa_to_sheet([
    ...banner("OneGate Sign-off — Payouts (OTT REST)"),
    payHeader,
    ...payRows,
  ]);
  paySheet["!cols"] = [
    { wch: 36 }, // Service Name
    { wch: 26 }, // Slug
    { wch: 14 }, // RSA ID
    { wch: 40 }, // Test refs
    { wch: 14 }, // Status
    { wch: 8 },  // Paid
    { wch: 8 },  // Failed
    { wch: 10 }, // Pending
    { wch: 10 }, // Batched
    { wch: 8 },  // Total
    { wch: 22 }, // Will use
    { wch: 60 }, // Observations
  ];
  XLSX.utils.book_append_sheet(wb, paySheet, "Payouts");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${exportFilename(context.environment)}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF (via print dialog) — same table format as Excel
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
  return `<span style="display:inline-block;padding:2px 8px;border-radius:999px;font-size:9.5px;font-weight:600;background:${bg};color:${color}">${esc(label)}</span>`;
}

function intentChip(i: OneGateSignoffIntent): string {
  if (i.will_use === true) {
    return `<span class="chip chip-yes">Will use</span>`;
  }
  if (i.will_use === false) {
    return `<span class="chip chip-no">Not using</span>`;
  }
  return `<span class="chip chip-undecided">Undecided</span>`;
}

function refsCellHtml(refs: OneGateTestRef[]): string {
  if (!refs || refs.length === 0) {
    return `<span class="muted">—</span>`;
  }
  return refs
    .map((r) => {
      const cls =
        r.classification === "paid"
          ? "ref-paid"
          : r.classification === "failed"
          ? "ref-failed"
          : r.classification === "pending"
          ? "ref-pending"
          : "ref-unknown";
      return `<div class="ref-line ${cls}"><code>${esc(r.reference || "—")}</code> <span class="muted">· ${esc(r.status || r.classification)}</span></div>`;
    })
    .join("");
}

function depositRowHtml(r: OneGateDepositRow): string {
  const obs = autoObservation(r.paid, r.failed, r.pending, r.total, r.intent);
  return `
    <tr>
      <td>
        <div class="service-name">${esc(r.label)}</div>
        <div class="muted mono">payment_type=${esc(r.payment_type)}</div>
        ${r.is_voucher ? `<div class="muted">Voucher · amount=0</div>` : ""}
      </td>
      <td class="refs-cell">${refsCellHtml(r.references)}</td>
      <td>${statusPill(r.status)}</td>
      <td class="counts-cell">
        <div>Paid <strong style="color:#047857">${r.paid}</strong></div>
        <div>Failed <strong style="color:#b91c1c">${r.failed}</strong></div>
        <div>Pending <strong>${r.pending}</strong></div>
        <div class="muted">${r.total} total</div>
      </td>
      <td>${intentChip(r.intent)}</td>
      <td class="obs-cell">${esc(obs)}</td>
    </tr>
  `;
}

function payoutRowHtml(r: OneGatePayoutRow): string {
  const obs = autoObservation(r.paid, r.failed, r.pending + r.batched, r.total, r.intent);
  return `
    <tr>
      <td>
        <div class="service-name">${esc(r.name)}</div>
        <div class="muted mono">${esc(r.slug)}</div>
        ${r.rsa_id_required ? `<div class="badge-rsa">RSA ID required</div>` : ""}
      </td>
      <td class="refs-cell">${refsCellHtml(r.references)}</td>
      <td>${statusPill(r.status)}</td>
      <td class="counts-cell">
        <div>Paid <strong style="color:#047857">${r.paid}</strong></div>
        <div>Failed <strong style="color:#b91c1c">${r.failed}</strong></div>
        <div>Pending <strong>${r.pending + r.batched}</strong></div>
        <div class="muted">${r.total} total</div>
      </td>
      <td>${intentChip(r.intent)}</td>
      <td class="obs-cell">${esc(obs)}</td>
    </tr>
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
    @page { size: A4 landscape; margin: 12mm 10mm; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 18px; color: #0f172a; }
    header { border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 14px; }
    h1 { font-size: 16px; margin: 0 0 4px; }
    h2 { font-size: 12.5px; margin: 18px 0 8px; color: #1e293b; }
    .meta { font-size: 10.5px; color: #475569; line-height: 1.55; }
    .meta code { background: #f1f5f9; padding: 1px 4px; border-radius: 3px; font-size: 10px; }
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
    thead th { background: #f8fafc; border-bottom: 2px solid #cbd5e1; text-align: left; padding: 6px 8px; font-size: 10px; color: #334155; font-weight: 600; text-transform: uppercase; letter-spacing: 0.02em; }
    tbody td { border-bottom: 1px solid #e2e8f0; padding: 8px; vertical-align: top; page-break-inside: avoid; }
    .service-name { font-weight: 600; font-size: 11px; color: #0f172a; }
    .mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: 9.5px; }
    .muted { color: #64748b; font-size: 10px; }
    .refs-cell code { font-size: 9.5px; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; color: #1e293b; background: #f1f5f9; padding: 0.5px 4px; border-radius: 3px; }
    .ref-line { line-height: 1.45; padding-left: 8px; border-left: 2px solid transparent; }
    .ref-paid    { border-left-color: #10b981; }
    .ref-failed  { border-left-color: #ef4444; }
    .ref-pending { border-left-color: #f59e0b; }
    .ref-unknown { border-left-color: #94a3b8; }
    .counts-cell div { font-size: 10px; line-height: 1.5; }
    .obs-cell { color: #1e293b; font-size: 10.5px; line-height: 1.45; }
    .chip { display:inline-block; padding:1px 7px; border-radius:999px; font-size:9.5px; font-weight:500; }
    .chip-yes { background:#dbeafe; color:#1e3a8a; }
    .chip-no { background:#f1f5f9; color:#475569; }
    .chip-undecided { background:#fef3c7; color:#92400e; }
    .badge-rsa { display:inline-block; margin-top:3px; padding:1px 6px; border-radius:3px; font-size:9.5px; background:#fef3c7; color:#92400e; font-weight:600; }
    /* Column widths */
    col.c-service { width: 17%; }
    col.c-refs    { width: 26%; }
    col.c-status  { width: 9%; }
    col.c-counts  { width: 11%; }
    col.c-intent  { width: 9%; }
    col.c-obs     { width: 28%; }
  </style>
</head>
<body>
  <header>
    <h1>OneGate Sign-off Report</h1>
    <div class="meta">
      Account: <code>${esc(context.accountName)}</code> · Environment: <code>${esc(context.environment)}</code> · Transactions inspected: <code>${context.transactionCount}</code> · Exported: <code>${new Date().toLocaleString()}</code>
    </div>
  </header>

  <h2>Deposit methods (pay-in)</h2>
  ${
    deposits.length === 0
      ? `<p class="meta">No deposit methods loaded.</p>`
      : `<table>
          <colgroup>
            <col class="c-service" />
            <col class="c-refs" />
            <col class="c-status" />
            <col class="c-counts" />
            <col class="c-intent" />
            <col class="c-obs" />
          </colgroup>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Test Reference(s)</th>
              <th>Status</th>
              <th>Counts</th>
              <th>Will use</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            ${deposits.map(depositRowHtml).join("")}
          </tbody>
        </table>`
  }

  <h2>Payout methods (OTT REST)</h2>
  ${
    payouts.length === 0
      ? `<p class="meta">No payout methods loaded.</p>`
      : `<table>
          <colgroup>
            <col class="c-service" />
            <col class="c-refs" />
            <col class="c-status" />
            <col class="c-counts" />
            <col class="c-intent" />
            <col class="c-obs" />
          </colgroup>
          <thead>
            <tr>
              <th>Service Name</th>
              <th>Test Reference(s)</th>
              <th>Status</th>
              <th>Counts</th>
              <th>Will use</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            ${payouts.map(payoutRowHtml).join("")}
          </tbody>
        </table>`
  }

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
