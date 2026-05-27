/**
 * OneGate sign-off result export — Excel + PDF.
 *
 * Two-part artifact (mirrors OneGate's UAT email format):
 *
 *   PART 1 — Test cases that were actually run, with per-step request +
 *            response panels. This is what the reviewer needs to see
 *            "we hit your APIs, here's what came back."
 *   PART 2 — Deposit / payout observation tables (per-service summary
 *            with intent + counts + transaction references).
 *
 * Visual style cribbed from the Ozow signoff PDF — hero header, summary
 * stat-pills, card-per-test layout, dark monospace JSON blocks.
 */

import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

import type {
  OneGateDepositRow,
  OneGatePayoutRow,
  OneGateSignoffIntent,
  OneGateSignoffStep,
  OneGateSignoffTestCaseResult,
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
  /** Every test case that has produced a result (any pass/fail). The
   *  export sorts on ``result.test_case`` so display order is stable
   *  even when the user ran them out-of-order. */
  testCases?: OneGateSignoffTestCaseResult[];
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

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function fmtJson(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function fmtRanAt(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function sortedTestCases(
  testCases: OneGateSignoffTestCaseResult[] | undefined,
): OneGateSignoffTestCaseResult[] {
  return [...(testCases ?? [])].sort((a, b) => a.test_case - b.test_case);
}

// ---------------------------------------------------------------------------
// Excel
// ---------------------------------------------------------------------------

export function exportOnegateSignoffExcel(args: OnegateExportArgs) {
  const { context, deposits, payouts, testCases } = args;
  const wb = XLSX.utils.book_new();

  const banner = (title: string): (string | number)[][] => [
    [title],
    [`Account: ${context.accountName} (${context.environment})`],
    [`Transactions inspected: ${context.transactionCount}`],
    [`Exported: ${new Date().toISOString()}`],
    [],
  ];

  // -------- Test cases sheet (request + response per step) --------
  const tcs = sortedTestCases(testCases);
  if (tcs.length > 0) {
    const tcHeader = [
      "Test case",
      "Label",
      "Summary",
      "Ran at",
      "Step",
      "Step label",
      "Step result",
      "Step detail",
      "Request method",
      "Request URL",
      "Request body",
      "Response status",
      "Response latency (ms)",
      "Response body",
    ];
    const tcRows: (string | number)[][] = [];
    for (const tc of tcs) {
      tc.steps.forEach((s, i) => {
        tcRows.push([
          tc.test_case,
          tc.label,
          tc.summary,
          tc.ran_at,
          i + 1,
          s.label,
          s.passed ? "passed" : "failed",
          s.detail,
          s.request?.method ?? "",
          s.request?.url ?? "",
          fmtJson(s.request?.body),
          s.response?.status_code ?? "",
          s.response?.latency_ms ?? "",
          fmtJson(s.response?.body),
        ]);
      });
    }
    const tcSheet = XLSX.utils.aoa_to_sheet([
      ...banner("OneGate Sign-off — Test cases (request / response per step)"),
      tcHeader,
      ...tcRows,
    ]);
    tcSheet["!cols"] = [
      { wch: 10 },  // Test case
      { wch: 38 },  // Label
      { wch: 10 },  // Summary
      { wch: 22 },  // Ran at
      { wch: 6 },   // Step
      { wch: 30 },  // Step label
      { wch: 10 },  // Step result
      { wch: 40 },  // Step detail
      { wch: 8 },   // Method
      { wch: 50 },  // URL
      { wch: 60 },  // Request body
      { wch: 10 },  // Status
      { wch: 12 },  // Latency
      { wch: 60 },  // Response body
    ];
    XLSX.utils.book_append_sheet(wb, tcSheet, "Test cases");
  }

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
    { wch: 36 }, { wch: 18 }, { wch: 40 }, { wch: 14 }, { wch: 8 },
    { wch: 8 },  { wch: 10 }, { wch: 8 },  { wch: 22 }, { wch: 60 },
  ];
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
    { wch: 36 }, { wch: 26 }, { wch: 14 }, { wch: 40 }, { wch: 14 },
    { wch: 8 },  { wch: 8 },  { wch: 10 }, { wch: 10 }, { wch: 8 },
    { wch: 22 }, { wch: 60 },
  ];
  XLSX.utils.book_append_sheet(wb, paySheet, "Payouts");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, `${exportFilename(context.environment)}.xlsx`);
}

// ---------------------------------------------------------------------------
// PDF — hero header → test-case cards (Ozow style) → observation tables
// ---------------------------------------------------------------------------

function summaryPill(passed: boolean): string {
  const bg = passed ? "#d1fae5" : "#fee2e2";
  const color = passed ? "#065f46" : "#991b1b";
  const label = passed ? "Passed" : "Failed";
  return `<span class="pill" style="background:${bg};color:${color}">${label}</span>`;
}

function methodChip(method: string): string {
  const m = (method || "").toUpperCase();
  let bg = "#e0e7ff", color = "#3730a3";
  if (m === "GET") { bg = "#dbeafe"; color = "#1e40af"; }
  else if (m === "POST") { bg = "#dcfce7"; color = "#166534"; }
  else if (m === "PUT" || m === "PATCH") { bg = "#fef3c7"; color = "#92400e"; }
  else if (m === "DELETE") { bg = "#fee2e2"; color = "#991b1b"; }
  return `<span class="method" style="background:${bg};color:${color}">${esc(m || "—")}</span>`;
}

function statusChip(code: number | undefined): string {
  if (code == null) return `<span class="status status-gray">—</span>`;
  const cls =
    code >= 200 && code < 300 ? "status-ok" :
    code >= 300 && code < 400 ? "status-redir" :
    code >= 400 && code < 500 ? "status-client" :
    "status-server";
  return `<span class="status ${cls}">${code}</span>`;
}

function renderStep(s: OneGateSignoffStep, idx: number): string {
  const stepBadge = s.passed
    ? `<span class="step-badge step-pass">✓ Passed</span>`
    : `<span class="step-badge step-fail">✗ Failed</span>`;

  const request = s.request;
  const response = s.response;

  const headerLines = request?.headers
    ? Object.entries(request.headers)
        .map(([k, v]) => `${esc(k)}: ${esc(v)}`)
        .join("\n")
    : "";
  const reqBody = fmtJson(request?.body);
  const respBody = fmtJson(response?.body);
  const latency =
    response?.latency_ms != null ? `${Math.round(response.latency_ms)} ms` : "";

  const requestPanel = request
    ? `
        <div class="panel">
          <div class="panel-head">
            <span class="panel-label">Request</span>
            ${methodChip(request.method)}
            <code class="url">${esc(request.url)}</code>
          </div>
          ${
            headerLines
              ? `<details class="panel-extra"><summary>Headers</summary><pre>${esc(headerLines)}</pre></details>`
              : ""
          }
          ${
            reqBody
              ? `<pre class="panel-body">${esc(reqBody)}</pre>`
              : `<div class="panel-empty">No body</div>`
          }
        </div>
      `
    : `<div class="panel panel-skip">
         <div class="panel-head"><span class="panel-label">Request</span></div>
         <div class="panel-empty">Local check — no HTTP call</div>
       </div>`;

  const responsePanel = response
    ? `
        <div class="panel">
          <div class="panel-head">
            <span class="panel-label">Response</span>
            ${statusChip(response.status_code)}
            ${latency ? `<span class="latency">${esc(latency)}</span>` : ""}
          </div>
          ${
            respBody
              ? `<pre class="panel-body">${esc(respBody)}</pre>`
              : `<div class="panel-empty">No body</div>`
          }
        </div>
      `
    : `<div class="panel panel-skip">
         <div class="panel-head"><span class="panel-label">Response</span></div>
         <div class="panel-empty">No response captured</div>
       </div>`;

  return `
    <div class="step">
      <div class="step-head">
        <div class="step-num">Step ${idx + 1}</div>
        <div class="step-title">${esc(s.label)}</div>
        ${stepBadge}
      </div>
      ${s.detail ? `<div class="step-detail">${esc(s.detail)}</div>` : ""}
      <div class="panels">
        ${requestPanel}
        ${responsePanel}
      </div>
    </div>
  `;
}

function renderTestCaseCard(tc: OneGateSignoffTestCaseResult): string {
  const passedSteps = tc.steps.filter((s) => s.passed).length;
  const failedSteps = tc.steps.length - passedSteps;
  return `
    <article class="tc">
      <header class="tc-head">
        <div class="tc-id">
          <span class="tc-num">TC ${tc.test_case}</span>
          ${summaryPill(tc.summary === "passed")}
        </div>
        <div class="tc-meta">
          <h2 class="tc-label">${esc(tc.label)}</h2>
          <div class="tc-sub">
            ${tc.steps.length} step${tc.steps.length === 1 ? "" : "s"}
            · <span class="tc-pass">${passedSteps} passed</span>
            ${failedSteps > 0 ? ` · <span class="tc-fail">${failedSteps} failed</span>` : ""}
            · ran ${esc(fmtRanAt(tc.ran_at))}
          </div>
        </div>
      </header>
      <div class="tc-steps">
        ${tc.steps.map(renderStep).join("")}
      </div>
    </article>
  `;
}

function intentChip(i: OneGateSignoffIntent): string {
  if (i.will_use === true) return `<span class="chip chip-yes">Will use</span>`;
  if (i.will_use === false) return `<span class="chip chip-no">Not using</span>`;
  return `<span class="chip chip-undecided">Undecided</span>`;
}

function refsCellHtml(refs: OneGateTestRef[]): string {
  if (!refs || refs.length === 0) return `<span class="muted">—</span>`;
  return refs
    .map((r) => {
      const cls =
        r.classification === "paid" ? "ref-paid" :
        r.classification === "failed" ? "ref-failed" :
        r.classification === "pending" ? "ref-pending" : "ref-unknown";
      return `<div class="ref-line ${cls}"><code>${esc(r.reference || "—")}</code> <span class="muted">· ${esc(r.status || r.classification)}</span></div>`;
    })
    .join("");
}

function svcStatusPill(b: SignoffBadge): string {
  let bg = "#e2e8f0", color = "#475569", label = "Untested";
  if (b === "passed") { bg = "#d1fae5"; color = "#065f46"; label = "Passed"; }
  else if (b === "failures_only") { bg = "#fee2e2"; color = "#991b1b"; label = "Failures only"; }
  return `<span class="pill" style="background:${bg};color:${color}">${esc(label)}</span>`;
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
      <td>${svcStatusPill(r.status)}</td>
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
      <td>${svcStatusPill(r.status)}</td>
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
  const { context, deposits, payouts, testCases } = args;
  const filename = exportFilename(context.environment);

  const tcs = sortedTestCases(testCases);
  const tcsPassed = tcs.filter((t) => t.summary === "passed").length;
  const tcsFailed = tcs.length - tcsPassed;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${esc(filename)}</title>
  <style>
    @page { size: A4; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      margin: 0; padding: 18px; color: #0f172a; line-height: 1.45;
    }

    /* Hero */
    .hero {
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      color: #f8fafc;
      border-radius: 12px;
      padding: 22px 26px;
      margin-bottom: 22px;
    }
    .hero h1 {
      font-size: 22px; font-weight: 700; margin: 0 0 4px;
      letter-spacing: -0.01em;
    }
    .hero .subtitle { font-size: 11px; color: #cbd5e1; margin-bottom: 14px; }
    .hero-stats {
      display: flex; gap: 10px; flex-wrap: wrap;
      margin-top: 6px;
    }
    .stat {
      background: rgba(255,255,255,0.08);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 8px;
      padding: 8px 12px;
      min-width: 110px;
    }
    .stat .stat-num { font-size: 18px; font-weight: 700; }
    .stat .stat-label {
      font-size: 9.5px; color: #cbd5e1; text-transform: uppercase;
      letter-spacing: 0.04em; margin-top: 2px;
    }
    .stat.ok .stat-num { color: #6ee7b7; }
    .stat.fail .stat-num { color: #fca5a5; }
    .hero-meta {
      margin-top: 14px;
      font-size: 10.5px; color: #cbd5e1;
      display: flex; flex-wrap: wrap; gap: 14px;
    }
    .hero-meta code {
      background: rgba(255,255,255,0.1); color: #f1f5f9;
      padding: 1px 6px; border-radius: 4px; font-size: 10px;
    }

    /* Section heads */
    .section-head {
      font-size: 13px; font-weight: 700;
      color: #0f172a; margin: 26px 0 12px;
      padding-bottom: 6px; border-bottom: 2px solid #e2e8f0;
      display: flex; align-items: center; gap: 8px;
    }
    .section-count {
      font-size: 10px; color: #64748b; font-weight: 500;
    }

    /* Pills */
    .pill {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 999px;
      font-size: 10px; font-weight: 600;
      letter-spacing: 0.01em;
    }

    /* Test-case card */
    .tc {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 14px;
      background: #ffffff;
      page-break-inside: avoid;
    }
    .tc-head {
      display: flex;
      gap: 12px;
      padding-bottom: 10px;
      margin-bottom: 12px;
      border-bottom: 1px dashed #e2e8f0;
    }
    .tc-id {
      flex-shrink: 0;
      display: flex; flex-direction: column; gap: 6px;
      align-items: flex-start;
    }
    .tc-num {
      display: inline-block;
      background: #0f172a; color: #f8fafc;
      padding: 3px 10px;
      border-radius: 6px;
      font-size: 10.5px; font-weight: 700;
      letter-spacing: 0.02em;
    }
    .tc-meta { flex: 1; }
    .tc-label { font-size: 13.5px; font-weight: 600; margin: 0 0 3px; }
    .tc-sub { font-size: 10.5px; color: #64748b; }
    .tc-pass { color: #047857; font-weight: 600; }
    .tc-fail { color: #b91c1c; font-weight: 600; }

    /* Step */
    .step {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px solid #f1f5f9;
      page-break-inside: avoid;
    }
    .step:first-child { border-top: none; padding-top: 0; margin-top: 0; }
    .step-head {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 4px;
    }
    .step-num {
      font-size: 9.5px; font-weight: 700;
      color: #64748b; letter-spacing: 0.04em; text-transform: uppercase;
      background: #f1f5f9;
      padding: 2px 7px; border-radius: 4px;
    }
    .step-title { flex: 1; font-size: 12px; font-weight: 600; color: #0f172a; }
    .step-badge {
      font-size: 10px; font-weight: 600;
      padding: 1px 8px; border-radius: 999px;
    }
    .step-pass { background: #d1fae5; color: #065f46; }
    .step-fail { background: #fee2e2; color: #991b1b; }
    .step-detail { font-size: 10.5px; color: #475569; margin: 4px 0 8px; }

    /* Request / response panels */
    .panels {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8px;
      margin-top: 6px;
    }
    .panel {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      overflow: hidden;
    }
    .panel-skip { background: #fafafa; border-style: dashed; }
    .panel-head {
      display: flex; align-items: center; gap: 8px;
      padding: 6px 10px;
      background: #ffffff;
      border-bottom: 1px solid #e2e8f0;
    }
    .panel-label {
      font-size: 9.5px; font-weight: 700;
      color: #475569; letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .panel .method {
      display: inline-block;
      padding: 1px 7px; border-radius: 4px;
      font-size: 9.5px; font-weight: 700;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      letter-spacing: 0.02em;
    }
    .panel .url {
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 9.5px; color: #1e293b;
      background: #f1f5f9;
      padding: 1px 6px; border-radius: 4px;
      flex: 1;
      overflow-wrap: anywhere;
    }
    .panel .status {
      display: inline-block;
      font-size: 10px; font-weight: 700;
      padding: 1px 8px; border-radius: 4px;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .status-ok     { background: #d1fae5; color: #065f46; }
    .status-redir  { background: #dbeafe; color: #1e3a8a; }
    .status-client { background: #fee2e2; color: #991b1b; }
    .status-server { background: #fde2e2; color: #7f1d1d; }
    .status-gray   { background: #e2e8f0; color: #475569; }
    .panel .latency {
      font-size: 9.5px; color: #64748b;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
    }
    .panel-body {
      margin: 0;
      padding: 10px 12px;
      background: #0f172a; color: #e2e8f0;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      font-size: 9.5px; line-height: 1.5;
      white-space: pre-wrap; word-break: break-word;
      max-height: 320px; overflow: hidden;
    }
    .panel-empty {
      padding: 8px 12px;
      font-size: 10px; color: #94a3b8; font-style: italic;
    }
    .panel-extra { padding: 0; border-top: 1px solid #e2e8f0; }
    .panel-extra summary {
      cursor: pointer;
      padding: 5px 12px;
      font-size: 9.5px; font-weight: 600; color: #475569;
      background: #ffffff;
    }
    .panel-extra pre {
      margin: 0;
      padding: 8px 12px;
      background: #1e293b; color: #cbd5e1;
      font-size: 9px; line-height: 1.5;
      font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
      white-space: pre-wrap; word-break: break-word;
    }

    /* Observation tables */
    table { width: 100%; border-collapse: collapse; font-size: 10.5px; table-layout: fixed; }
    thead th {
      background: #f8fafc; border-bottom: 2px solid #cbd5e1;
      text-align: left; padding: 6px 8px;
      font-size: 10px; color: #334155; font-weight: 600;
      text-transform: uppercase; letter-spacing: 0.02em;
    }
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

    .empty-note { font-size: 10.5px; color: #64748b; font-style: italic; padding: 12px 0; }
  </style>
</head>
<body>
  <header class="hero">
    <h1>OneGate Sign-off Report</h1>
    <div class="subtitle">CallPay / OneGate integration sign-off — request &amp; response evidence</div>
    <div class="hero-stats">
      <div class="stat ok">
        <div class="stat-num">${tcsPassed}</div>
        <div class="stat-label">Test cases passed</div>
      </div>
      <div class="stat fail">
        <div class="stat-num">${tcsFailed}</div>
        <div class="stat-label">Test cases failed</div>
      </div>
      <div class="stat">
        <div class="stat-num">${tcs.length}</div>
        <div class="stat-label">Test cases run</div>
      </div>
      <div class="stat">
        <div class="stat-num">${context.transactionCount}</div>
        <div class="stat-label">Transactions inspected</div>
      </div>
    </div>
    <div class="hero-meta">
      <span>Account: <code>${esc(context.accountName)}</code></span>
      <span>Environment: <code>${esc(context.environment)}</code></span>
      <span>Exported: <code>${esc(new Date().toLocaleString())}</code></span>
    </div>
  </header>

  <div class="section-head">
    Test cases
    <span class="section-count">${tcs.length} run · per-step request &amp; response captures</span>
  </div>
  ${
    tcs.length === 0
      ? `<div class="empty-note">No test cases have been run yet. Run a Test Case from the sign-off page and re-export to include the request / response evidence here.</div>`
      : tcs.map(renderTestCaseCard).join("")
  }

  <div class="section-head">
    Deposit methods (pay-in)
    <span class="section-count">${deposits.length} service${deposits.length === 1 ? "" : "s"}</span>
  </div>
  ${
    deposits.length === 0
      ? `<div class="empty-note">No deposit methods loaded.</div>`
      : `<table>
          <colgroup>
            <col style="width:17%" />
            <col style="width:26%" />
            <col style="width:9%" />
            <col style="width:11%" />
            <col style="width:9%" />
            <col style="width:28%" />
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

  <div class="section-head">
    Payout methods (OTT REST)
    <span class="section-count">${payouts.length} slug${payouts.length === 1 ? "" : "s"}</span>
  </div>
  ${
    payouts.length === 0
      ? `<div class="empty-note">No payout methods loaded.</div>`
      : `<table>
          <colgroup>
            <col style="width:17%" />
            <col style="width:26%" />
            <col style="width:9%" />
            <col style="width:11%" />
            <col style="width:9%" />
            <col style="width:28%" />
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
