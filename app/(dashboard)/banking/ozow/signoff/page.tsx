"use client";

/**
 * Ozow Payouts sign-off page.
 *
 * Drives Ozow's production-enablement checklist from the UI. Each test
 * hits a thin endpoint in payments/providers/momo/sa/ozow/api_views.py that
 * wraps signoff_service.run_<name>.
 *
 * Sandbox-only: production accounts are listed but the Run button is
 * disabled — Ozow's sign-off is required on staging by their docs.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  RotateCw,
  Search,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { useOrganizations } from "@/hooks/use-organization";
import { providerAccountsApi, type ProviderAccount } from "@/lib/provider-accounts-api";
import {
  ozowApi,
  type OzowSignoffResult,
  type OzowSignoffRunResponse,
  type OzowSignoffTest,
  type OzowSignoffWebhookOutcome,
} from "@/lib/ozow-api";
import {
  exportSignoffExcel,
  exportSignoffPDF,
} from "@/lib/ozow-signoff-export";

// ---------------------------------------------------------------------------
// Test groupings — matches Ozow's enablement checklist exactly.
// ---------------------------------------------------------------------------

// Section headings match the Ozow Payouts Integration Testing checklist
// so a reviewer can compare side-by-side without translating jargon. The
// final group ("Collections — One API") is our own addition — Ozow's
// payouts checklist doesn't require it, but it's the natural end-to-end
// sanity check that the same merchant account can both pay out AND
// collect through the One API hosted checkout.
const TEST_GROUPS: Array<{ heading: string; slugs: string[]; note?: string }> = [
  {
    heading: "Payout API Tests",
    slugs: [
      "min-amount",
      "max-amount",
      "valid-submit",
      "cdv-error",
      "get-status",
    ],
  },
  {
    heading: "Simulation records in Mock API",
    note:
      "Mock endpoints exercise different webhook outcomes without moving funds.",
    slugs: [
      "mock-decryption-failed",
      "mock-not-verified",
      "mock-decryption-key-missing",
    ],
  },
  {
    heading: "Collections — One API",
    note:
      "End-to-end sanity check: same merchant credentials can ALSO collect via the One API hosted checkout. Opens the redirect URL in a new tab on success.",
    slugs: ["collection-oneapi"],
  },
];

// Webhook-observable items from Ozow's enablement checklist. Labels and
// numbering are taken verbatim from the docs so the UI matches the
// language Ozow uses when signing off.
const WEBHOOK_DRIVEN_ITEMS = [
  {
    key: "verification_received",
    label: "Test Case 3: Receive Verification Request and respond to it successfully",
  },
  {
    key: "verification_success",
    label: "Test Case 4: Receive Payout Verification Success Message",
  },
  { key: "payout_complete", label: "Test Case 5: Receive Payout Complete Message" },
  { key: "payout_cancelled", label: "Test Case 6: Receive Payout Cancelled Message" },
];

// ---------------------------------------------------------------------------
// Status derivation
// ---------------------------------------------------------------------------

function deriveStatus(slug: string, result: OzowSignoffResult): {
  status: string;
  label: string;
} {
  if (result.skipped) return { status: "pending", label: "Skipped" };
  if (result.exception) return { status: "failed", label: "Error" };

  // Validation tests pass when Ozow rejected the submission.
  if (slug === "min-amount" || slug === "max-amount") {
    const status = String(result.status ?? "").toLowerCase();
    const sub = result.sub_status_code;
    if (
      status.includes("validationfailed") ||
      status.includes("error") ||
      sub === 101
    ) {
      return { status: "success", label: "Rejected as expected" };
    }
    return { status: "failed", label: "Did not reject" };
  }

  // valid-submit should land on Verification_Pending (sub-status 201).
  if (slug === "valid-submit") {
    if (result.sub_status_code === 201) {
      return { status: "success", label: "Verification_Pending" };
    }
    if (result.payout_id) {
      return { status: "pending", label: String(result.status ?? "Submitted") };
    }
    return { status: "failed", label: "No payoutId returned" };
  }

  if (slug === "cdv-error") {
    if (result.sub_status_code === 201 || result.payout_id) {
      return { status: "pending", label: "Awaiting CDV outcome" };
    }
    return { status: "failed", label: "No payoutId returned" };
  }

  if (slug === "get-status") {
    if (result.queried_payout_id && (result.status || result.status_code)) {
      return { status: "success", label: String(result.status ?? "Fetched") };
    }
    return { status: "failed", label: "No status returned" };
  }

  // Mock tests — Ozow's response is enough for sign-off; we just need a
  // payoutId-bearing response.
  if (slug.startsWith("mock-")) {
    if (result.payout_id) {
      return { status: "success", label: "Mock submitted" };
    }
    return { status: "failed", label: "No payoutId returned" };
  }

  // Collections: success when Ozow returns a payment id + redirect URL.
  if (slug === "collection-oneapi") {
    const paymentId = (result as Record<string, unknown>).payment_id as
      | string
      | undefined;
    const redirectUrl = (result as Record<string, unknown>).redirect_url as
      | string
      | undefined;
    if (paymentId && redirectUrl) {
      return { status: "success", label: "Hosted checkout ready" };
    }
    if (paymentId) {
      return { status: "pending", label: "No redirect URL yet" };
    }
    return { status: "failed", label: "No paymentId returned" };
  }

  return { status: "pending", label: "Unknown" };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OzowSignoffPage() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);
  // payoutId carries between tests: get-status reuses whatever valid-submit
  // produced, and the webhook inspector consumes the same value.
  const [payoutId, setPayoutId] = useState<string>("");
  const [results, setResults] = useState<Record<string, OzowSignoffRunResponse>>(
    {},
  );
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

  const { data: organizationsResponse } = useOrganizations();
  const organizations = useMemo(
    () =>
      Array.isArray(organizationsResponse)
        ? organizationsResponse
        : (organizationsResponse as any)?.results || [],
    [organizationsResponse],
  );

  useEffect(() => {
    if (!organizationId && organizations.length > 0) {
      setOrganizationId(organizations[0].id);
    }
  }, [organizations, organizationId]);

  const { data: accountsData, isLoading: accountsLoading } = useQuery({
    queryKey: ["provider-accounts", organizationId, "ozow"],
    queryFn: () => providerAccountsApi.list(organizationId ?? undefined),
    enabled: !!organizationId,
  });

  const ozowAccounts = useMemo<ProviderAccount[]>(
    () =>
      (accountsData?.results ?? []).filter(
        (a) => a.provider === "ozow" && a.is_active,
      ),
    [accountsData],
  );

  useEffect(() => {
    // Prefer a sandbox account by default — production blocks running anyway.
    const preferred =
      ozowAccounts.find((a) => a.active_environment === "sandbox") ??
      ozowAccounts[0] ??
      null;
    if (!accountId && preferred) setAccountId(preferred.id);
  }, [ozowAccounts, accountId]);

  const selectedAccount = ozowAccounts.find((a) => a.id === accountId) ?? null;
  const isSandbox = selectedAccount?.active_environment === "sandbox";

  const { data: testsData } = useQuery({
    queryKey: ["ozow-signoff-tests"],
    queryFn: () => ozowApi.listSignoffTests(),
  });
  const tests = testsData?.tests ?? [];
  const testsBySlug = useMemo(
    () => Object.fromEntries(tests.map((t) => [t.slug, t])),
    [tests],
  ) as Record<string, OzowSignoffTest>;

  const runTest = useMutation({
    mutationFn: async ({ slug }: { slug: string }) => {
      if (!accountId) throw new Error("Pick a provider account first");
      const body =
        testsBySlug[slug]?.requires_payout_id && payoutId
          ? { payout_id: payoutId }
          : undefined;
      return ozowApi.runSignoffTest(accountId, slug, body);
    },
    onSuccess: (resp) => {
      setResults((prev) => ({ ...prev, [resp.test]: resp }));
      setExpanded((prev) => ({ ...prev, [resp.test]: true }));
      // Roll any new payoutId forward into the shared field so get-status
      // / webhook-outcome can use it without copy-paste.
      const newId = (resp.result.payout_id as string | undefined) ?? "";
      if (newId && !payoutId) setPayoutId(newId);
      toast.success(`Ran ${resp.test}`);
    },
    onError: (err: any) => {
      toast.error(err?.message || "Test failed");
    },
  });

  const webhookOutcome = useQuery({
    queryKey: ["ozow-signoff-webhook", accountId, payoutId],
    queryFn: () =>
      ozowApi.getSignoffWebhookOutcome(accountId!, payoutId),
    enabled: !!accountId && !!payoutId && isSandbox,
    // Keep polling Test Case 3 progress until Ozow's verify webhook
    // actually fires (``last_verify_result === "verified"``) AND the
    // payout reaches a terminal state (``completed_at`` set). Either
    // alone isn't enough: ``completed_at`` flips for failures too, and
    // the verify webhook can fire seconds before the notify webhook
    // marks the payout complete.
    refetchInterval: (q) => {
      const o = q.state.data?.outcome;
      if (!o?.found) return 6000;
      const verified = o.last_verify_result === "verified";
      const terminal = !!o.completed_at;
      return verified && terminal ? false : 6000;
    },
  });
  const outcome = webhookOutcome.data?.outcome;

  const copy = (key: string, value: string) => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  // Pull a bank reading off any prior result so the export still shows it
  // even on tests where the user happens to be exporting before running.
  const lastRunWithBank = Object.values(results).find((r) => r.bank);
  const exportArgs = () => ({
    tests,
    results,
    context: {
      accountName: selectedAccount?.name ?? "Unknown",
      environment: selectedAccount?.active_environment ?? "sandbox",
      bankName: lastRunWithBank?.bank?.bank_group_name,
      branchCode: lastRunWithBank?.bank?.branch_code,
      workingPayoutId: payoutId || undefined,
      webhookOutcome: outcome ?? null,
    },
  });
  const hasResults = Object.keys(results).length > 0;
  const handleExportExcel = () => {
    try {
      exportSignoffExcel(exportArgs());
      toast.success("Excel export downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };
  const handleExportPDF = () => {
    try {
      exportSignoffPDF(exportArgs());
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };

  return (
    <div className="min-h-screen bg-muted">
      <Header
        organizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        organizations={organizations}
        accountId={accountId}
        onAccountChange={setAccountId}
        accounts={ozowAccounts}
        accountsLoading={accountsLoading}
      />

      <div className="px-6 py-6 space-y-6">
        {selectedAccount && !isSandbox && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
            <div>
              <p className="font-medium">
                Production account selected — sign-off tests are disabled.
              </p>
              <p className="text-amber-800 mt-0.5">
                Ozow's enablement checklist mandates sign-off on staging. Switch{" "}
                <span className="font-mono">active_environment</span> to{" "}
                <span className="font-mono">sandbox</span> on this account, or
                pick a sandbox account from the dropdown.
              </p>
            </div>
          </div>
        )}

        {/* Shared payout-id field used by get-status + webhook inspector */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-end gap-3 flex-wrap">
            <div className="flex-1 min-w-[280px]">
              <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                Working PayoutId (auto-populated from valid-submit, used by
                get-status + webhook inspector)
              </label>
              <Input
                value={payoutId}
                onChange={(e) => setPayoutId(e.target.value)}
                placeholder="e.g. 5c3a7e4f-..."
                className="font-mono text-xs"
              />
            </div>
            {payoutId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => copy("global-pid", payoutId)}
              >
                {copied === "global-pid" ? (
                  <Check className="h-4 w-4 mr-1" />
                ) : (
                  <Copy className="h-4 w-4 mr-1" />
                )}
                Copy
              </Button>
            )}
            {payoutId && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => webhookOutcome.refetch()}
              >
                <Search className="h-4 w-4 mr-1" />
                Inspect webhooks
              </Button>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2 flex-wrap">
            <div className="text-xs text-muted-foreground mr-1">
              Share results with Ozow:
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasResults}
              onClick={handleExportExcel}
              title={
                hasResults
                  ? "Download every test result as a single-sheet .xlsx"
                  : "Run at least one test first"
              }
            >
              <FileSpreadsheet className="h-4 w-4 mr-1.5" />
              Export Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!hasResults}
              onClick={handleExportPDF}
              title={
                hasResults
                  ? "Open the report in a new tab — your browser's print dialog will save it as PDF"
                  : "Run at least one test first"
              }
            >
              <FileText className="h-4 w-4 mr-1.5" />
              Export PDF
            </Button>
            {!hasResults && (
              <span className="text-[11px] text-muted-foreground">
                Run at least one test to enable export.
              </span>
            )}
          </div>
        </div>

        {/* Test groups */}
        {TEST_GROUPS.map((group) => (
          <div
            key={group.heading}
            className="bg-card border border-border rounded-xl overflow-hidden"
          >
            <div className="px-5 py-3 border-b border-border bg-muted/40">
              <h2 className="text-sm font-semibold text-foreground">
                {group.heading}
              </h2>
              {group.note && (
                <p className="text-xs text-muted-foreground mt-1">{group.note}</p>
              )}
            </div>
            <div className="divide-y divide-border">
              {group.slugs.map((slug) => {
                const meta = testsBySlug[slug];
                const lastRun = results[slug];
                const expandedKey = slug;
                const isExpanded = !!expanded[expandedKey];
                const status = lastRun
                  ? deriveStatus(slug, lastRun.result)
                  : null;
                const requiresPayoutId = meta?.requires_payout_id;
                const isRunning =
                  runTest.isPending && runTest.variables?.slug === slug;
                return (
                  <div key={slug} className="px-5 py-3">
                    <div className="flex items-start gap-3 flex-wrap">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [expandedKey]: !prev[expandedKey],
                          }))
                        }
                        className="flex items-start gap-1.5 text-left hover:text-primary min-w-0 flex-1"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-foreground">
                            {meta?.label ?? slug}
                          </div>
                          <div className="font-mono text-[11px] text-muted-foreground mt-0.5">
                            {slug}
                          </div>
                        </div>
                      </button>
                      <div className="flex items-center gap-2 flex-wrap ml-auto">
                        {status && (
                          <StatusBadge
                            status={status.status}
                            label={status.label}
                            size="sm"
                          />
                        )}
                        {lastRun?.result.payout_id ? (
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">
                              PayoutId
                            </span>
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              {String(lastRun.result.payout_id)}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                copy(slug, String(lastRun.result.payout_id))
                              }
                            >
                              {copied === slug ? (
                                <Check className="h-3.5 w-3.5" />
                              ) : (
                                <Copy className="h-3.5 w-3.5" />
                              )}
                            </Button>
                          </div>
                        ) : null}
                        {/* Collection-specific: surface PaymentId + Open
                            checkout link. Lives alongside the PayoutId block
                            so both kinds of test results read the same way. */}
                        {(() => {
                          const paymentId = lastRun?.result
                            ? ((lastRun.result as Record<string, unknown>)
                                .payment_id as string | undefined)
                            : undefined;
                          const redirectUrl = lastRun?.result
                            ? ((lastRun.result as Record<string, unknown>)
                                .redirect_url as string | undefined)
                            : undefined;
                          if (!paymentId) return null;
                          return (
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">
                                PaymentId
                              </span>
                              <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                                {paymentId}
                              </code>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copy(slug, paymentId)}
                              >
                                {copied === slug ? (
                                  <Check className="h-3.5 w-3.5" />
                                ) : (
                                  <Copy className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              {redirectUrl && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    window.open(redirectUrl, "_blank", "noopener")
                                  }
                                  title="Open hosted checkout in a new tab"
                                >
                                  Open checkout
                                </Button>
                              )}
                            </div>
                          );
                        })()}
                        <Button
                          variant={status?.status === "success" ? "outline" : "primary"}
                          size="sm"
                          disabled={
                            !accountId ||
                            !isSandbox ||
                            isRunning ||
                            (requiresPayoutId && !payoutId)
                          }
                          onClick={() => runTest.mutate({ slug })}
                        >
                          {isRunning ? (
                            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                          ) : lastRun ? (
                            <RotateCw className="h-4 w-4 mr-1" />
                          ) : (
                            <Play className="h-4 w-4 mr-1" />
                          )}
                          {lastRun ? "Re-run" : "Run"}
                        </Button>
                      </div>
                    </div>
                    {requiresPayoutId && !payoutId && (
                      <p className="mt-1 ml-6 text-xs text-amber-700">
                        Needs a payoutId — run Test Case 3 first or paste one above.
                      </p>
                    )}
                    {isExpanded && lastRun && (
                      <ResultPanel
                        result={lastRun}
                        onCopyJson={(json) => copy(`${slug}-json`, json)}
                        copied={copied === `${slug}-json`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Webhook-driven items + manual sign-off items */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">
              Webhook-driven outcomes
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Ozow fires the verify + notify webhooks against{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                /payments/api/ozow/webhook/verify/
              </code>{" "}
              and{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                /webhook/notify/
              </code>
              . Surface the resulting OzowCallback + OzowPayout state for the
              PayoutId above.
            </p>
          </div>
          <div className="px-5 py-4">
            {!payoutId ? (
              <p className="text-sm text-muted-foreground">
                Enter or generate a PayoutId above to inspect webhook state.
              </p>
            ) : !outcome?.found ? (
              <p className="text-sm text-muted-foreground">
                No OzowPayout row found for{" "}
                <code className="text-xs font-mono">{payoutId}</code>{" "}
                {webhookOutcome.isFetching && (
                  <span className="ml-1 inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    polling…
                  </span>
                )}
              </p>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Status</div>
                    <div className="font-medium">{outcome.status ?? "—"}</div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Status code</div>
                    <div className="font-mono">
                      {outcome.status_code ?? "—"} /{" "}
                      {outcome.sub_status_code ?? "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">
                      Verify calls{" "}
                      {webhookOutcome.isFetching && (
                        <Loader2 className="inline h-3 w-3 animate-spin ml-1" />
                      )}
                    </div>
                    <div className="font-mono flex items-center gap-2">
                      <span>{outcome.verify_call_count ?? 0}</span>
                      {outcome.last_verify_result && (
                        <span
                          className={
                            "text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded " +
                            (outcome.last_verify_result === "verified"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800")
                          }
                        >
                          {outcome.last_verify_result}
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-muted-foreground">Completed at</div>
                    <div className="font-mono text-[11px]">
                      {outcome.completed_at ?? "—"}
                    </div>
                  </div>
                </div>
                <ul className="space-y-1.5">
                  {WEBHOOK_DRIVEN_ITEMS.map((item) => {
                    const status = deriveWebhookItemStatus(item.key, outcome);
                    return (
                      <li
                        key={item.key}
                        className="flex items-center gap-3 text-sm"
                      >
                        <StatusBadge
                          status={status.status}
                          label={status.label}
                          size="sm"
                        />
                        <span>{item.label}</span>
                      </li>
                    );
                  })}
                </ul>
                <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
                  Polling every 6s until{" "}
                  <code className="bg-muted px-1 rounded">
                    last_verify_result = "verified"
                  </code>{" "}
                  AND <code className="bg-muted px-1 rounded">completed_at</code>{" "}
                  is set. Last verify hit:{" "}
                  <code className="bg-muted px-1 rounded">
                    {outcome.last_verified_at
                      ? new Date(outcome.last_verified_at).toLocaleTimeString()
                      : "—"}
                  </code>{" "}
                  from{" "}
                  <code className="bg-muted px-1 rounded">
                    {outcome.last_verify_ip ?? "—"}
                  </code>
                  .
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl px-5 py-4">
          <h2 className="text-sm font-semibold text-foreground">
            Manual sign-off item
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            <span className="font-medium text-foreground">
              Test Case 7: Receive Insufficient Float Balance Message.
            </span>{" "}
            Triggered by Ozow when the float is drained — request via Ozow
            support and capture the email screenshot. There's no API
            equivalent.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Header({
  organizationId,
  onOrganizationChange,
  organizations,
  accountId,
  onAccountChange,
  accounts,
  accountsLoading,
}: {
  organizationId: string | null;
  onOrganizationChange: (id: string) => void;
  organizations: any[];
  accountId: string | null;
  onAccountChange: (id: string) => void;
  accounts: ProviderAccount[];
  accountsLoading: boolean;
}) {
  return (
    <div className="bg-card border-b border-border sticky top-0 z-10">
      <div className="px-6 py-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              Ozow Sign-off
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Drive Ozow's production-enablement checklist. Sandbox-only.
            </p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Select
              value={organizationId || undefined}
              onValueChange={onOrganizationChange}
            >
              <SelectTrigger className="w-[220px] h-9 bg-muted border-border">
                <Building2 className="h-4 w-4 text-muted-foreground/60 mr-2" />
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={accountId || undefined}
              onValueChange={onAccountChange}
              disabled={accountsLoading || accounts.length === 0}
            >
              <SelectTrigger className="w-[280px] h-9 bg-muted border-border">
                <SelectValue placeholder="Select Ozow account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="flex items-center gap-2">
                      <span>{a.name}</span>
                      <span
                        className={
                          "text-[10px] font-mono px-1.5 py-0.5 rounded " +
                          (a.active_environment === "sandbox"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-rose-100 text-rose-800")
                        }
                      >
                        {a.active_environment}
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResultPanel({
  result,
  onCopyJson,
  copied,
}: {
  result: OzowSignoffRunResponse;
  onCopyJson: (json: string) => void;
  copied: boolean;
}) {
  const json = JSON.stringify(result.result, null, 2);
  return (
    <div className="mt-3 rounded-lg border border-border bg-muted/30">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="text-xs text-muted-foreground">
          {result.bank
            ? `${result.bank.bank_group_name} · ${result.bank.branch_code}`
            : `${result.test} · ${result.environment}`}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7"
          onClick={() => onCopyJson(json)}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5 mr-1" />
          ) : (
            <Copy className="h-3.5 w-3.5 mr-1" />
          )}
          Copy JSON
        </Button>
      </div>
      <pre className="text-[11px] font-mono leading-relaxed p-3 overflow-x-auto whitespace-pre">
        {json}
      </pre>
    </div>
  );
}

function deriveWebhookItemStatus(
  key: string,
  outcome: OzowSignoffWebhookOutcome,
): { status: string; label: string } {
  if (key === "verification_received") {
    // ``verify_call_count`` is the most authoritative signal: it
    // increments every time Ozow hits the verify endpoint, regardless of
    // whether the call passed hash validation or rejected. Fall back to
    // the legacy ``verification_received`` flag if the audit column
    // isn't populated yet.
    const verified = outcome.last_verify_result === "verified";
    const count = outcome.verify_call_count ?? 0;
    if (verified) return { status: "success", label: `Verified (×${count})` };
    if (count > 0) return { status: "pending", label: `Hit ×${count}` };
    return outcome.verification_received
      ? { status: "success", label: "Received" }
      : { status: "pending", label: "Waiting" };
  }
  const code = outcome.status_code;
  if (key === "verification_success") {
    // Anything past status 2 means Ozow accepted verification at least once.
    return code != null && code >= 3
      ? { status: "success", label: "Verified" }
      : { status: "pending", label: "Waiting" };
  }
  if (key === "payout_complete") {
    return code === 5
      ? { status: "success", label: "Complete" }
      : { status: "pending", label: "Not yet" };
  }
  if (key === "payout_cancelled") {
    return code === 99
      ? { status: "success", label: "Cancelled" }
      : { status: "pending", label: "Not yet" };
  }
  return { status: "pending", label: "—" };
}

