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
  type OneGateConstants,
  type OneGateDepositRow,
  type OneGatePayoutRow,
  type OneGatePayoutTestPayload,
  type OneGateSignoffIntent,
  type OneGateSignoffStep,
  type OneGateSignoffTestCaseResult,
  type SignoffBadge,
} from "@/lib/onegate-api";
import { exportOnegateSignoffExcel, exportOnegateSignoffPDF } from "@/lib/onegate-signoff-export";
import { PageHeader } from "@/components/layout/page-header";
import OttPayoutsSection from "./OttPayoutsSection";

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

  // Reference enums from the OneGate "Constants" docs page — banks,
  // account types, payment types, etc. Single backend source of truth
  // so the UI never hard-codes any of them.
  const { data: constants } = useQuery({
    queryKey: ["onegate-constants"],
    queryFn: () => onegateApi.getConstants(),
    staleTime: 30 * 60 * 1000, // 30 min — constants change rarely
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
      // Don't pass return_url from the browser — the backend pulls
      // gateway_return_url straight off the ProviderAccount admin
      // record and uses it verbatim. Passing window.location.origin from
      // a localhost dev session would just be rejected.
      const method = deposits.find((m) => m.slug === slug);
      return onegateApi.startDepositTest(accountId, {
        slug,
        amount: amount || method?.default_amount || "10.00",
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

  // -------- Test Case 1: Webhook compliance check --------
  // One-shot mutation that runs the IP-whitelist + endpoint-reachability
  // checks defined in OneGate's "Webhooks – Best Practices" letter.
  const [tc1Result, setTc1Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const runCompliance = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runWebhookCompliance(accountId);
    },
    onSuccess: (resp) => {
      setTc1Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 1 passed");
      } else {
        toast.error("Test Case 1 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run webhook compliance check"),
  });

  // -------- Test Case 2: API V2 authentication round-trip --------
  // Fires a real GET /eft-banks with fresh auth headers and captures the
  // request + response envelope so the merchant can paste either side
  // into a CallPay support ticket.
  const [tc2Result, setTc2Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const runAuthTest = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runApiV2AuthTest(accountId);
    },
    onSuccess: (resp) => {
      setTc2Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 2 passed");
      } else {
        toast.error("Test Case 2 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run API V2 auth test"),
  });

  // -------- Test Case 3: Validate Account API request --------
  // Exercises POST /api/v2/payout/validate-account against merchant-
  // supplied account details. Each input falls back to the docs example
  // when left blank so a quick smoke-test still works without typing.
  const [tc3Result, setTc3Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc3Form, setTc3Form] = useState<PayoutAccountFormValue>({
    bank: "ABSA",
    branch: "632005",
    account_number: "1234567890",
    account_type: "cheque",
    customer_name: "Sign-off Test",
  });
  const runValidateAccount = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runValidateAccountTest(accountId, tc3Form);
    },
    onSuccess: (resp) => {
      setTc3Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 3 passed");
      } else {
        toast.error("Test Case 3 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run validate-account test"),
  });

  // -------- Test Case 4: Queue Payout API request --------
  // Same account-detail fields as TC3 plus amount + reference. The
  // queued record sits "pending" on the OneGate dashboard until a
  // Refactored: TC4 now runs the modern /api/v2/ott-payouts/rest flow
  // (Discover → Perform → Balance → Status). Step 2 actually disburses
  // — defaults to ott-voucher / R1.00 to keep the footprint small.
  const [tc4Result, setTc4Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc4Form, setTc4Form] = useState({
    payout_method_slug: "ott-voucher",
    reference: "",
    amount: "1.00",
    first_name: "Sign-off",
    surname: "Test",
    mobile: "27821234567",
    id_number: "9905176857085",
    id_type: "RSAID",
    date_of_birth: "19990517",
    title: "Mr",
    nationality: "ZA",
    country_of_issue: "ZA",
  });
  const runQueuePayout = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runQueuePayoutTest(accountId, tc4Form);
    },
    onSuccess: (resp) => {
      setTc4Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 4 passed");
      } else {
        toast.error("Test Case 4 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run queue-payout test"),
  });

  // -------- Test Case 12: List Organisation Services --------
  // (Was TC5; renumbered to the end of the suite so the runnable
  // test cases stack in docs order.)
  // Canonical auth-proving request from the docs:
  //   GET /api/v2/organisation/{org_id}/services
  // Confirms credentials are valid AND surfaces what CallPay has
  // activated for the merchant (credit_card, ott_payout, etc.).
  const [tc5Result, setTc5Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const runListServices = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runListOrgServicesTest(accountId);
    },
    onSuccess: (resp) => {
      setTc5Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 12 passed");
      } else {
        toast.error("Test Case 12 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not list organisation services"),
  });

  // -------- Test Case 5: Service Redirect (Bill-Payment Hosted Checkout) --------
  // Bill-payments + collections use Service Redirect per the
  // architectural decision: hand the payer off to CallPay's hosted page
  // instead of building our own UI.
  const [tc6Result, setTc6Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc6Form, setTc6Form] = useState({
    payment_type: "all",
    amount: "1.00",
    merchant_reference: "",
  });
  const runServiceRedirect = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runServiceRedirectTest(accountId, tc6Form);
    },
    onSuccess: (resp) => {
      setTc6Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 5 passed — open the checkout URL");
      } else {
        toast.error("Test Case 5 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not mint payment key"),
  });

  // -------- Test Case 6: Credit Card Token (Enterprise) --------
  // Three-step end-to-end run: card-enquiry → tokenise → pay-with-token.
  // PCI WARNING: only use the docs test card (4242...) for sign-off
  // runs. Production credit-card collection goes via Redirect (TC6).
  const [tc7Result, setTc7Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc7Form, setTc7Form] = useState({
    pan: "4242424242424242",
    expiry: "1230",
    cvv: "123",
    merchant_reference: "",
    amount: "1.00",
  });
  const runCardTokenDirect = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runCardTokenDirectTest(accountId, tc7Form);
    },
    onSuccess: (resp) => {
      setTc7Result(resp.result);
      // Auto-populate the schedule form's token guid from the
      // tokenise step's extras so TC8 can run without copy-paste.
      const tokeniseStep = resp.result.steps.find(
        (s) => s.slug === "card_token_direct",
      );
      const newGuid = (tokeniseStep?.extras as Record<string, unknown> | undefined)
        ?.token_guid as string | undefined;
      if (newGuid) {
        setTc8Form((prev) => ({ ...prev, token_guid: newGuid }));
      }
      if (resp.result.summary === "passed") {
        toast.success("Test Case 6 passed — full Enterprise flow worked");
      } else {
        toast.error("Test Case 6 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run card-token test"),
  });

  // -------- Test Case 8: Payment Schedule (CRUD) --------
  // Schedules recurring charges against a token. start_date defaults
  // to 30 days from today so the schedule's safely in the future.
  const tc8DefaultStartDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
  })();
  const [tc8Result, setTc8Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc8Form, setTc8Form] = useState({
    token_guid: "",
    interval: "monthly",
    amount: "1.00",
    start_date: tc8DefaultStartDate,
    count: "2",
  });
  const runPaymentSchedule = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runPaymentScheduleTest(accountId, tc8Form);
    },
    onSuccess: (resp) => {
      setTc8Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 8 passed — full CRUD cycle worked");
      } else {
        toast.error("Test Case 8 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run schedule test"),
  });

  // -------- Test Case 9: EFTsecure --------
  // One payment-key drives all three EFTsecure modes (Hosted / Self
  // Hosted / Checkout). Toggle ``use_custom_beneficiary`` to exercise
  // the auto-computed SHA256 hash.
  const [tc9Result, setTc9Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc9Form, setTc9Form] = useState({
    amount: "1.00",
    merchant_reference: "",
    use_custom_beneficiary: false,
    beneficiary_account_number: "1234567890",
    beneficiary_name: "Sign-off Test Merchant",
    beneficiary_account_type: "cheque",
    beneficiary_bank: "ABSA",
  });
  const runEftSecure = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runEftSecureTest(accountId, tc9Form);
    },
    onSuccess: (resp) => {
      setTc9Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 9 passed — EFTsecure key + URL ready");
      } else {
        toast.error("Test Case 9 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run EFTsecure test"),
  });

  // -------- Test Case 7: Server-to-Server Pay Direct --------
  // PCI-scope server-to-server card charge. Test cards only.
  const [tc10Result, setTc10Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc10Form, setTc10Form] = useState<CardTokenDirectFormValue>({
    pan: "4242424242424242",
    expiry: "1230",
    cvv: "123",
    merchant_reference: "",
    amount: "1.00",
    first_name: "Sign-off",
    last_name: "Test",
  });
  const runPayDirect = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runPayDirectTest(accountId, tc10Form);
    },
    onSuccess: (resp) => {
      setTc10Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 7 passed — Pay Direct accepted");
      } else {
        toast.error("Test Case 7 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run pay-direct test"),
  });

  // -------- Test Case 10: Voucher Payment Setup --------
  // Mints payment-key for any of the 5 voucher types. amount=0 by
  // default (full redemption — the universally-supported path).
  const [tc12Result, setTc12Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc12Form, setTc12Form] = useState({
    payment_type: "ott_voucher",
    amount: "0",
    merchant_reference: "",
  });
  const runVoucherPayment = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      // OneGate UAT feedback: pass amount=0 for EVERY voucher deposit method
      // (1Voucher, BluVoucher, EasyLoad, EasyPay/4All, OTT). OneGate captures
      // the value from the PIN entered on their hosted page — force it here so
      // the form can never submit a non-zero voucher amount.
      return onegateApi.runVoucherPaymentTest(accountId, { ...tc12Form, amount: "0" });
    },
    onSuccess: (resp) => {
      setTc12Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 10 passed — voucher key ready");
      } else {
        toast.error("Test Case 10 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run voucher test"),
  });

  // -------- Test Case 11: Transaction Recon & Tooling --------
  // Read-only by default (List + View). Refund + Resend Webhook are
  // opt-in via checkboxes since both are destructive / spammy.
  const [tc16Result, setTc16Result] =
    useState<OneGateSignoffTestCaseResult | null>(null);
  const [tc16Form, setTc16Form] = useState({
    transaction_id: "",
    merchant_reference: "",
    payment_key: "",
    do_refund: false,
    refund_amount: "",
    do_resend_webhook: false,
    resend_webhook_url: "",
  });
  const runRecon = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error("Pick an account");
      return onegateApi.runReconTest(accountId, tc16Form);
    },
    onSuccess: (resp) => {
      setTc16Result(resp.result);
      if (resp.result.summary === "passed") {
        toast.success("Test Case 11 passed — recon endpoints healthy");
      } else {
        toast.error("Test Case 11 failed — see step details");
      }
    },
    onError: (err: any) =>
      toast.error(err?.message || "Could not run recon test"),
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
  // Collect every test-case run that has produced a result (regardless of
  // pass/fail) so the export can render the request + response panels per
  // step. The JS state vars keep their original names (tc1..tc16) but the
  // ``test_case`` integer inside each result is the renumbered display
  // value — the export sorts on that, not the variable name.
  const collectTestCases = (): OneGateSignoffTestCaseResult[] => {
    const all = [
      tc1Result,
      tc2Result,
      tc3Result,
      tc4Result,
      tc5Result,
      tc6Result,
      tc7Result,
      tc8Result,
      tc9Result,
      tc10Result,
      tc12Result,
      tc16Result,
    ];
    return all.filter(
      (r): r is OneGateSignoffTestCaseResult => r != null,
    );
  };

  const exportArgs = () => ({
    deposits,
    payouts,
    testCases: collectTestCases(),
    context: {
      accountName: selectedAccount?.name ?? "Unknown",
      environment: selectedAccount?.active_environment ?? "sandbox",
      transactionCount: depositsQuery.data?.transaction_count ?? 0,
    },
  });
  const hasAnyData = deposits.length > 0 || payouts.length > 0;

  // -------- Render --------
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="OneGate Sign-off"
        subtitle="Complete one paid transaction per deposit / payout method you'll use in production. Sandbox-only."
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "OneGate Sign-off" },
        ]}
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
      >
        <Select
          value={accountId || undefined}
          onValueChange={setAccountId}
          disabled={accountsLoading || onegateAccounts.length === 0}
        >
          <SelectTrigger className="w-[280px] h-9 bg-card border-border">
            <SelectValue placeholder="Select OneGate account" />
          </SelectTrigger>
          <SelectContent>
            {onegateAccounts.map((a) => (
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
      </PageHeader>

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

        {/* Test Case 1 — webhook best-practices compliance */}
        <TestCaseSection
          result={tc1Result}
          isRunning={runCompliance.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runCompliance.mutate()}
          testCaseNumber={1}
          label="Verify webhook best-practices compliance"
          description={
            <>
              Drives the two requirements from CallPay's{" "}
              <span className="font-medium">Webhooks – Best Practices</span>{" "}
              letter: both documented CallPay IPs whitelisted, and{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                GET /api/v2/gateway-transaction/{"{id}"}
              </code>{" "}
              reachable for status cross-verification.
            </>
          }
        />

        {/* Test Case 2 — API V2 authentication round-trip */}
        <TestCaseSection
          result={tc2Result}
          isRunning={runAuthTest.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runAuthTest.mutate()}
          testCaseNumber={2}
          label="Verify API V2 authentication round-trip"
          description={
            <>
              Mints fresh{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                Auth-Token
              </code>{" "}
              /{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                Org-Id
              </code>{" "}
              /{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                Timestamp
              </code>{" "}
              headers per the docs spec (sha256 hash of{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                {"{api_salt}_{org_id}_{timestamp}"}
              </code>
              , 15-min validity), then fires a live{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                GET /api/v2/eft-banks
              </code>{" "}
              to confirm OneGate accepts them.
            </>
          }
        />

        {/* Test Case 3 — Validate Account API request */}
        <TestCaseSection
          result={tc3Result}
          isRunning={runValidateAccount.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runValidateAccount.mutate()}
          testCaseNumber={3}
          label="Validate Account API request"
          description={
            <>
              Fires{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                POST /api/v2/payout/validate-account
              </code>{" "}
              with the account details below. Confirms format only — the
              endpoint does NOT verify the account exists. A 200 with{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                success: false
              </code>{" "}
              ("CDV invalid") still proves the endpoint is healthy.
            </>
          }
          controls={
            <PayoutAccountForm
              value={tc3Form}
              onChange={setTc3Form}
              disabled={runValidateAccount.isPending}
              constants={constants}
              resetValue={{
                bank: "ABSA",
                branch: "632005",
                account_number: "1234567890",
                account_type: "cheque",
                customer_name: "Sign-off Test",
              }}
            />
          }
        />

        {/* Test Case 4 — OTT Payouts (refactored from queue → REST) */}
        <TestCaseSection
          result={tc4Result}
          isRunning={runQueuePayout.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runQueuePayout.mutate()}
          testCaseNumber={4}
          label="OTT Payouts — Discover → Perform → Balance → Status"
          description={
            <>
              The modern REST-based payouts flow per docs. Four steps:
              discover available services, fire{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                POST /api/v2/ott-payouts/rest
              </code>{" "}
              against the chosen service, check float balance, then
              look up the payout by reference. Default target is{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                ott-voucher
              </code>{" "}
              / R1.00 — step 2 actually disburses, so keep the amount
              small and use a slug with cheap unit failure cost.
            </>
          }
          controls={
            <OttPayoutForm
              value={tc4Form}
              onChange={setTc4Form}
              disabled={runQueuePayout.isPending}
              constants={constants}
            />
          }
        />

        {/* Payment-method matrix sourced from the DB — shows which
            integration modes (enterprise / checkout / redirect) each
            CallPay payment method supports per the docs. */}
        {constants?.payment_methods && constants.payment_methods.length > 0 && (
          <PaymentMethodMatrix
            paymentMethods={constants.payment_methods}
            integrationMethods={constants.integration_methods ?? []}
          />
        )}

        {/* Test Case 5 — Service Redirect (rendered above TC5 since
            it's the primary bill-payment flow per the architectural
            decision). */}
        <TestCaseSection
          result={tc6Result}
          isRunning={runServiceRedirect.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runServiceRedirect.mutate()}
          testCaseNumber={5}
          label="Service Redirect — Bill-Payment Hosted Checkout"
          description={
            <>
              Bill-payments + collections use{" "}
              <span className="font-medium">Service Redirect</span>: we
              call{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                POST /api/v2/payment-key
              </code>
              , CallPay returns a hosted-checkout URL, and the payer
              is redirected there. CallPay handles all PCI-scope UI and
              webhooks back to us when the payment completes. Open the
              returned URL in a new tab to verify the hosted page
              renders correctly.
            </>
          }
          controls={
            <ServiceRedirectForm
              value={tc6Form}
              onChange={setTc6Form}
              disabled={runServiceRedirect.isPending}
              constants={constants}
            />
          }
        />

        {/* Test Case 6 — Credit Card Token (Enterprise) end-to-end */}
        <TestCaseSection
          result={tc7Result}
          isRunning={runCardTokenDirect.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runCardTokenDirect.mutate()}
          testCaseNumber={6}
          label="Credit Card Token (Enterprise) — Enquiry → Tokenise → Pay"
          description={
            <>
              The full server-to-server credit-card flow: card-enquiry
              (pre-flight) →{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                /customer-token/direct
              </code>{" "}
              (tokenise) →{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                /customer-token/{"{guid}"}/pay
              </code>{" "}
              (charge). Each step shows its own request + response panel.
              PAN + CVV are masked in the captured request panels so the
              JSON is safe to paste anywhere.{" "}
              <span className="font-medium text-amber-700">
                Sign-off runs MUST use the docs test card 4242 4242 4242
                4242 — production credit-card collection uses Redirect
                (Test Case 5) to keep us out of PCI scope.
              </span>
            </>
          }
          controls={
            <CardTokenDirectForm
              value={tc7Form}
              onChange={setTc7Form}
              disabled={runCardTokenDirect.isPending}
            />
          }
        />

        {/* Test Case 7 — Server-to-Server Pay Direct */}
        <TestCaseSection
          result={tc10Result}
          isRunning={runPayDirect.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runPayDirect.mutate()}
          testCaseNumber={7}
          label="Credit Card — Server to Server (Pay Direct)"
          description={
            <>
              Direct PAN-to-charge via{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                POST /api/v2/pay/direct
              </code>
              . Server-to-Server is the third Credit Card integration
              mode (alongside Redirect / Checkout). Response is either{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                type=result
              </code>{" "}
              (direct settlement) or{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                type=3ds_redirect
              </code>{" "}
              (3DS challenge URL surfaced via the "Open 3DS challenge"
              button).{" "}
              <span className="font-medium text-amber-700">
                PCI WARNING: only use known test PANs.
              </span>
            </>
          }
          controls={
            <CardTokenDirectForm
              value={tc10Form}
              onChange={setTc10Form}
              disabled={runPayDirect.isPending}
              showCardholderName
              resetValue={{
                pan: "4242424242424242",
                expiry: "1230",
                cvv: "123",
                merchant_reference: "",
                amount: "1.00",
                first_name: "Sign-off",
                last_name: "Test",
              }}
            />
          }
        />

        {/* Test Case 8 — Payment Schedule (CRUD) */}
        <TestCaseSection
          result={tc8Result}
          isRunning={runPaymentSchedule.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runPaymentSchedule.mutate()}
          testCaseNumber={8}
          label="Payment Schedule — Create → View → Update → Delete"
          description={
            <>
              CRUD cycle against{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                /payment-schedule
              </code>{" "}
              for a tokenised card. Requires a token guid from Test
              Case 7 (auto-filled below after a successful TC7 run).
              The Delete step always runs — even if Create/Update
              failed — so we don't leave orphan schedules on the
              gateway.
            </>
          }
          controls={
            <PaymentScheduleForm
              value={tc8Form}
              onChange={setTc8Form}
              disabled={runPaymentSchedule.isPending}
            />
          }
        />

        {/* Test Case 9 — EFTsecure end-to-end */}
        <TestCaseSection
          result={tc9Result}
          isRunning={runEftSecure.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runEftSecure.mutate()}
          testCaseNumber={9}
          label="EFTsecure — Banks → Payment Key → (optional) Custom Beneficiary"
          description={
            <>
              Drives all three EFTsecure modes (Hosted / Self Hosted /
              Checkout) — they share the same backend. Step 1 lists the
              live bank set, Step 2 mints a payment-key for{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                payment_type=eft
              </code>{" "}
              (hosted page URL surfaced via the "Open URL" button),
              Step 3 optionally overrides the beneficiary with an
              auto-computed SHA256 hash to prove the hash helper agrees
              with the gateway.
            </>
          }
          controls={
            <EftSecureForm
              value={tc9Form}
              onChange={setTc9Form}
              disabled={runEftSecure.isPending}
              constants={constants}
            />
          }
        />

        {/* Test Case 10 — Voucher Payment Setup */}
        <TestCaseSection
          result={tc12Result}
          isRunning={runVoucherPayment.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runVoucherPayment.mutate()}
          testCaseNumber={10}
          label="Voucher Payment Setup"
          description={
            <>
              Mints a hosted-checkout key for any of the 5 voucher
              types (OTT / 1Voucher / BluVoucher / EasyPay / EasyLoad).
              Per docs:{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                amount=0
              </code>{" "}
              triggers <span className="font-medium">full redemption</span>{" "}
              (the universally-supported path). Partial redemption is
              only enabled for OTT-Voucher and 1Voucher; Blu / EasyPay /
              EasyLoad require amount=0.
            </>
          }
          controls={
            <VoucherPaymentForm
              value={tc12Form}
              onChange={setTc12Form}
              disabled={runVoucherPayment.isPending}
              constants={constants}
            />
          }
        />

        {/* Test Case 11 — Transaction Recon & Tooling */}
        <TestCaseSection
          result={tc16Result}
          isRunning={runRecon.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runRecon.mutate()}
          testCaseNumber={11}
          label="Transaction Recon & Tooling"
          description={
            <>
              Read-only by default: lists the org's transactions and
              optionally looks one up by id / merchant reference /
              payment key. The Refund and Resend Webhook steps are{" "}
              <span className="font-medium text-amber-700">opt-in</span>{" "}
              — toggle them on for the destructive paths.
            </>
          }
          controls={
            <ReconForm
              value={tc16Form}
              onChange={setTc16Form}
              disabled={runRecon.isPending}
            />
          }
        />

        {/* Test Case 12 — List Organisation Services (was TC5) */}
        <TestCaseSection
          result={tc5Result}
          isRunning={runListServices.isPending}
          canRun={!!accountId && isSandbox}
          onRun={() => runListServices.mutate()}
          testCaseNumber={12}
          label="List Organisation Services"
          description={
            <>
              Fires CallPay's canonical auth-proving request:{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                GET /api/v2/organisation/{"{org_id}"}/services
              </code>
              . Confirms credentials are valid AND surfaces which
              payment-method services CallPay has activated for the
              merchant (e.g.{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                credit_card
              </code>
              ,{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                ott_payout
              </code>
              ,{" "}
              <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
                kazangvoucher
              </code>
              ).
            </>
          }
        />

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
            <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
              <span className="font-medium text-foreground">Redirect URLs:</span>{" "}
              every deposit is sent with{" "}
              <code className="bg-muted px-1 rounded">success_url</code>,{" "}
              <code className="bg-muted px-1 rounded">cancel_url</code> and{" "}
              <code className="bg-muted px-1 rounded">error_url</code> — these are
              what EFTsecure, OZOW EFT and all voucher methods use to return the
              customer to us.{" "}
              <code className="bg-muted px-1 rounded">return_url</code> is honoured
              by OneGate <span className="font-medium">only</span> for 3DS card
              (Direct) payments, so the backend maps it onto{" "}
              <code className="bg-muted px-1 rounded">success_url</code> for the
              non-card methods rather than relying on it.
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
                  constants={constants}
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

        {/* OTT Payouts (REST) — DB-catalog driven test, mirrors the bill modal */}
        <OttPayoutsSection accountId={accountId} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// <TestCaseSection> — uniform renderer for every sign-off test case.
//
// Each step shows status badge + label + detail. If the step captured an
// HTTP request, we render side-by-side "Request" and "Response" panels
// so the merchant can paste either side to CallPay support. Local-only
// steps (no HTTP call) just show extras / detail.
// ---------------------------------------------------------------------------

function TestCaseSection({
  result,
  isRunning,
  canRun,
  onRun,
  testCaseNumber,
  label,
  description,
  controls,
}: {
  result: OneGateSignoffTestCaseResult | null;
  isRunning: boolean;
  canRun: boolean;
  onRun: () => void;
  testCaseNumber: number;
  label: string;
  description: React.ReactNode;
  /** Optional form/controls rendered above the Run button and the
   *  results panel. Use this for test cases that need merchant input
   *  (e.g. Test Case 3 takes account details). */
  controls?: React.ReactNode;
}) {
  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-foreground">
            Test Case {testCaseNumber}: {label}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        {result && (
          <StatusBadge
            status={result.summary === "passed" ? "success" : "failed"}
            label={result.summary}
            size="sm"
          />
        )}
        <Button
          variant={result ? "outline" : "primary"}
          size="sm"
          disabled={!canRun || isRunning}
          onClick={onRun}
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : result ? (
            <RotateCw className="h-4 w-4 mr-1" />
          ) : (
            <Play className="h-4 w-4 mr-1" />
          )}
          {result ? "Re-run" : "Run"}
        </Button>
      </div>
      {controls && (
        <div className="px-5 py-3 border-b border-border/60 bg-muted/20">
          {controls}
        </div>
      )}
      {result && (
        <div className="px-5 py-4 space-y-4">
          {result.steps.map((step) => (
            <TestCaseStep key={step.slug} step={step} />
          ))}
          <div className="text-[11px] text-muted-foreground border-t border-border/60 pt-2">
            Ran at{" "}
            <code className="bg-muted px-1 rounded">
              {new Date(result.ran_at).toLocaleString()}
            </code>
            . Paste this section to CallPay support when they ask for
            confirmation.
          </div>
        </div>
      )}
    </section>
  );
}

function TestCaseStep({ step }: { step: OneGateSignoffStep }) {
  const extrasIpList = (() => {
    const expected = step.extras?.expected as string[] | undefined;
    const effective = step.extras?.effective as string[] | undefined;
    if (!expected || !effective) return null;
    return (
      <div className="mt-1 text-[11px] font-mono text-muted-foreground">
        expected: {expected.join(", ")}
        {" · "}
        effective: {effective.join(", ") || "(none)"}
      </div>
    );
  })();

  // Generic "open URL" button — picked up from extras for any step
  // whose result includes a URL the merchant should visually verify
  // (e.g. the Service Redirect hosted-checkout URL on TC6, or the
  // 3DS challenge URL on TC7 step 3).
  const openUrl =
    (step.extras?.redirect_url as string | undefined) ||
    (step.extras?.url as string | undefined) ||
    "";
  const openUrlLabel =
    step.extras?.kind === "3ds_redirect"
      ? "Open 3DS challenge"
      : "Open URL";

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3 text-sm">
        <StatusBadge
          status={step.passed ? "success" : "failed"}
          label={step.passed ? "pass" : "fail"}
          size="sm"
        />
        <div className="min-w-0 flex-1">
          <div className="font-medium text-foreground">{step.label}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {step.detail}
          </div>
          {extrasIpList}
        </div>
        {openUrl && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(openUrl, "_blank", "noopener")}
            title={openUrl}
          >
            <ExternalLink className="h-3.5 w-3.5 mr-1" />
            {openUrlLabel}
          </Button>
        )}
      </div>
      {(step.request || step.response) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-[4.5rem]">
          {step.request && (
            <RequestPanel request={step.request} />
          )}
          {step.response && (
            <ResponsePanel response={step.response} />
          )}
        </div>
      )}
    </div>
  );
}

function RequestPanel({
  request,
}: {
  request: NonNullable<OneGateSignoffStep["request"]>;
}) {
  return (
    <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Request
      </div>
      <div className="p-3 space-y-1.5 text-[11px] font-mono">
        <div>
          <span className="text-muted-foreground">{request.method}</span>{" "}
          <span className="break-all">{request.url}</span>
        </div>
        <div className="border-t border-border/40 pt-1.5 space-y-0.5">
          {Object.entries(request.headers).map(([k, v]) => (
            <div key={k} className="flex gap-2">
              <span className="text-muted-foreground">{k}:</span>
              <span className="break-all">{v}</span>
            </div>
          ))}
        </div>
        {request.body !== null && request.body !== undefined && (
          <pre className="border-t border-border/40 pt-1.5 whitespace-pre-wrap break-words text-[10px]">
            {JSON.stringify(request.body, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}

function ResponsePanel({
  response,
}: {
  response: NonNullable<OneGateSignoffStep["response"]>;
}) {
  const ok = response.status_code >= 200 && response.status_code < 300;
  const codeClass = ok
    ? "text-emerald-700"
    : response.status_code === 404
      ? "text-amber-700"
      : "text-red-700";
  const bodyJson =
    typeof response.body === "string"
      ? response.body
      : JSON.stringify(response.body, null, 2);
  return (
    <div className="rounded-md border border-border bg-muted/30 overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center justify-between">
        <span>Response</span>
        <span className={`font-mono ${codeClass}`}>
          {response.status_code}
          {response.latency_ms != null && (
            <span className="text-muted-foreground ml-2">
              {response.latency_ms}ms
            </span>
          )}
        </span>
      </div>
      <div className="p-3">
        <pre className="whitespace-pre-wrap break-words text-[10px] font-mono max-h-64 overflow-y-auto">
          {bodyJson || "(empty)"}
        </pre>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// <PaymentMethodMatrix> — read-only docs matrix.
//
// Renders the "Payment Method Types" table from the OneGate docs,
// sourced live from ``ProviderConstant`` (kind=payment_method). Three
// columns of badges (Enterprise / Checkout / Redirect) make it obvious
// at a glance which modes are available for each method. Read-only;
// editing is via Django admin against the ProviderConstant rows.
// ---------------------------------------------------------------------------

function PaymentMethodMatrix({
  paymentMethods,
  integrationMethods,
}: {
  paymentMethods: OneGateConstants["payment_methods"];
  integrationMethods: OneGateConstants["integration_methods"];
}) {
  // Column order: enterprise → checkout → redirect (matches docs).
  const columns = ["enterprise", "checkout", "redirect"];
  const colLabels = Object.fromEntries(
    integrationMethods.map((m) => [m.slug, m.label]),
  );

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/40">
        <h2 className="text-sm font-semibold text-foreground">
          Payment Methods × Integration Modes
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          Live from{" "}
          <code className="text-[11px] bg-muted px-1 py-0.5 rounded">
            ProviderConstant
          </code>
          . Each row shows which of the three OneGate integration modes
          a payment method supports. Bill-payments + collections use
          Redirect; admin / management flows (validate-account,
          queue-payout) use Enterprise.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-muted/20 border-b border-border">
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                Payment method
              </th>
              <th className="text-left px-4 py-2 font-medium text-muted-foreground">
                payment_type
              </th>
              {columns.map((c) => (
                <th
                  key={c}
                  className="text-center px-4 py-2 font-medium text-muted-foreground"
                >
                  {colLabels[c] || c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((pm) => (
              <tr key={pm.slug} className="border-b border-border/60">
                <td className="px-4 py-2">
                  <div className="font-medium text-foreground">{pm.label}</div>
                  <div className="font-mono text-[11px] text-muted-foreground">
                    {pm.slug}
                  </div>
                </td>
                <td className="px-4 py-2">
                  <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">
                    {pm.payment_type}
                  </code>
                </td>
                {columns.map((col) => {
                  const supported = pm.integration_methods.includes(col);
                  return (
                    <td key={col} className="px-4 py-2 text-center">
                      {supported ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold">
                          ✓
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


// ---------------------------------------------------------------------------
// <VoucherPaymentForm> — controls slot for Test Case 10.
//
// Voucher-type dropdown sourced from ``constants.voucher_payment_types``
// so adding a new voucher in the backend constants surfaces here
// automatically. Amount defaults to 0 (full redemption — universally
// supported per docs).
// ---------------------------------------------------------------------------

// Friendly labels per docs page for the 5 voucher types.
const VOUCHER_LABELS: Record<string, string> = {
  ott_voucher: "OTT-Voucher",
  onevoucher: "1Voucher",
  bluvoucher: "BluVoucher",
  kazangvoucher: "EasyPay Voucher / Kazang",
  shop2shop_voucher: "EasyLoad Voucher / Shop2Shop",
};

interface VoucherPaymentFormValue {
  payment_type: string;
  amount: string;
  merchant_reference: string;
}

function VoucherPaymentForm({
  value,
  onChange,
  disabled,
  constants,
}: {
  value: VoucherPaymentFormValue;
  onChange: (next: VoucherPaymentFormValue) => void;
  disabled: boolean;
  constants?: OneGateConstants;
}) {
  const voucherTypes = constants?.voucher_payment_types ?? [
    "ott_voucher",
    "onevoucher",
    "bluvoucher",
    "kazangvoucher",
    "shop2shop_voucher",
  ];
  const set = <K extends keyof VoucherPaymentFormValue>(
    key: K,
    v: VoucherPaymentFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Voucher type
          </Label>
          <Select
            value={value.payment_type}
            onValueChange={(v) => set("payment_type", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {voucherTypes.map((v) => (
                <SelectItem key={v} value={v}>
                  {VOUCHER_LABELS[v] || v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value="0"
            readOnly
            disabled
            title="Vouchers must be submitted with amount=0 (OneGate UAT requirement)"
            aria-label="Voucher amount (locked to 0)"
            className="h-9 font-mono opacity-70 cursor-not-allowed"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Merchant reference
          </Label>
          <Input
            value={value.merchant_reference}
            onChange={(e) => set("merchant_reference", e.target.value)}
            placeholder="auto-generated if blank"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Locked to <code className="bg-muted px-1 rounded">amount=0</code>{" "}
        for every voucher type — OneGate's UAT team requires{" "}
        <code className="bg-muted px-1 rounded">amount=0</code> on all voucher
        deposits (1Voucher, BluVoucher, EasyLoad, EasyPay/4All, OTT). OneGate
        captures the value from the PIN entered on their hosted page.
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <EftSecureForm> — controls slot for Test Case 9.
//
// Two-tier form: the always-visible amount + merchant_reference, then
// an opt-in beneficiary panel toggled by the ``use_custom_beneficiary``
// checkbox. Bank list + universal branches come from the same DB-
// sourced ``constants`` we use for the validate-account form.
// ---------------------------------------------------------------------------

interface EftSecureFormValue {
  amount: string;
  merchant_reference: string;
  use_custom_beneficiary: boolean;
  beneficiary_account_number: string;
  beneficiary_name: string;
  beneficiary_account_type: string;
  beneficiary_bank: string;
}

function EftSecureForm({
  value,
  onChange,
  disabled,
  constants,
}: {
  value: EftSecureFormValue;
  onChange: (next: EftSecureFormValue) => void;
  disabled: boolean;
  constants?: OneGateConstants;
}) {
  const bankList = constants?.beneficiary_banks ?? ["ABSA"];
  const accountTypes = constants?.account_types ?? ["cheque"];
  const set = <K extends keyof EftSecureFormValue>(
    key: K,
    v: EftSecureFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="1.00"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div className="md:col-span-2">
          <Label className="text-[11px] text-muted-foreground">
            Merchant reference
          </Label>
          <Input
            value={value.merchant_reference}
            onChange={(e) => set("merchant_reference", e.target.value)}
            placeholder="auto-generated if blank (SIGNOFFEFT<HHMMSS>)"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-border/40">
        <Switch
          id="tc9-use-custom-beneficiary"
          checked={value.use_custom_beneficiary}
          onCheckedChange={(checked) =>
            set("use_custom_beneficiary", checked)
          }
          disabled={disabled}
        />
        <Label
          htmlFor="tc9-use-custom-beneficiary"
          className="text-xs font-medium cursor-pointer"
        >
          Test custom beneficiary (exercises the SHA256 hash auto-compute)
        </Label>
      </div>

      {value.use_custom_beneficiary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pl-8">
          <div className="md:col-span-2">
            <Label className="text-[11px] text-muted-foreground">
              Beneficiary name
            </Label>
            <Input
              value={value.beneficiary_name}
              onChange={(e) => set("beneficiary_name", e.target.value)}
              disabled={disabled}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Beneficiary bank
            </Label>
            <Select
              value={value.beneficiary_bank}
              onValueChange={(v) => set("beneficiary_bank", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {bankList.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Account type
            </Label>
            <Select
              value={value.beneficiary_account_type}
              onValueChange={(v) => set("beneficiary_account_type", v)}
              disabled={disabled}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {accountTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label className="text-[11px] text-muted-foreground">
              Beneficiary account number
            </Label>
            <Input
              value={value.beneficiary_account_number}
              onChange={(e) =>
                set(
                  "beneficiary_account_number",
                  e.target.value.replace(/[^0-9]/g, ""),
                )
              }
              disabled={disabled}
              className="h-9 font-mono"
              inputMode="numeric"
            />
          </div>
        </div>
      )}

      <div className="text-[11px] text-muted-foreground">
        EFTsecure modes (per docs): <span className="font-medium">Hosted</span>{" "}
        (redirect to <code className="bg-muted px-1 rounded">/eft?payment_key=…</code>)
        ·{" "}
        <span className="font-medium">Self Hosted (Enterprise)</span> (embed{" "}
        <code className="bg-muted px-1 rounded">eft-secure.min.js</code> on
        your page) ·{" "}
        <span className="font-medium">Checkout</span> (on-page popup widget).
        All three use the same payment-key returned by step 2.
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <PaymentScheduleForm> — controls slot for Test Case 8.
//
// Token guid is the only required field — it's auto-populated from
// TC7's tokenise step on success, so a typical run is "TC7 → TC8" with
// zero copy-paste. Interval / amount / start_date / count are docs-
// validated defaults that produce a schedule safely in the future.
// ---------------------------------------------------------------------------

interface PaymentScheduleFormValue {
  token_guid: string;
  interval: string;
  amount: string;
  start_date: string;
  count: string;
}

const SCHEDULE_INTERVAL_OPTIONS = ["once_off", "daily", "weekly", "monthly"];

function PaymentScheduleForm({
  value,
  onChange,
  disabled,
}: {
  value: PaymentScheduleFormValue;
  onChange: (next: PaymentScheduleFormValue) => void;
  disabled: boolean;
}) {
  const set = <K extends keyof PaymentScheduleFormValue>(
    key: K,
    v: PaymentScheduleFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="lg:col-span-2">
          <Label className="text-[11px] text-muted-foreground">
            Token guid (from TC7)
          </Label>
          <Input
            value={value.token_guid}
            onChange={(e) => set("token_guid", e.target.value)}
            placeholder="paste guid or run Test Case 6 first"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Interval</Label>
          <Select
            value={value.interval}
            onValueChange={(v) => set("interval", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SCHEDULE_INTERVAL_OPTIONS.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="1.00"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Start date (DD-MM-YYYY)
          </Label>
          <Input
            value={value.start_date}
            onChange={(e) => set("start_date", e.target.value)}
            placeholder="01-04-2030"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Count (charges)
          </Label>
          <Input
            value={value.count}
            onChange={(e) =>
              set("count", e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="2"
            disabled={disabled}
            className="h-9 font-mono"
            inputMode="numeric"
          />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Per docs: <code className="bg-muted px-1 rounded">start_date</code> in{" "}
        <code className="bg-muted px-1 rounded">DD-MM-YYYY</code> format.
        Interval must be one of{" "}
        <code className="bg-muted px-1 rounded">once_off</code> /{" "}
        <code className="bg-muted px-1 rounded">daily</code> /{" "}
        <code className="bg-muted px-1 rounded">weekly</code> /{" "}
        <code className="bg-muted px-1 rounded">monthly</code>. Update step
        bumps the amount by R0.50 so the PUT response visibly differs from
        the POST.
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <CardTokenDirectForm> — controls slot for Test Case 6.
//
// Pre-populated with the docs test card so a single click runs a
// complete sign-off. Fields are free-text so an authorised tester can
// swap in any sandbox PAN; the backend masks both PAN and CVV in the
// captured request envelope before any logging or display.
// ---------------------------------------------------------------------------

interface CardTokenDirectFormValue {
  pan: string;
  expiry: string;
  cvv: string;
  merchant_reference: string;
  amount: string;
  first_name?: string;
  last_name?: string;
}

function CardTokenDirectForm({
  value,
  onChange,
  disabled,
  /** Render first_name + last_name fields — used by Test Case 7
   *  (pay/direct) which takes the cardholder name. TC7 (tokenise)
   *  leaves them off since the gateway doesn't accept them. */
  showCardholderName = false,
  resetValue,
}: {
  value: CardTokenDirectFormValue;
  onChange: (next: CardTokenDirectFormValue) => void;
  disabled: boolean;
  showCardholderName?: boolean;
  resetValue?: CardTokenDirectFormValue;
}) {
  const set = <K extends keyof CardTokenDirectFormValue>(
    key: K,
    v: CardTokenDirectFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="md:col-span-2">
          <Label className="text-[11px] text-muted-foreground">
            PAN (test card only)
          </Label>
          <Input
            value={value.pan}
            onChange={(e) =>
              set("pan", e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="4242424242424242"
            disabled={disabled}
            className="h-9 font-mono"
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Expiry (MMYY)
          </Label>
          <Input
            value={value.expiry}
            onChange={(e) =>
              set("expiry", e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="1230"
            disabled={disabled}
            className="h-9 font-mono"
            maxLength={4}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">CVV</Label>
          <Input
            value={value.cvv}
            onChange={(e) =>
              set("cvv", e.target.value.replace(/[^0-9]/g, ""))
            }
            placeholder="123"
            disabled={disabled}
            className="h-9 font-mono"
            maxLength={5}
            inputMode="numeric"
            autoComplete="off"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="1.00"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div className={showCardholderName ? "" : "md:col-span-2 lg:col-span-3"}>
          <Label className="text-[11px] text-muted-foreground">
            Merchant reference
          </Label>
          <Input
            value={value.merchant_reference}
            onChange={(e) => set("merchant_reference", e.target.value)}
            placeholder="auto-generated if blank"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        {showCardholderName && (
          <>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                First name
              </Label>
              <Input
                value={value.first_name ?? ""}
                onChange={(e) => set("first_name", e.target.value)}
                placeholder="Sign-off"
                disabled={disabled}
                className="h-9"
                maxLength={20}
              />
            </div>
            <div>
              <Label className="text-[11px] text-muted-foreground">
                Last name
              </Label>
              <Input
                value={value.last_name ?? ""}
                onChange={(e) => set("last_name", e.target.value)}
                placeholder="Test"
                disabled={disabled}
                className="h-9"
                maxLength={20}
              />
            </div>
          </>
        )}
        <div className="flex items-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px]"
            disabled={disabled}
            onClick={() =>
              onChange(
                resetValue ?? {
                  pan: "4242424242424242",
                  expiry: "1230",
                  cvv: "123",
                  merchant_reference: "",
                  amount: "1.00",
                },
              )
            }
          >
            Reset to docs test card
          </Button>
        </div>
      </div>
      <div className="text-[11px] text-amber-700">
        ⚠ Use ONLY known test PANs (4242…). The Enterprise path keeps
        the server in PCI scope — production credit-card collection
        should go via Redirect (Test Case 5).
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <ServiceRedirectForm> — controls slot for Test Case 5.
//
// Drives the bill-payment hosted-checkout test. Payment type comes
// from the backend ``constants.payment_types`` list so we never hard-
// code the enum; merchant reference auto-generates if left blank.
// ---------------------------------------------------------------------------

interface ServiceRedirectFormValue {
  payment_type: string;
  amount: string;
  merchant_reference: string;
}

function ServiceRedirectForm({
  value,
  onChange,
  disabled,
  constants,
}: {
  value: ServiceRedirectFormValue;
  onChange: (next: ServiceRedirectFormValue) => void;
  disabled: boolean;
  constants?: OneGateConstants;
}) {
  const paymentTypes = constants?.payment_types ?? ["all"];
  const set = <K extends keyof ServiceRedirectFormValue>(
    key: K,
    v: ServiceRedirectFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Payment type
          </Label>
          <Select
            value={value.payment_type}
            onValueChange={(v) => set("payment_type", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 1.00"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Merchant reference
          </Label>
          <Input
            value={value.merchant_reference}
            onChange={(e) => set("merchant_reference", e.target.value)}
            placeholder="auto-generated if blank"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Empty merchant reference auto-generates as{" "}
        <code className="bg-muted px-1 rounded">SIGNOFFREDIR&lt;HHMMSS&gt;</code>
        . Vouchers (ott_voucher / bluvoucher / etc.) ignore the amount
        — the payer enters the voucher PIN on the hosted page.
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <ValidateAccountForm> — controls slot for Test Case 3.
//
// Five fields wired to the parent's form state. The Bank list uses
// universal-branch defaults; selecting a bank doesn't auto-fill the
// branch (some merchants pay into non-universal branches) but the
// branch input ships pre-populated with the bank's universal code as a
// hint. Free-text everywhere for maximum flexibility.
// ---------------------------------------------------------------------------

interface PayoutAccountFormValue {
  bank: string;
  branch: string;
  account_number: string;
  account_type: string;
  customer_name: string;
  amount?: string;
  reference?: string;
}

function PayoutAccountForm({
  value,
  onChange,
  disabled,
  showAmount = false,
  showReference = false,
  resetValue,
  constants,
}: {
  value: PayoutAccountFormValue;
  onChange: (next: PayoutAccountFormValue) => void;
  disabled: boolean;
  /** Render the Amount field — used by Queue Payout (Test Case 4). */
  showAmount?: boolean;
  /** Render the Reference field — used by Queue Payout. */
  showReference?: boolean;
  /** Default value used by the "Reset to docs example" button. */
  resetValue: PayoutAccountFormValue;
  /** Bank list + branch codes + account-type list — supplied by the
   *  backend ``GET /api/onegate/constants/`` endpoint. Falls back to a
   *  minimal docs-derived set if the API hasn't loaded yet. */
  constants?: OneGateConstants;
}) {
  // Backend-sourced banks + branch codes. Falls back to docs subset
  // (ABSA only) when the constants query hasn't resolved — keeps the
  // form interactive even if the network is slow.
  const branchCodes = constants?.universal_branch_codes ?? { ABSA: "632005" };
  const bankList = constants?.beneficiary_banks ?? Object.keys(branchCodes);
  const accountTypes = constants?.account_types ?? ["cheque"];
  const set = <K extends keyof PayoutAccountFormValue>(
    key: K,
    v: PayoutAccountFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">Bank</Label>
          <Select
            value={value.bank}
            onValueChange={(v) => {
              const auto = branchCodes[v];
              onChange({
                ...value,
                bank: v,
                branch: auto || value.branch,
              });
            }}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Pick a bank" />
            </SelectTrigger>
            <SelectContent>
              {bankList.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                  {branchCodes[b] && (
                    <span className="text-[10px] text-muted-foreground ml-1">
                      {branchCodes[b]}
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Branch code
          </Label>
          <Input
            value={value.branch}
            onChange={(e) => set("branch", e.target.value)}
            placeholder="universal code (e.g. 632005)"
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Account type
          </Label>
          <Select
            value={value.account_type}
            onValueChange={(v) => set("account_type", v)}
            disabled={disabled}
          >
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accountTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Account number
          </Label>
          <Input
            value={value.account_number}
            onChange={(e) => set("account_number", e.target.value)}
            placeholder="9–11 digits"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div className={showAmount || showReference ? "" : "md:col-span-2"}>
          <Label className="text-[11px] text-muted-foreground">
            Customer name
          </Label>
          <Input
            value={value.customer_name}
            onChange={(e) => set("customer_name", e.target.value)}
            placeholder="Display name only"
            disabled={disabled}
            className="h-9"
          />
        </div>
        {showAmount && (
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Amount (ZAR)
            </Label>
            <Input
              value={value.amount ?? ""}
              onChange={(e) => set("amount", e.target.value)}
              placeholder="e.g. 1.00"
              disabled={disabled}
              className="h-9 font-mono"
            />
          </div>
        )}
        {showReference && (
          <div className={showAmount ? "" : "md:col-span-2"}>
            <Label className="text-[11px] text-muted-foreground">
              Reference
            </Label>
            <Input
              value={value.reference ?? ""}
              onChange={(e) => set("reference", e.target.value)}
              placeholder="Appears in OneGate dashboard for the batch operator"
              disabled={disabled}
              className="h-9"
            />
          </div>
        )}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          Empty fields fall back to the docs example. Selecting a bank
          auto-fills its universal branch code; override if you need a
          non-universal branch.
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-[11px]"
          disabled={disabled}
          onClick={() => onChange(resetValue)}
        >
          Reset to docs example
        </Button>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <OttPayoutForm> — controls slot for Test Case 4.
//
// The OTT REST payouts flow takes a payout-method slug (cashout channel)
// plus recipient details. Slug is a free-text input because CallPay
// activates different slugs per merchant and we don't have an
// authoritative list in constants — common values are shown as a hint.
// ID number is only mandatory for the RSA-ID-gated slugs (ott-voucher,
// kazang-voucher, etc.); empty is fine for fnb-ewallet / payshap.
// ---------------------------------------------------------------------------

interface OttPayoutFormValue {
  payout_method_slug: string;
  reference: string;
  amount: string;
  first_name: string;
  surname: string;
  mobile: string;
  id_number: string;
  id_type: string;
  date_of_birth: string;
  title: string;
  nationality: string;
  country_of_issue: string;
}

const OTT_PAYOUT_SLUG_HINTS = [
  "ott-voucher",
  "fnb-ewallet",
  "payshap-account",
  "capitec-paymyfriend",
  "kazang-voucher",
];

function OttPayoutForm({
  value,
  onChange,
  disabled,
  constants,
}: {
  value: OttPayoutFormValue;
  onChange: (next: OttPayoutFormValue) => void;
  disabled: boolean;
  constants?: OneGateConstants;
}) {
  const rsaIdRequired = constants?.rsa_id_required_payout_methods ?? [
    "ott-voucher",
    "kazang-voucher",
  ];
  const idRequired = rsaIdRequired.includes(value.payout_method_slug);
  const set = <K extends keyof OttPayoutFormValue>(
    key: K,
    v: OttPayoutFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Payout method slug
          </Label>
          <Input
            value={value.payout_method_slug}
            onChange={(e) => set("payout_method_slug", e.target.value)}
            placeholder="e.g. ott-voucher"
            disabled={disabled}
            list="ott-payout-slug-hints"
            className="h-9 font-mono"
          />
          <datalist id="ott-payout-slug-hints">
            {OTT_PAYOUT_SLUG_HINTS.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Amount (ZAR)
          </Label>
          <Input
            value={value.amount}
            onChange={(e) => set("amount", e.target.value)}
            placeholder="e.g. 1.00 — step 2 actually disburses"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Reference
          </Label>
          <Input
            value={value.reference}
            onChange={(e) => set("reference", e.target.value)}
            placeholder="auto-generated if blank"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            First name
          </Label>
          <Input
            value={value.first_name}
            onChange={(e) => set("first_name", e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Surname
          </Label>
          <Input
            value={value.surname}
            onChange={(e) => set("surname", e.target.value)}
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Mobile (MSISDN)
          </Label>
          <Input
            value={value.mobile}
            onChange={(e) => set("mobile", e.target.value)}
            placeholder="2782… (international format)"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            ID number{idRequired && <span className="text-amber-700"> *</span>}
          </Label>
          <Input
            value={value.id_number}
            onChange={(e) => set("id_number", e.target.value)}
            placeholder={idRequired ? "RSA ID — required" : "optional"}
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">ID type</Label>
          <Input
            value={value.id_type}
            onChange={(e) => set("id_type", e.target.value)}
            placeholder="RSAID / PASSPORT"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Date of birth
          </Label>
          <Input
            value={value.date_of_birth}
            onChange={(e) => set("date_of_birth", e.target.value)}
            placeholder="YYYYMMDD"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">Title</Label>
          <Input
            value={value.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Mr / Ms / Dr"
            disabled={disabled}
            className="h-9"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Nationality
          </Label>
          <Input
            value={value.nationality}
            onChange={(e) => set("nationality", e.target.value)}
            placeholder="ZA"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Country of issue
          </Label>
          <Input
            value={value.country_of_issue}
            onChange={(e) => set("country_of_issue", e.target.value)}
            placeholder="ZA"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
      </div>
      <div className="text-[11px] text-muted-foreground">
        Step 2 actually disburses — keep the amount small (R1.00 default)
        and prefer{" "}
        <code className="bg-muted px-1 rounded">ott-voucher</code> for the
        cheapest unit failure cost. ID number is mandatory for vouchers
        ({rsaIdRequired.join(", ")}) — optional for bank-rail slugs.
      </div>
    </div>
  );
}


// ---------------------------------------------------------------------------
// <ReconForm> — controls slot for Test Case 11.
//
// Read-only by default (list + view). Refund and Resend Webhook are
// destructive / spammy so they're gated behind explicit checkboxes —
// the conditional input fields only render when their toggle is on, to
// keep the visual weight low when the user just wants a quick read.
// ---------------------------------------------------------------------------

interface ReconFormValue {
  transaction_id: string;
  merchant_reference: string;
  payment_key: string;
  do_refund: boolean;
  refund_amount: string;
  do_resend_webhook: boolean;
  resend_webhook_url: string;
}

function ReconForm({
  value,
  onChange,
  disabled,
}: {
  value: ReconFormValue;
  onChange: (next: ReconFormValue) => void;
  disabled: boolean;
}) {
  const set = <K extends keyof ReconFormValue>(
    key: K,
    v: ReconFormValue[K],
  ) => onChange({ ...value, [key]: v });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Transaction ID
          </Label>
          <Input
            value={value.transaction_id}
            onChange={(e) => set("transaction_id", e.target.value)}
            placeholder="gateway-transaction-id"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Merchant reference
          </Label>
          <Input
            value={value.merchant_reference}
            onChange={(e) => set("merchant_reference", e.target.value)}
            placeholder="optional second lookup"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
        <div>
          <Label className="text-[11px] text-muted-foreground">
            Payment key
          </Label>
          <Input
            value={value.payment_key}
            onChange={(e) => set("payment_key", e.target.value)}
            placeholder="optional third lookup"
            disabled={disabled}
            className="h-9 font-mono"
          />
        </div>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2 space-y-2">
        <label className="flex items-start gap-2 text-xs text-amber-900">
          <input
            type="checkbox"
            checked={value.do_refund}
            onChange={(e) => set("do_refund", e.target.checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Refund</span> the transaction
            (destructive — moves money back to the payer; requires
            Transaction ID above).
          </span>
        </label>
        {value.do_refund && (
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Refund amount (ZAR — blank for full refund)
            </Label>
            <Input
              value={value.refund_amount}
              onChange={(e) => set("refund_amount", e.target.value)}
              placeholder="leave blank for full refund"
              disabled={disabled}
              className="h-9 font-mono"
            />
          </div>
        )}
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/40 px-3 py-2 space-y-2">
        <label className="flex items-start gap-2 text-xs text-amber-900">
          <input
            type="checkbox"
            checked={value.do_resend_webhook}
            onChange={(e) => set("do_resend_webhook", e.target.checked)}
            disabled={disabled}
            className="mt-0.5"
          />
          <span>
            <span className="font-medium">Resend webhook</span> for the
            transaction (re-fires the notification — keep off unless
            you're explicitly testing webhook receivers; requires
            Transaction ID above).
          </span>
        </label>
        {value.do_resend_webhook && (
          <div>
            <Label className="text-[11px] text-muted-foreground">
              Resend webhook URL (blank to use the account's registered URL)
            </Label>
            <Input
              value={value.resend_webhook_url}
              onChange={(e) => set("resend_webhook_url", e.target.value)}
              placeholder="https://… (optional override)"
              disabled={disabled}
              className="h-9 font-mono"
            />
          </div>
        )}
      </div>

      <div className="text-[11px] text-muted-foreground">
        With both toggles off the test only lists + looks up — safe to
        re-run repeatedly. Toggle one on to additionally exercise the
        destructive endpoint.
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
  // Vouchers must send amount=0 — OneGate captures voucher value from the
  // PIN entered on their hosted page. UI locks the field so users can't
  // override.
  const isVoucher = row.is_voucher;
  const amountValid = isVoucher
    ? true
    : /^\d+(\.\d{0,2})?$/.test(amount.trim()) && Number(amount) > 0;
  const effectiveAmount = isVoucher ? "0.00" : amount.trim();

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
            value={isVoucher ? "0.00" : amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder={row.default_amount}
            aria-label={`Test amount for ${row.label}`}
            disabled={isVoucher}
            title={isVoucher ? "Vouchers must be submitted with amount=0" : undefined}
            className={
              "h-8 w-24 font-mono text-xs " +
              (isVoucher
                ? "opacity-70 cursor-not-allowed"
                : amountValid
                ? ""
                : "border-rose-400 focus-visible:ring-rose-200")
            }
          />
        </div>
        <Button
          size="sm"
          disabled={isRunning || !amountValid}
          onClick={() => onStart(effectiveAmount)}
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 mr-1 animate-spin" />
          ) : (
            <ExternalLink className="h-4 w-4 mr-1" />
          )}
          Start test deposit
        </Button>
        {isVoucher && (
          <span className="text-[11px] text-muted-foreground">
            Voucher · amount locked to 0
          </span>
        )}
        {!isVoucher && !amountValid && (
          <span className="text-[11px] text-rose-600">
            Enter a positive amount
          </span>
        )}
      </div>
      <TestRefsList refs={row.references} />
      <IntentControls intent={row.intent} onChange={onIntentChange} />
    </div>
  );
}

/**
 * Compact list of the merchant's most-recent test transactions for one
 * method. Mirrors what OneGate's UAT feedback table shows — the reference
 * string + the status — so the merchant can answer "I sent these
 * transactions for this service" with a click.
 */
function TestRefsList({ refs }: { refs: OneGateDepositRow["references"] }) {
  if (!refs || refs.length === 0) {
    return (
      <div className="text-[11px] text-muted-foreground italic">
        No test transactions yet.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border/70 bg-muted/30 px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">
        Recent test refs
      </div>
      <ul className="space-y-0.5">
        {refs.map((r, idx) => (
          <li
            key={`${r.reference}-${idx}`}
            className="text-[11px] font-mono flex items-center gap-2"
          >
            <span
              className={
                "inline-block w-1.5 h-1.5 rounded-full " +
                (r.classification === "paid"
                  ? "bg-emerald-500"
                  : r.classification === "failed"
                  ? "bg-rose-500"
                  : r.classification === "pending"
                  ? "bg-amber-500"
                  : "bg-slate-400")
              }
              aria-hidden
            />
            <span className="text-foreground/80">{r.reference || "—"}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">{r.status || "—"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Payout card (with inline test-payout form)
// ---------------------------------------------------------------------------

function PayoutCard({
  row,
  constants,
  isRunning,
  onSubmit,
  onIntentChange,
}: {
  row: OneGatePayoutRow;
  constants?: OneGateConstants;
  isRunning: boolean;
  onSubmit: (body: OneGatePayoutTestPayload) => void;
  onIntentChange: (patch: Partial<OneGateSignoffIntent>) => void;
}) {
  const status = badgeStatus(row.status);
  const [formOpen, setFormOpen] = useState(false);
  const limits = constants?.payout_amount_limits?.[row.slug];

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
        {row.rsa_id_required && (
          <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-100 text-amber-900">
            RSA ID required
          </span>
        )}
        {limits && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-sky-100 text-sky-900"
            title={`OneGate limits · ${limits.action_time}`}
          >
            R{Number(limits.min).toLocaleString()}–R
            {Number(limits.max).toLocaleString()}
          </span>
        )}
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
          rsaIdRequired={row.rsa_id_required}
          limits={limits}
          participatingBanks={
            row.slug === "payshap-account"
              ? constants?.payshap_participating_banks
              : row.slug === "rtc-payments"
                ? constants?.rtc_participating_banks
                : undefined
          }
          isRunning={isRunning}
          onCancel={() => setFormOpen(false)}
          onSubmit={onSubmit}
        />
      )}
      {row.references && row.references.length > 0 && (
        <div className="mt-3">
          <TestRefsList refs={row.references} />
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border/60">
        <IntentControls intent={row.intent} onChange={onIntentChange} />
      </div>
    </div>
  );
}

function PayoutTestForm({
  slug,
  rsaIdRequired,
  limits,
  participatingBanks,
  isRunning,
  onCancel,
  onSubmit,
}: {
  slug: string;
  rsaIdRequired: boolean;
  limits?: { min: string; max: string; action_time: string };
  participatingBanks?: Record<string, string>;
  isRunning: boolean;
  onCancel: () => void;
  onSubmit: (body: OneGatePayoutTestPayload) => void;
}) {
  // Seed the amount at the method's minimum so the form starts inside
  // OneGate's accepted range — their old R5 default tripped the R10/R50/R100
  // floors and got rejected during UAT.
  const [form, setForm] = useState<OneGatePayoutTestPayload>({
    payout_method_slug: slug,
    amount: limits?.min ?? "5.00",
    first_name: "Test",
    surname: "Signoff",
    mobile: "",
    account_number: "",
    branch_code: "",
    id_number: "",
    email: "",
  });

  const idMissing = rsaIdRequired && !(form.id_number ?? "").trim();

  // Amount must sit within OneGate's published per-method bounds (PayShap
  // R50–R50k, RTC R50k–R150k, OTT-Voucher R10–R3k, etc.).
  const lo = limits ? Number(limits.min) : null;
  const hi = limits ? Number(limits.max) : null;
  const amountNum = Number((form.amount ?? "").trim());
  const amountValid =
    Number.isFinite(amountNum) &&
    amountNum > 0 &&
    (lo == null || amountNum >= lo) &&
    (hi == null || amountNum <= hi);

  // PayShap / RTC payouts must target a participating bank — require both the
  // account number and a branch code picked from that list.
  const bankRequired = !!participatingBanks;
  const selectedBankName = participatingBanks
    ? Object.keys(participatingBanks).find(
        (n) => participatingBanks[n] === form.branch_code,
      ) ?? ""
    : "";
  const bankMissing =
    bankRequired &&
    (!(form.account_number ?? "").trim() || !(form.branch_code ?? "").trim());

  const canSubmit =
    !!form.mobile && !idMissing && amountValid && !bankMissing;

  const fmt = (v: string) => Number(v).toLocaleString();

  return (
    <form
      className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3 bg-muted/40 rounded-lg p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSubmit) return;
        onSubmit(form);
      }}
    >
      <Field
        label={
          limits
            ? `Amount (ZAR · R${fmt(limits.min)}–R${fmt(limits.max)})`
            : "Amount (ZAR)"
        }
      >
        <Input
          required
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
          inputMode="decimal"
          className={
            amountValid ? "" : "border-rose-400 focus-visible:ring-rose-200"
          }
        />
        {!amountValid && limits && (
          <span className="text-[11px] text-rose-600">
            OneGate accepts R{fmt(limits.min)}–R{fmt(limits.max)} for{" "}
            {slug} ({limits.action_time})
          </span>
        )}
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
      <Field
        label={
          bankRequired
            ? "Account number (required)"
            : "Account number (bank methods only)"
        }
      >
        <Input
          required={bankRequired}
          value={form.account_number}
          onChange={(e) =>
            setForm({ ...form, account_number: e.target.value })
          }
          className={
            bankRequired && !(form.account_number ?? "").trim()
              ? "border-rose-400 focus-visible:ring-rose-200"
              : ""
          }
        />
      </Field>
      {bankRequired ? (
        <Field label="Participating bank → branch code">
          <Select
            value={selectedBankName}
            onValueChange={(name) =>
              setForm({ ...form, branch_code: participatingBanks![name] ?? "" })
            }
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Select participating bank" />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(participatingBanks!).map(([name, code]) => (
                <SelectItem key={name} value={name}>
                  {name} · {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {bankRequired && !form.branch_code && (
            <span className="text-[11px] text-rose-600">
              Pick a {slug === "payshap-account" ? "PayShap" : "RTC"}{" "}
              participating bank
            </span>
          )}
        </Field>
      ) : (
        <Field label="Branch code (bank methods only)">
          <Input
            value={form.branch_code}
            onChange={(e) => setForm({ ...form, branch_code: e.target.value })}
          />
        </Field>
      )}
      <Field
        label={
          rsaIdRequired ? "ID number (required for this method)" : "ID number (optional)"
        }
      >
        <Input
          required={rsaIdRequired}
          value={form.id_number}
          placeholder={rsaIdRequired ? "13-digit RSA ID" : ""}
          onChange={(e) => setForm({ ...form, id_number: e.target.value })}
          className={idMissing ? "border-rose-400 focus-visible:ring-rose-200" : ""}
        />
        {idMissing && (
          <span className="text-[11px] text-rose-600">
            OneGate rejects this payout method when id_number is blank
          </span>
        )}
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
        <Button type="submit" size="sm" disabled={isRunning || !canSubmit}>
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
