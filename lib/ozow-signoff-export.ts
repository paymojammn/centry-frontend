/**
 * Ozow sign-off result export — Excel + PDF.
 *
 * Reuses the xlsx + window.print stack already established in
 * lib/export.ts so we don't pull in jspdf for one screen.
 *
 * Excel: one sheet, one row per sign-off test, full JSON in the last column.
 * PDF:   sectioned report rendered into a new window + window.print, so the
 *        user can save-as-pdf with the JSON readable in a <pre> block.
 *
 * The same payload feeds Ozow's enablement form ("supply JSON response from
 * our API" / "supply PayoutId" line items), so the two formats are kept in
 * lockstep — same fields, same ordering.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import type {
  OzowSignoffRunResponse,
  OzowSignoffTest,
  OzowSignoffWebhookOutcome,
} from "@/lib/ozow-api";

export interface SignoffExportContext {
  accountName: string;
  environment: string;
  bankName?: string;
  branchCode?: string;
  workingPayoutId?: string;
  webhookOutcome?: OzowSignoffWebhookOutcome | null;
}

export interface SignoffExportArgs {
  tests: OzowSignoffTest[];
  results: Record<string, OzowSignoffRunResponse>;
  context: SignoffExportContext;
}

// ---------------------------------------------------------------------------
// Shared row builder — both exports start from this normalized shape.
// ---------------------------------------------------------------------------

interface Row {
  slug: string;
  label: string;
  status: string;
  payoutId: string;
  statusCode: string;
  subStatusCode: string;
  errorMessage: string;
  json: string;
}

function buildRows({ tests, results }: SignoffExportArgs): Row[] {
  return tests.map((t) => {
    const run = results[t.slug];
    if (!run) {
      return {
        slug: t.slug,
        label: t.label,
        status: "Not run",
        payoutId: "",
        statusCode: "",
        subStatusCode: "",
        errorMessage: "",
        json: "",
      };
    }
    const r = run.result;
    const payoutId =
      (r.payout_id as string | undefined) ||
      (r["queried_payout_id"] as string | undefined) ||
      "";
    return {
      slug: t.slug,
      label: t.label,
      status: String(r.status ?? r.exception ?? r.skipped ?? ""),
      payoutId,
      statusCode:
        r.status_code != null && r.status_code !== undefined
          ? String(r.status_code)
          : "",
      subStatusCode:
        r.sub_status_code != null && r.sub_status_code !== undefined
          ? String(r.sub_status_code)
          : "",
      errorMessage: String(r.error_message ?? r.exception ?? ""),
      json: JSON.stringify(r, null, 2),
    };
  });
}

function exportFilename(env: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  return `ozow-signoff-${env}-${ts}`;
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export function exportSignoffExcel(args: SignoffExportArgs) {
  const rows = buildRows(args);
  const { context } = args;

  const header = [
    "Test slug",
    "Label",
    "Status",
    "Status code",
    "Sub-status code",
    "PayoutId",
    "Error message",
    "Raw JSON",
  ];

  const data = rows.map((r) => [
    r.slug,
    r.label,
    r.status,
    r.statusCode,
    r.subStatusCode,
    r.payoutId,
    r.errorMessage,
    r.json,
  ]);

  // Banner rows at the top so context travels with the file.
  const banner: (string | number)[][] = [
    ["Ozow Payouts Sign-off"],
    [`Account: ${context.accountName} (${context.environment})`],
  ];
  if (context.bankName) {
    banner.push([`Test bank: ${context.bankName} (${context.branchCode ?? ""})`]);
  }
  banner.push([`Exported: ${new Date().toISOString()}`]);
  if (context.workingPayoutId) {
    banner.push([`Working PayoutId: ${context.workingPayoutId}`]);
  }
  banner.push([]);

  const aoa: (string | number)[][] = [...banner, header, ...data];

  // Webhook outcome appended at the bottom — Ozow's enablement form needs
  // this to verify the verify/notify-driven items.
  if (context.webhookOutcome?.found) {
    const w = context.webhookOutcome;
    aoa.push([]);
    aoa.push(["Webhook outcome for working PayoutId"]);
    aoa.push(["PayoutId", w.payout_id ?? ""]);
    aoa.push(["Status", w.status ?? ""]);
    aoa.push(["Status code", w.status_code ?? ""]);
    aoa.push(["Sub-status code", w.sub_status_code ?? ""]);
    aoa.push(["Verification received", w.verification_received ? "yes" : "no"]);
    aoa.push(["Callback count", w.callback_count ?? 0]);
    aoa.push(["Completed at", w.completed_at ?? ""]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 26 }, // slug
    { wch: 48 }, // label
    { wch: 22 }, // status
    { wch: 12 }, // status code
    { wch: 16 }, // sub-status
    { wch: 38 }, // payoutId
    { wch: 32 }, // error
    { wch: 80 }, // JSON
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sign-off");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${exportFilename(context.environment)}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF (via print dialog on a new window)
// ---------------------------------------------------------------------------

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function statusPill(status: string): string {
  const s = status.toLowerCase();
  let bg = "#eef2ff",
    color = "#312e81";
  if (s.includes("validationfailed") || s.includes("complete")) {
    bg = "#d1fae5";
    color = "#065f46";
  } else if (s.includes("cancelled") || s.includes("error") || s.includes("exception")) {
    bg = "#fee2e2";
    color = "#991b1b";
  } else if (s.includes("pending") || s.includes("verification")) {
    bg = "#fef3c7";
    color = "#92400e";
  } else if (s === "not run") {
    bg = "#e2e8f0";
    color = "#475569";
  }
  return `<span style="display:inline-block;padding:2px 10px;border-radius:999px;font-size:10px;font-weight:600;background:${bg};color:${color}">${esc(status)}</span>`;
}

function renderTestSection(row: Row): string {
  const payoutLine = row.payoutId
    ? `<div class="kv"><span class="k">PayoutId</span><code>${esc(row.payoutId)}</code></div>`
    : "";
  const statusCodes =
    row.statusCode || row.subStatusCode
      ? `<div class="kv"><span class="k">Status code</span><code>${esc(row.statusCode || "—")} / ${esc(row.subStatusCode || "—")}</code></div>`
      : "";
  const errorLine = row.errorMessage
    ? `<div class="kv"><span class="k">Error</span><span>${esc(row.errorMessage)}</span></div>`
    : "";
  const jsonBlock = row.json
    ? `<pre>${esc(row.json)}</pre>`
    : `<p class="empty">Not run.</p>`;

  return `
    <section class="test">
      <div class="head">
        <div>
          <div class="slug">${esc(row.slug)}</div>
          <h2>${esc(row.label)}</h2>
        </div>
        ${statusPill(row.status)}
      </div>
      ${payoutLine}
      ${statusCodes}
      ${errorLine}
      ${jsonBlock}
    </section>
  `;
}

function renderWebhookOutcome(w: OzowSignoffWebhookOutcome): string {
  if (!w.found) return "";
  return `
    <section class="test">
      <div class="head">
        <div>
          <div class="slug">webhook-outcome</div>
          <h2>Webhook-driven outcomes (verify + notify)</h2>
        </div>
        ${statusPill(w.status ?? "pending")}
      </div>
      <div class="kv"><span class="k">PayoutId</span><code>${esc(w.payout_id ?? "")}</code></div>
      <div class="kv"><span class="k">Status code</span><code>${esc(w.status_code ?? "—")} / ${esc(w.sub_status_code ?? "—")}</code></div>
      <div class="kv"><span class="k">Verification received</span><span>${w.verification_received ? "yes" : "no"}</span></div>
      <div class="kv"><span class="k">Callbacks</span><span>${w.callback_count ?? 0}</span></div>
      <div class="kv"><span class="k">Completed at</span><span>${esc(w.completed_at ?? "—")}</span></div>
      <pre>${esc(JSON.stringify(w, null, 2))}</pre>
    </section>
  `;
}

export function exportSignoffPDF(args: SignoffExportArgs) {
  const rows = buildRows(args);
  const { context } = args;

  const sections = rows.map(renderTestSection).join("");
  const webhookSection = context.webhookOutcome
    ? renderWebhookOutcome(context.webhookOutcome)
    : "";

  const filename = exportFilename(context.environment);

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(filename)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0; padding: 20px; color: #0f172a;
    }
    header { border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; }
    h1 { font-size: 18px; font-weight: 700; margin: 0 0 6px; }
    header .meta { font-size: 11px; color: #475569; line-height: 1.6; }
    header .meta code { background: #f1f5f9; padding: 1px 5px; border-radius: 3px; font-size: 10.5px; }
    section.test {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px 14px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }
    section.test .head {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 12px; margin-bottom: 8px;
    }
    section.test .slug {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px; color: #64748b; margin-bottom: 2px;
    }
    section.test h2 { font-size: 13px; font-weight: 600; margin: 0; }
    .kv { font-size: 11px; margin: 2px 0; display: flex; gap: 8px; }
    .kv .k { color: #64748b; min-width: 130px; }
    .kv code { background: #f8fafc; padding: 1px 5px; border-radius: 3px; font-size: 10.5px; }
    pre {
      background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 10px; line-height: 1.5;
      padding: 10px 12px; border-radius: 6px;
      white-space: pre-wrap; word-break: break-word;
      margin: 8px 0 0;
    }
    .empty { font-size: 11px; color: #94a3b8; font-style: italic; margin: 4px 0 0; }
  </style>
</head>
<body>
  <header>
    <h1>Ozow Payouts — Sign-off Report</h1>
    <div class="meta">
      Account: <code>${esc(context.accountName)}</code> · Environment: <code>${esc(context.environment)}</code><br />
      ${context.bankName ? `Test bank: <code>${esc(context.bankName)}</code> (branch <code>${esc(context.branchCode ?? "")}</code>)<br />` : ""}
      ${context.workingPayoutId ? `Working PayoutId: <code>${esc(context.workingPayoutId)}</code><br />` : ""}
      Exported: <code>${new Date().toLocaleString()}</code>
    </div>
  </header>
  ${sections}
  ${webhookSection}
  <script>window.onload = () => { setTimeout(() => window.print(), 200); };</script>
</body>
</html>`;

  const win = window.open("", "_blank");
  if (!win) {
    // Pop-up blocked — fall back to download as HTML the user can print.
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    saveAs(blob, `${filename}.html`);
    return;
  }
  win.document.write(html);
  win.document.close();
}
