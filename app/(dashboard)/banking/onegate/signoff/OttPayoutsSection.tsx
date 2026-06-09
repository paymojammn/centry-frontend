'use client';

/**
 * OTT Payouts (REST) — sign-off test section.
 *
 * DB-catalog driven (GET /payments/api/onegate/payout-catalog/): lists the OTT
 * payout methods with their min/max limits and field requirements, and runs a
 * real test payout per method (POST …/signoff/payout-test/). This is the same
 * method list + validation we reuse in the Bill Payments modal, so testing
 * here also validates that flow.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2, Banknote, CheckCircle2, XCircle } from 'lucide-react';

import { onegateApi, type OneGatePayoutCatalogMethod } from '@/lib/onegate-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const inputCls =
  'w-full h-9 rounded-md border border-border bg-background px-3 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-primary/30';

function money(v: string) {
  const n = Number(v);
  return Number.isFinite(n) ? n.toLocaleString() : v;
}

export default function OttPayoutsSection({ accountId }: { accountId: string | null }) {
  const { data, isLoading } = useQuery({
    queryKey: ['onegate-payout-catalog'],
    queryFn: () => onegateApi.getPayoutCatalog(),
    staleTime: 5 * 60 * 1000,
  });

  const methods = data?.methods ?? [];
  const banks = data?.banks ?? [];

  const [slug, setSlug] = useState('');
  const method = useMemo<OneGatePayoutCatalogMethod | undefined>(
    () => methods.find((m) => m.slug === slug),
    [methods, slug],
  );

  // Recipient KYC (prefilled with sensible sandbox defaults).
  const [form, setForm] = useState({
    amount: '',
    first_name: 'Test',
    surname: 'Recipient',
    mobile: '27831234567',
    id_number: '',
    id_type: 'RSAID',
    date_of_birth: '',
    title: 'Mr',
    nationality: 'ZA',
    country_of_issue: 'ZA',
    account_number: '',
    branch_code: '',
    email: '',
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
    reference?: string;
    voucherPin?: string;
  } | null>(null);

  // Banks valid for the chosen method's rail.
  const railBanks = useMemo(() => {
    if (!method?.requires_bank_account) return [];
    return banks.filter((b) =>
      slug === 'rtc-payments' ? b.supports_rtc : b.supports_payshap,
    );
  }, [banks, method, slug]);

  const amountNum = Number(form.amount);
  const minN = method ? Number(method.min_amount) : 0;
  const maxN = method ? Number(method.max_amount) : 0;
  const amountInvalid =
    !!method &&
    (form.amount === '' ||
      !Number.isFinite(amountNum) ||
      amountNum < minN ||
      amountNum > maxN);

  const missing = useMemo(() => {
    if (!method) return ['method'];
    const m: string[] = [];
    if (!form.first_name.trim()) m.push('first name');
    if (!form.surname.trim()) m.push('surname');
    if (!form.mobile.trim()) m.push('mobile');
    if (method.rsa_id_required && !form.id_number.trim()) m.push('ID number');
    if (method.requires_bank_account && !form.account_number.trim()) m.push('account number');
    if (method.requires_bank_account && !form.branch_code.trim()) m.push('bank');
    return m;
  }, [method, form]);

  const runMutation = useMutation({
    mutationFn: async () => {
      if (!accountId) throw new Error('Pick a OneGate account first');
      if (!method) throw new Error('Pick a payout method');
      return onegateApi.startPayoutTest(accountId, {
        payout_method_slug: method.slug,
        amount: form.amount,
        first_name: form.first_name,
        surname: form.surname,
        mobile: form.mobile,
        id_number: form.id_number || undefined,
        id_type: form.id_type || undefined,
        date_of_birth: form.date_of_birth || undefined,
        title: form.title || undefined,
        nationality: form.nationality || undefined,
        country_of_issue: form.country_of_issue || undefined,
        account_number: form.account_number || undefined,
        branch_code: form.branch_code || undefined,
        email: form.email || undefined,
      });
    },
    onSuccess: (resp) => {
      const pin = (resp.voucher as { pin?: string } | null)?.pin;
      setResult({
        ok: !!resp.success,
        message: resp.message || (resp.success ? 'Payout submitted' : 'Payout failed'),
        reference: resp.reference,
        voucherPin: pin,
      });
      if (resp.success) toast.success(`Payout submitted · ref ${resp.reference}`);
      else toast.error(resp.message || 'Payout failed');
    },
    onError: (e: any) => {
      setResult({ ok: false, message: e?.message || 'Payout failed' });
      toast.error(e?.message || 'Payout failed');
    },
  });

  const canRun = !!accountId && !!method && !amountInvalid && missing.length === 0;

  return (
    <section className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
        <Banknote className="h-4 w-4 text-primary" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">OTT Payouts (REST)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Disburse directly to a recipient. Pick a method, enter recipient details,
            and run a real test payout — limits are enforced per method.
          </p>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading payout methods…
          </div>
        ) : (
          <>
            {/* Method picker */}
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="text-xs font-medium text-muted-foreground">
                Payout method
                <select
                  className={inputCls + ' mt-1'}
                  value={slug}
                  onChange={(e) => {
                    setSlug(e.target.value);
                    setResult(null);
                    set('branch_code', '');
                  }}
                >
                  <option value="">Select a method…</option>
                  {methods.map((m) => (
                    <option key={m.slug} value={m.slug}>
                      {m.name} (R{money(m.min_amount)}–R{money(m.max_amount)})
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-xs font-medium text-muted-foreground">
                Amount ({method?.currency || 'ZAR'})
                <Input
                  type="number"
                  step="0.01"
                  className="mt-1"
                  value={form.amount}
                  onChange={(e) => set('amount', e.target.value)}
                  placeholder={method ? `${method.min_amount}–${method.max_amount}` : ''}
                  disabled={!method}
                />
                {method && (
                  <span
                    className={
                      'mt-1 block text-[11px] ' +
                      (amountInvalid ? 'text-red-600' : 'text-muted-foreground')
                    }
                  >
                    Allowed: R{money(method.min_amount)}–R{money(method.max_amount)} · {method.action_time}
                  </span>
                )}
              </label>
            </div>

            {method && (
              <>
                {/* Requirement badges */}
                <div className="flex flex-wrap gap-1.5">
                  {method.rsa_id_required && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      ID number required
                    </span>
                  )}
                  {method.requires_bank_account && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-100 text-sky-900">
                      Bank account + branch required
                    </span>
                  )}
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {method.slug}
                  </span>
                </div>
                {method.description && (
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                )}

                {/* Recipient */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="First name" v={form.first_name} on={(v) => set('first_name', v)} />
                  <Field label="Surname" v={form.surname} on={(v) => set('surname', v)} />
                  <Field label="Mobile (2783…)" v={form.mobile} on={(v) => set('mobile', v)} />
                </div>

                {/* ID block — required for some methods */}
                <div className="grid sm:grid-cols-3 gap-3">
                  <label className="text-xs font-medium text-muted-foreground">
                    ID type
                    <select
                      className={inputCls + ' mt-1'}
                      value={form.id_type}
                      onChange={(e) => set('id_type', e.target.value)}
                    >
                      <option value="RSAID">RSA ID</option>
                      <option value="PASSPT">Passport</option>
                    </select>
                  </label>
                  <Field
                    label={`ID number${method.rsa_id_required ? '' : ' (optional)'}`}
                    v={form.id_number}
                    on={(v) => set('id_number', v)}
                  />
                  <Field
                    label="Date of birth (YYYYMMDD)"
                    v={form.date_of_birth}
                    on={(v) => set('date_of_birth', v)}
                  />
                </div>

                {/* Bank block — only for account-based rails */}
                {method.requires_bank_account && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="Account number"
                      v={form.account_number}
                      on={(v) => set('account_number', v)}
                    />
                    <label className="text-xs font-medium text-muted-foreground">
                      Bank ({slug === 'rtc-payments' ? 'RTC' : 'PayShap'})
                      <select
                        className={inputCls + ' mt-1'}
                        value={form.branch_code}
                        onChange={(e) => set('branch_code', e.target.value)}
                      >
                        <option value="">Select bank…</option>
                        {railBanks.map((b) => (
                          <option key={b.branch_code} value={b.branch_code}>
                            {b.name} ({b.branch_code}){b.note ? ` — ${b.note}` : ''}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}

                {/* Run */}
                <div className="flex items-center gap-3 pt-1">
                  <Button onClick={() => runMutation.mutate()} disabled={!canRun || runMutation.isPending}>
                    {runMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Banknote className="h-4 w-4 mr-1.5" />
                    )}
                    Run payout test
                  </Button>
                  {missing.length > 0 && (
                    <span className="text-[11px] text-muted-foreground">
                      Missing: {missing.join(', ')}
                    </span>
                  )}
                  {amountInvalid && form.amount !== '' && (
                    <span className="text-[11px] text-red-600">Amount out of range</span>
                  )}
                </div>

                {/* Result */}
                {result && (
                  <div
                    className={
                      'rounded-md border px-3 py-2 text-sm flex items-start gap-2 ' +
                      (result.ok
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                        : 'border-red-200 bg-red-50 text-red-900')
                    }
                  >
                    {result.ok ? (
                      <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
                    ) : (
                      <XCircle className="h-4 w-4 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <div>{result.message}</div>
                      {result.reference && (
                        <div className="text-[11px] opacity-80 mt-0.5">Ref: {result.reference}</div>
                      )}
                      {result.voucherPin && (
                        <div className="text-[11px] font-mono mt-0.5">Voucher PIN: {result.voucherPin}</div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  v,
  on,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
}) {
  return (
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      <Input className="mt-1" value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
