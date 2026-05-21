"use client";

/**
 * OneGate (CallPay) Sign-off Page.
 *
 * Drives OneGate's enablement criterion: complete a successful transaction
 * with each deposit / payout method you intend to use in production. Mirrors
 * the surface area of the OneGate enablement email so the merchant can
 * answer it directly from this page (intent toggles + notes per method).
 *
 * Sandbox-only — OneGate creates a separate merchant profile for live.
 */

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertCircle,
  Building2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Loader2,
  Play,
  RotateCw,
  Send,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useOrganizations } from "@/hooks/use-organization";
import {
  providerAccountsApi,
  type ProviderAccount,
} from "@/lib/provider-accounts-api";
import {
  onegateApi,
  type OneGateDepositRow,
  type OneGatePayoutRow,
  type OneGatePayoutTestPayload,
  type OneGateSignoffIntent,
  type SignoffBadge,
} from "@/lib/onegate-api";
import { exportOnegateSignoffExcel, exportOnegateSignoffPDF } from "@/lib/onegate-signoff-export";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function badgeStatus(b: SignoffBadge): { status: string; label: string } {
  if (b === "passed") return { status: "success", label: "Passed" };
  if (b === "failures_only") return { status: "failed", label: "Failures only" };
  return { status: "pending", label: "Untested" };
}

function intentTone(intent: OneGateSignoffIntent | undefined): string {
  if (intent?.will_use === true) return "border-emerald-200 bg-emerald-50/50";
  if (intent?.will_use === false) return "border-slate-200 bg-slate-50/50 opacity-90";
  return "";
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function OnegateSignoffPage() {
  const queryClient = useQueryClient();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);

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
    queryKey: ["provider-accounts", organizationId, "onegate"],
    queryFn: () => providerAccountsApi.list(organizationId ?? undefined),
    enabled: !!organizationId,
  });

  const onegateAccounts = useMemo<ProviderAccount[]>(
    () =>
      (accountsData?.results ?? []).filter(
        (a) => a.provider === "onegate" && a.is_active,
      ),
    [accountsData],
  );

  useEffect(() => {
    const preferred =
      onegateAccounts.find((a) => a.active_environment === "sandbox") ??
      onegateAccounts[0] ??
      null;
    if (!accountId && preferred) setAccountId(preferred.id);
  }, [onegateAccounts, accountId]);

  const selectedAccount =
    onegateAccounts.find((a) => a.id === accountId) ?? null;
  const isSandbox = selectedAccount?.active_environment === "sandbox";

  // -------- Queries --------
  const depositsQuery = useQuery({
    queryKey: ["onegate-deposit-methods", accountId],
    queryFn: () => onegateApi.listDepositMethods(accountId!),
    enabled: !!accountId && isSandbox,
  });
  const payoutsQuery = useQuery({
    queryKey: ["onegate-payout-methods", accountId],
    queryFn: () => onegateApi.listPayoutMethods(accountId!),
    enabled: !!accountId && isSandbox,
  });

  const deposits = depositsQuery.data?.methods ?? [];
  const payouts = payoutsQuery.data?.methods ?? [];

  // -------- Deposit test mutation --------
  const startDeposit = useMutation({
    mutationFn: async ({ slug, amount }: { slug: string; amount: string }) => {
      if (!accountId) throw new Error("Pick an account");
      const returnUrl = window.location.origin + "/banking/onegate/signoff";
      const method = deposits.find((m) => m.slug === slug);
      return onegateApi.startDepositTest(accountId, {
        slug,
        amount: amount || method?.default_amount || "10.00",
        return_url: returnUrl,
      });
    },
    onSuccess: (resp) => {
      if (resp.redirect_url) {
        window.open(resp.redirect_url, "_blank", "noopener,noreferrer");
        toast.success(
          `OneGate checkout opened for ${resp.method} — complete the test on their page, then Refresh stats.`,
        );
      } else {
        toast.error("No redirect URL returned from OneGate");
      }
    },
    onError: (err: any) => toast.error(err?.message || "Could not start test"),
  });

  // -------- Payout test mutation --------
  const startPayout = useMutation({
    mutationFn: async (body: OneGatePayoutTestPayload) => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.startPayoutTest(accountId, body);
    },
    onSuccess: (resp) => {
      toast.success(
        `Payout submitted (status ${resp.status || "pending"} · ref ${resp.reference})`,
      );
      queryClient.invalidateQueries({ queryKey: ["onegate-payout-methods", accountId] });
    },
    onError: (err: any) => toast.error(err?.message || "Payout failed"),
  });

  // -------- Intent persistence --------
  const updateIntent = useMutation({
    mutationFn: async (body: {
      deposits?: Record<string, OneGateSignoffIntent>;
      payouts?: Record<string, OneGateSignoffIntent>;
    }) => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.updateIntent(accountId, body);
    },
    onSuccess: (resp) => {
      // Patch local caches so the toggles & notes feel instant.
      queryClient.setQueryData(
        ["onegate-deposit-methods", accountId],
        (old: any) => updateLocalIntent(old, "deposits", resp.intent.deposits),
      );
      queryClient.setQueryData(
        ["onegate-payout-methods", accountId],
        (old: any) => updateLocalIntent(old, "payouts", resp.intent.payouts),
      );
    },
    onError: () => toast.error("Could not save sign-off intent"),
  });

  const handleIntentChange = (
    kind: "deposits" | "payouts",
    slug: string,
    patch: Partial<OneGateSignoffIntent>,
  ) => {
    const current = (() => {
      const list = kind === "deposits" ? deposits : payouts;
      const row = list.find((r) => r.slug === slug);
      return row?.intent ?? { will_use: null, notes: "" };
    })();
    const next: OneGateSignoffIntent = {
      will_use: patch.will_use ?? current.will_use,
      notes: patch.notes ?? current.notes,
    };
    updateIntent.mutate({ [kind]: { [slug]: next } } as any);
  };

  // -------- Export --------
  const exportArgs = () => ({
    deposits,
    payouts,
    context: {
      accountName: selectedAccount?.name ?? "Unknown",
      environment: selectedAccount?.active_environment ?? "sandbox",
      transactionCount: depositsQuery.data?.transaction_count ?? 0,
    },
  });
  const hasAnyData = deposits.length > 0 || payouts.length > 0;

  // -------- Render --------
  return (
    <div className="min-h-screen bg-muted">
      <Header
        organizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        organizations={organizations}
        accountId={accountId}
        onAccountChange={setAccountId}
        accounts={onegateAccounts}
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
                OneGate creates a separate merchant profile for live processing.
                Pick a sandbox/UAT account, or switch this one's{" "}
                <span className="font-mono">active_environment</span> to{" "}
                <span className="font-mono">sandbox</span>.
              </p>
            </div>
          </div>
        )}

        {/* Export bar */}
        <div className="bg-card border border-border rounded-xl px-4 py-3 flex items-center gap-2 flex-wrap">
          <div className="text-xs text-muted-foreground mr-1">
            Share results with OneGate:
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasAnyData}
            onClick={() => {
              try {
                exportOnegateSignoffExcel(exportArgs());
                toast.success("Excel export downloaded");
              } catch (e: any) {
                toast.error(e?.message || "Export failed");
              }
            }}
          >
            <FileSpreadsheet className="h-4 w-4 mr-1.5" />
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!hasAnyData}
            onClick={() => {
              try {
                exportOnegateSignoffPDF(exportArgs());
              } catch (e: any) {
                toast.error(e?.message || "Export failed");
              }
            }}
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Export PDF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto"
            disabled={!accountId || !isSandbox}
            onClick={() => {
              depositsQuery.refetch();
              payoutsQuery.refetch();
            }}
          >
            <RotateCw className="h-4 w-4 mr-1.5" />
            Refresh stats
          </Button>
        </div>

        {/* Deposits section */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">
              Deposit methods (pay-in)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Each card shows transaction counts pulled from OneGate's gateway
              transaction list. Sign-off passes a method when{" "}
              <span className="font-medium">at least one paid transaction</span>{" "}
              exists. Click "Start test deposit" to create a payment-key and
              open OneGate's hosted checkout in a new tab.
            </p>
          </div>
          {depositsQuery.isLoading ? (
            <div className="px-5 py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : deposits.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              No deposits loaded yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
              {deposits.map((row) => (
                <DepositCard
                  key={row.slug}
                  row={row}
                  isRunning={
                    startDeposit.isPending &&
                    startDeposit.variables?.slug === row.slug
                  }
                  onStart={(amount) =>
                    startDeposit.mutate({ slug: row.slug, amount })
                  }
                  onIntentChange={(patch) =>
                    handleIntentChange("deposits", row.slug, patch)
                  }
                />
              ))}
            </div>
          )}
        </section>

        {/* Payouts section */}
        <section className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-muted/40">
            <h2 className="text-sm font-semibold text-foreground">
              Payout methods (OTT REST)
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Counts come from local <code>OneGatePayout</code> rows on this
              account. Sign-off passes when at least one paid record exists per
              method you plan to use.
            </p>
          </div>
          {payoutsQuery.isLoading ? (
            <div className="px-5 py-8 flex items-center justify-center text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : payouts.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">
              No payout methods returned by OneGate.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {payouts.map((row) => (
                <PayoutCard
                  key={row.slug}
                  row={row}
                  isRunning={
                    startPayout.isPending &&
                    startPayout.variables?.payout_method_slug === row.slug
                  }
                  onSubmit={(body) => startPayout.mutate(body)}
                  onIntentChange={(patch) =>
                    handleIntentChange("payouts", row.slug, patch)
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header
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
      <div className="px-6 py-4 flex items-center gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold text-foreground">
            OneGate Sign-off
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Complete one paid transaction per deposit / payout method you'll
            use in production. Sandbox-only.
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
              <SelectValue placeholder="Select OneGate account" />
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
  );
}

// ---------------------------------------------------------------------------
// Deposit card
// ---------------------------------------------------------------------------

function DepositCard({
  row,
  isRunning,
  onStart,
  onIntentChange,
}: {
  row: OneGateDepositRow;
  isRunning: boolean;
  onStart: (amount: string) => void;
  onIntentChange: (patch: Partial<OneGateSignoffIntent>) => void;
}) {
  const status = badgeStatus(row.status);
  // Per-card amount state. Initialized from default_amount and resets if the
  // catalogue refreshes with a new default — most often when the user picks a
  // different account.
  const [amount, setAmount] = useState(row.default_amount);
  useEffect(() => {
    setAmount(row.default_amount);
  }, [row.default_amount, row.slug]);
  const amountValid = /^\d+(\.\d{0,2})?$/.test(amount.trim()) && Number(amount) > 0;

  return (
    <div
      className={
        "rounded-lg border bg-card p-4 flex flex-col gap-3 " + intentTone(row.intent)
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground font-mono">
            payment_type: {row.payment_type}
          </div>
          <div className="text-sm font-semibold mt-0.5">{row.label}</div>
          {row.note && (
            <div className="text-[11px] text-muted-foreground mt-1">
              {row.note}
            </div>
          )}
        </div>
        <StatusBadge status={status.status} label={status.label} size="sm" />
      </div>
      <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
        <span>
          Paid <span className="font-mono text-emerald-700">{row.paid}</span>
        </span>
        <span>·</span>
        <span>
          Failed <span className="font-mono text-rose-700">{row.failed}</span>
        </span>
        <span>·</span>
        <span>
          Pending <span className="font-mono">{row.pending}</span>
        </span>
        <span className="ml-auto font-mono">{row.total} total</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground">R</span>
          <Input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={row.default_amount}
            aria-label={`Test amount for ${row.label}`}
            className={
              "h-8 w-24 font-mono text-xs " +
              (amountValid ? "" : "border-rose-400 focus-visible:ring-rose-200")
            }
          />
        </div>
        <Button
          size="sm"
          disabled={isRunning || !amountValid}
          onClick={() => onStart(amount.trim())}
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-1" />
          )}
          Start test deposit
        </Button>
        {!amountValid && (
          <span className="text-[11px] text-rose-600">
            Enter a positive amount
          </span>
        )}
      </div>
      <IntentControls intent={row.intent} onChange={onIntentChange} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payout card (with inline test-payout form)
// ---------------------------------------------------------------------------

function PayoutCard({
  row,
  isRunning,
  onSubmit,
  onIntentChange,
}: {
  row: OneGatePayoutRow;
  isRunning: boolean;
  onSubmit: (body: OneGatePayoutTestPayload) => void;
  onIntentChange: (patch: Partial<OneGateSignoffIntent>) => void;
}) {
  const status = badgeStatus(row.status);
  const [formOpen, setFormOpen] = useState(false);

  return (
    <div className={"px-5 py-4 " + intentTone(row.intent).replace("bg-", "").trim()}>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => setFormOpen((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-primary"
        >
          {formOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <span className="font-mono text-xs text-muted-foreground">
            {row.slug}
          </span>
          <span>·</span>
          <span>{row.name}</span>
        </button>
        <StatusBadge status={status.status} label={status.label} size="sm" />
        <div className="text-[11px] text-muted-foreground flex items-center gap-2 ml-2">
          <span>
            Paid <span className="font-mono text-emerald-700">{row.paid}</span>
          </span>
          <span>·</span>
          <span>
            Failed <span className="font-mono text-rose-700">{row.failed}</span>
          </span>
          <span>·</span>
          <span>
            Pending <span className="font-mono">{row.pending + row.batched}</span>
          </span>
          <span>·</span>
          <span className="font-mono">{row.total} total</span>
        </div>
        <div className="ml-auto">
          <Button
            size="sm"
            variant={formOpen ? "outline" : "primary"}
            onClick={() => setFormOpen(true)}
          >
            <Play className="h-4 w-4 mr-1" />
            Send test payout
          </Button>
        </div>
      </div>
      {formOpen && (
        <PayoutTestForm
          slug={row.slug}
          isRunning={isRunning}
          onCancel={() => setFormOpen(false)}
          onSubmit={onSubmit}
        />
      )}
      <div className="mt-3 pt-3 border-t border-border/60">
        <IntentControls intent={row.intent} onChange={onIntentChange} />
      </div>
    </div>
  );
}

function PayoutTestForm({
  slug,
  isRunning,
  onCancel,
  onSubmit,
}: {
  slug: string;
  isRunning: boolean;
  onCancel: () => void;
  onSubmit: (body: OneGatePayoutTestPayload) => void;
}) {
  const [form, setForm] = useState<OneGatePayoutTestPayload>({
    payout_method_slug: slug,
    amount: "5.00",
    first_name: "Test",
    surname: "Signoff",
    mobile: "",
    account_number: "",
    branch_code: "",
    id_number: "",
    email: "",
  });

  return (
    <form
      className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/40 rounded-lg p-3"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(form);
      }}
    >
      <Field label="Amount (ZAR)">
        <Input
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          inputMode="decimal"
        />
      </Field>
      <Field label="First name">
        <Input
          required
          value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })}
        />
      </Field>
      <Field label="Surname">
        <Input
          required
          value={form.surname}
          onChange={(e) => setForm({ ...form, surname: e.target.value })}
        />
      </Field>
      <Field label="Mobile">
        <Input
          required
          placeholder="0821234567"
          value={form.mobile}
          onChange={(e) => setForm({ ...form, mobile: e.target.value })}
        />
      </Field>
      <Field label="Account number (bank methods only)">
        <Input
          value={form.account_number}
          onChange={(e) =>
            setForm({ ...form, account_number: e.target.value })
          }
        />
      </Field>
      <Field label="Branch code (bank methods only)">
        <Input
          value={form.branch_code}
          onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
        />
      </Field>
      <Field label="ID number (optional)">
        <Input
          value={form.id_number}
          onChange={(e) => setForm({ ...form, id_number: e.target.value })}
        />
      </Field>
      <Field label="Email (optional)">
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <div className="md:col-span-3 flex items-center gap-2 justify-end">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" size="sm" disabled={isRunning || !form.mobile}>
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-1" />
          )}
          Submit test payout
        </Button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Intent toggle + notes (per method)
// ---------------------------------------------------------------------------

function IntentControls({
  intent,
  onChange,
}: {
  intent: OneGateSignoffIntent;
  onChange: (patch: Partial<OneGateSignoffIntent>) => void;
}) {
  // Local-only notes state so typing doesn't fire a PUT per keystroke.
  const [draft, setDraft] = useState(intent.notes);
  useEffect(() => setDraft(intent.notes), [intent.notes]);

  return (
    <div className="flex items-start gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <Switch
          checked={intent.will_use === true}
          onCheckedChange={(v) => onChange({ will_use: v ? true : false })}
        />
        <span className="text-[11px] text-muted-foreground">
          {intent.will_use === true
            ? "Will use in production"
            : intent.will_use === false
            ? "Not using in production"
            : "Production intent: undecided"}
        </span>
      </div>
      <Textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== intent.notes) onChange({ notes: draft });
        }}
        placeholder="Notes — e.g. 'Primary EFT method' or 'Not planned for live'"
        className="text-[11px] min-h-[40px] flex-1 min-w-[240px]"
        rows={1}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Local cache helper — overlays a fresh intent map on top of cached data so
// the UI reflects PUT responses instantly without a refetch.
// ---------------------------------------------------------------------------

function updateLocalIntent(
  cached: any,
  _kind: "deposits" | "payouts",
  intentMap: Record<string, OneGateSignoffIntent>,
) {
  if (!cached) return cached;
  const list = cached.methods ?? [];
  return {
    ...cached,
    methods: list.map((row: any) =>
      intentMap[row.slug] ? { ...row, intent: intentMap[row.slug] } : row,
    ),
  };
}
