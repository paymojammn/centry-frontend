/**
 * MTN MoMo Open API — SIT (System Integration Test) sign-off catalogue + export.
 *
 * Framework-agnostic: the scenario catalogue mirrors MTN's "UG Momo OpenAPI SIT
 * Sheet" workbook (one entry per TC#), and the export helpers produce the
 * filled-in SIT CSVs (one per sheet, same columns as the workbook) that get
 * submitted to MTN for go-live.
 *
 * Each case maps to a body for POST /payments/api/mtn/cert-test/, which fires
 * the raw call and returns { http_status, reason, response, reference_id }.
 */

import * as XLSX from "xlsx";

export type CertCaseName =
  | "token"
  | "request_to_pay"
  | "transfer"
  | "collection_status"
  | "transfer_status"
  | "validate_account"
  | "balance"
  | "provision_apiuser"
  | "provision_apikey";

export type Invalidate =
  | "subscription_key"
  | "api_key"
  | "target_environment"
  | "token";

export interface CertRequest {
  case: CertCaseName;
  service?: "collection" | "disbursement";
  amount?: string;
  msisdn?: string;
  currency?: string;
  reference_id?: string;
  omit?: string[];
  duplicate?: boolean;
  account_type?: string;
  invalidate?: Invalidate;
  /** Frontend-only: create a fresh txn first so a valid reference exists. */
  chainCreate?: boolean;
}

export interface SitCase {
  tc: string;
  label: string;
  objective: string;
  expected: string;
  request: CertRequest;
  /** Editable inputs shown in the row (transaction cases). */
  editable?: Array<"amount" | "msisdn">;
  notes?: string;
}

export interface SitSheet {
  /** Exact workbook sheet name (also the CSV file name). */
  name: string;
  /** Whether MTN's sheet carries a ReferenceID column. */
  hasReferenceId: boolean;
  cases: SitCase[];
}

export interface RunResult {
  case?: string;
  http_status?: number | null;
  reason?: string;
  ok?: boolean;
  response?: unknown;
  reference_id?: string;
  target_environment?: string;
  error?: string | null;
}

// Sandbox MoMo test MSISDNs (behaviour is fixed by the last digits).
const OK_MSISDN = "46733123453";
const REJECT_MSISDN = "46733123450";

// ---------------------------------------------------------------------------
// Auth block — shared across sheets (same four TC01 cases everywhere).
// ---------------------------------------------------------------------------
function authCases(service: "collection" | "disbursement"): SitCase[] {
  return [
    {
      tc: "TC01-01",
      label: "Generate Bearer Token using Invalid Subscription key",
      objective: "Invalid Subscription key — request OAUTH token with an invalid subscription key.",
      expected: "401 Unauthorized",
      request: { case: "token", service, invalidate: "subscription_key" },
    },
    {
      tc: "TC01-02",
      label: "Generate Bearer Token using Invalid API Key",
      objective: "Invalid API User Key — request OAUTH token with an invalid API key, valid subscription key.",
      expected: "401 / 500 login_failed",
      request: { case: "token", service, invalidate: "api_key" },
    },
    {
      tc: "TC01-03",
      label: "Generate Bearer Token with valid API key and Subscription Key",
      objective: "Valid Subscription Key & API Key — request OAUTH token.",
      expected: "200 OK + access_token",
      request: { case: "token", service },
    },
    {
      tc: "TC01-04",
      label: "Generate a second Token before the first expires",
      objective: "Generate Second Token — token generation before first token expiry.",
      expected: "200 OK + access_token",
      request: { case: "token", service },
    },
  ];
}

// ---------------------------------------------------------------------------
// SIT sheets
// ---------------------------------------------------------------------------
export const SIT_SHEETS: SitSheet[] = [
  {
    name: "Collection",
    hasReferenceId: true,
    cases: [
      ...authCases("collection"),
      {
        tc: "TC02-01",
        label: "No Exceptions — Subscriber Approves",
        objective: "Send RequestToPay as per API specification (subscriber approves).",
        expected: "202 Accepted",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-02",
        label: "No Exceptions — Subscriber Rejects",
        objective: "Send RequestToPay as per API specification (subscriber rejects).",
        expected: "202 Accepted, then FAILED on status",
        request: { case: "request_to_pay", amount: "100", msisdn: REJECT_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-03",
        label: "No Exceptions — Approval Timeout",
        objective: "Send RequestToPay as per API specification (approval times out).",
        expected: "202 Accepted, then FAILED/TIMEOUT on status",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-04",
        label: "Duplicate Reference ID",
        objective: "Send RequestToPay with a duplicate X-Reference-Id.",
        expected: "409 Conflict (RESOURCE_ALREADY_EXISTS)",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN, duplicate: true },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-05",
        label: "Incomplete Information",
        objective: "Omit Currency (or Amount) from the RequestToPay body.",
        expected: "400 Bad Request",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN, omit: ["currency"] },
        editable: ["msisdn"],
      },
      {
        tc: "TC02-06",
        label: "Insufficient Funds",
        objective: "Send a debit amount greater than the payer's available balance.",
        expected: "202 Accepted, then FAILED (PAYER_LIMIT/NOT_ENOUGH_FUNDS)",
        request: { case: "request_to_pay", amount: "99999999", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-07",
        label: "Invalid B-Party",
        objective: "Send RequestToPay with an invalid B-Party (payer MSISDN).",
        expected: "400 / FAILED",
        request: { case: "request_to_pay", amount: "100", msisdn: "0" },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-08",
        label: "Exceed Daily Limit",
        objective: "Send a RequestToPay that exceeds the daily limit on the profile.",
        expected: "202 Accepted, then FAILED (limit)",
        request: { case: "request_to_pay", amount: "99999999", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-09",
        label: "Invalid Subscription Key",
        objective: "Send RequestToPay with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN, invalidate: "subscription_key" },
      },
      {
        tc: "TC02-10",
        label: "Invalid Target Environment",
        objective: "Send RequestToPay with an invalid X-Target-Environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN, invalidate: "target_environment" },
      },
      {
        tc: "TC02-11",
        label: "Invalid OAUTH Token",
        objective: "Send RequestToPay with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN, invalidate: "token" },
      },
      {
        tc: "TC02-12",
        label: "Get Status — valid Reference ID",
        objective: "Fetch the status of a valid Reference ID.",
        expected: "200 OK + status",
        request: { case: "collection_status", service: "collection", chainCreate: true },
      },
      {
        tc: "TC02-13",
        label: "Get Status — invalid Reference ID",
        objective: "Fetch the status of an invalid Reference ID.",
        expected: "400 / 404",
        request: { case: "collection_status", reference_id: "not-a-valid-reference-id" },
      },
      {
        tc: "TC02-14",
        label: "Get Status — Invalid Subscription key",
        objective: "Fetch status with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "collection_status", service: "collection", chainCreate: true, invalidate: "subscription_key" },
      },
      {
        tc: "TC02-15",
        label: "Get Status — Invalid Target Environment",
        objective: "Fetch status with an invalid target environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "collection_status", service: "collection", chainCreate: true, invalidate: "target_environment" },
      },
      {
        tc: "TC02-16",
        label: "Get Status — Invalid OAUTH Token",
        objective: "Fetch status with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "collection_status", service: "collection", chainCreate: true, invalidate: "token" },
      },
      {
        tc: "TC02-17",
        label: "Transaction over HTTPS protocol",
        objective: "Send a successful RequestToPay over HTTPS.",
        expected: "202 Accepted (base URL is HTTPS)",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-18",
        label: "Transaction over HTTP protocol",
        objective: "Send a RequestToPay over HTTP (sandbox only; production is HTTPS-only).",
        expected: "Manual — sandbox base is HTTPS",
        request: { case: "request_to_pay", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
        notes: "MTN sandbox is HTTPS-only; HTTP protocol test recorded manually.",
      },
    ],
  },
  {
    name: "Disbursement and Remittance",
    hasReferenceId: true,
    cases: [
      ...authCases("disbursement"),
      {
        tc: "TC02-01",
        label: "No Exceptions",
        objective: "Send Transfer as per API specification.",
        expected: "202 Accepted",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-02",
        label: "Duplicate Reference ID",
        objective: "Send Transfer with a duplicate X-Reference-Id.",
        expected: "409 Conflict (RESOURCE_ALREADY_EXISTS)",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN, duplicate: true },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-03",
        label: "Incomplete Information",
        objective: "Omit Currency (or Amount) from the Transfer body.",
        expected: "400 Bad Request",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN, omit: ["currency"] },
        editable: ["msisdn"],
      },
      {
        tc: "TC02-04",
        label: "Insufficient Funds",
        objective: "Send an amount greater than the sender's available balance.",
        expected: "202 Accepted, then FAILED (NOT_ENOUGH_FUNDS)",
        request: { case: "transfer", amount: "99999999", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-05",
        label: "Invalid B-Party",
        objective: "Send Transfer with an invalid B-Party (payee MSISDN).",
        expected: "400 / FAILED",
        request: { case: "transfer", amount: "100", msisdn: "0" },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-06",
        label: "Exceed Daily Limit",
        objective: "Send a Transfer that exceeds the daily limit on the profile.",
        expected: "202 Accepted, then FAILED (limit)",
        request: { case: "transfer", amount: "99999999", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-07",
        label: "Invalid Subscription Key",
        objective: "Send Transfer with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN, invalidate: "subscription_key" },
      },
      {
        tc: "TC02-08",
        label: "Invalid Target Environment",
        objective: "Send Transfer with an invalid target environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN, invalidate: "target_environment" },
      },
      {
        tc: "TC02-09",
        label: "Invalid OAUTH Token",
        objective: "Send Transfer with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN, invalidate: "token" },
      },
      {
        tc: "TC02-10",
        label: "Get Transfer Status — valid Reference ID",
        objective: "Fetch the status of a valid Transfer Reference ID.",
        expected: "200 OK + status",
        request: { case: "transfer_status", service: "disbursement", chainCreate: true },
      },
      {
        tc: "TC02-11",
        label: "Get Transfer Status — invalid Reference ID",
        objective: "Fetch the status of an invalid Reference ID.",
        expected: "400 / 404",
        request: { case: "transfer_status", reference_id: "not-a-valid-reference-id" },
      },
      {
        tc: "TC02-12",
        label: "Get Transfer Status — Invalid Subscription key",
        objective: "Fetch transfer status with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "transfer_status", service: "disbursement", chainCreate: true, invalidate: "subscription_key" },
      },
      {
        tc: "TC02-13",
        label: "Get Transfer Status — Invalid Target Environment",
        objective: "Fetch transfer status with an invalid target environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "transfer_status", service: "disbursement", chainCreate: true, invalidate: "target_environment" },
      },
      {
        tc: "TC02-14",
        label: "Get Transfer Status — Invalid OAUTH Token",
        objective: "Fetch transfer status with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "transfer_status", service: "disbursement", chainCreate: true, invalidate: "token" },
      },
      {
        tc: "TC02-15",
        label: "Transaction over HTTPS protocol",
        objective: "Send a successful Transfer over HTTPS.",
        expected: "202 Accepted (base URL is HTTPS)",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
      },
      {
        tc: "TC02-16",
        label: "Transaction over HTTP protocol",
        objective: "Send a Transfer over HTTP (sandbox only; production is HTTPS-only).",
        expected: "Manual — sandbox base is HTTPS",
        request: { case: "transfer", amount: "100", msisdn: OK_MSISDN },
        editable: ["amount", "msisdn"],
        notes: "MTN sandbox is HTTPS-only; HTTP protocol test recorded manually.",
      },
    ],
  },
  {
    name: "ValidateAccount",
    hasReferenceId: false,
    cases: [
      ...authCases("collection"),
      {
        tc: "TC02-01",
        label: "No Exception",
        objective: "Validate account holder status as per API specification.",
        expected: "200 OK + { result: true }",
        request: { case: "validate_account", service: "collection", msisdn: OK_MSISDN },
        editable: ["msisdn"],
      },
      {
        tc: "TC02-02",
        label: "Invalid AccountHolderType",
        objective: "Validate account holder using an invalid account holder type.",
        expected: "400 Bad Request",
        request: { case: "validate_account", service: "collection", msisdn: OK_MSISDN, account_type: "invalidtype" },
      },
      {
        tc: "TC02-03",
        label: "Invalid AccountHolderID",
        objective: "Validate account holder using an invalid account holder ID.",
        expected: "400 / 404",
        request: { case: "validate_account", service: "collection", msisdn: "0" },
      },
      {
        tc: "TC02-04",
        label: "Invalid Subscription key",
        objective: "Validate account holder with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "validate_account", service: "collection", msisdn: OK_MSISDN, invalidate: "subscription_key" },
      },
      {
        tc: "TC02-05",
        label: "Invalid Target Environment",
        objective: "Validate account holder with an invalid target environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "validate_account", service: "collection", msisdn: OK_MSISDN, invalidate: "target_environment" },
      },
      {
        tc: "TC02-06",
        label: "Invalid OAUTH Token",
        objective: "Validate account holder with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "validate_account", service: "collection", msisdn: OK_MSISDN, invalidate: "token" },
      },
    ],
  },
  {
    name: "Balance",
    hasReferenceId: false,
    cases: [
      ...authCases("collection"),
      {
        tc: "TC02-01",
        label: "No Exception",
        objective: "Get account balance as per API specification.",
        expected: "200 OK + { availableBalance, currency }",
        request: { case: "balance", service: "collection" },
      },
      {
        tc: "TC02-02",
        label: "Invalid AccountHolderType",
        objective: "Get balance on the disbursement product.",
        expected: "200 OK / 500 (sandbox)",
        request: { case: "balance", service: "disbursement" },
      },
      {
        tc: "TC02-03",
        label: "Invalid AccountHolderID",
        objective: "Get balance — invalid account context.",
        expected: "400 / 500",
        request: { case: "balance", service: "collection", invalidate: "target_environment" },
      },
      {
        tc: "TC02-04",
        label: "Invalid Subscription key",
        objective: "Get balance with an invalid subscription key.",
        expected: "401 Unauthorized",
        request: { case: "balance", service: "collection", invalidate: "subscription_key" },
      },
      {
        tc: "TC02-05",
        label: "Invalid Target Environment",
        objective: "Get balance with an invalid target environment.",
        expected: "500 NOT_ALLOWED_TARGET_ENVIRONMENT",
        request: { case: "balance", service: "collection", invalidate: "target_environment" },
      },
      {
        tc: "TC02-06",
        label: "Invalid OAUTH Token",
        objective: "Get balance with an invalid OAUTH token.",
        expected: "401 Unauthorized",
        request: { case: "balance", service: "collection", invalidate: "token" },
      },
    ],
  },
  {
    name: "SignUp & Provision API User",
    hasReferenceId: true,
    cases: [
      {
        tc: "TC01-01",
        label: "SignUp — Create a New API Manager Account",
        objective: "Follow https://momodeveloper.mtn.com and create an account.",
        expected: "Manual — portal signup",
        request: { case: "provision_apiuser" },
        notes: "Performed on the MTN developer portal; recorded manually.",
      },
      {
        tc: "TC01-02",
        label: "Product Subscription",
        objective: "Subscribe to a product to be assigned a subscription key.",
        expected: "Manual — portal subscription",
        request: { case: "provision_apiuser" },
        notes: "Performed on the MTN developer portal; recorded manually.",
      },
      {
        tc: "TC02-01",
        label: "API User Provisioning",
        objective: "Generate an API User using the sandbox provisioning API.",
        expected: "201 Created",
        request: { case: "provision_apiuser", service: "collection" },
      },
      {
        tc: "TC02-02",
        label: "API Key Provisioning",
        objective: "Generate an API Key using the sandbox provisioning API.",
        expected: "201 Created + apiKey",
        request: { case: "provision_apikey", service: "collection" },
      },
    ],
  },
];

// ---------------------------------------------------------------------------
// Export — filled SIT CSVs (one per sheet) + combined workbook.
// ---------------------------------------------------------------------------

/** MTN's "Actual Results" cell: HTTP status + description + response body. */
export function actualResults(result: RunResult | undefined): string {
  if (!result) return "Not run";
  if (result.error) return `ERROR: ${result.error}`;
  const status =
    result.http_status != null
      ? `HTTP ${result.http_status}${result.reason ? " " + result.reason : ""}`
      : "No HTTP status";
  const body =
    typeof result.response === "string"
      ? result.response
      : JSON.stringify(result.response ?? "");
  return body ? `${status}\n${body}` : status;
}

function sheetRows(
  sheet: SitSheet,
  results: Record<string, RunResult>,
): Array<Record<string, string>> {
  return sheet.cases.map((c) => {
    const r = results[`${sheet.name}:${c.tc}`];
    const row: Record<string, string> = {
      "TC#": c.tc,
      "Test case": c.label,
      Objective: c.objective,
      "Actual Results": actualResults(r),
    };
    if (sheet.hasReferenceId) row["ReferenceID"] = r?.reference_id ?? "";
    row["Notes"] = c.notes ?? "";
    return row;
  });
}

function escapeCsv(value: string): string {
  const v = value ?? "";
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function sheetToCsv(sheet: SitSheet, results: Record<string, RunResult>): string {
  const rows = sheetRows(sheet, results);
  const headers = Object.keys(rows[0] ?? { "TC#": "" });
  const lines = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => headers.map((h) => escapeCsv(row[h] ?? "")).join(",")),
  ];
  return lines.join("\n");
}

function downloadBlob(filename: string, blob: Blob): void {
  if (typeof window === "undefined") return;
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

const slug = (name: string) => name.replace(/[^a-z0-9]+/gi, "_").replace(/^_|_$/g, "");

/** Download one sheet's SIT CSV. */
export function downloadSheetCsv(sheet: SitSheet, results: Record<string, RunResult>): void {
  const csv = sheetToCsv(sheet, results);
  downloadBlob(`MTN_SIT_${slug(sheet.name)}.csv`, new Blob([csv], { type: "text/csv;charset=utf-8;" }));
}

/** Download every SIT sheet as a single .xlsx workbook (one sheet per SIT sheet). */
export function downloadSitWorkbook(results: Record<string, RunResult>): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of SIT_SHEETS) {
    const ws = XLSX.utils.json_to_sheet(sheetRows(sheet, results));
    // Excel caps sheet names at 31 chars.
    XLSX.utils.book_append_sheet(wb, ws, sheet.name.slice(0, 31));
  }
  XLSX.writeFile(wb, "MTN_MoMo_SIT_Signoff.xlsx");
}
