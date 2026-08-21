'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/config/brand';
import {
  getSubscriptionPlans,
  getManualPaymentMethods,
  submitManualPayment,
  SubscriptionPlan,
  ManualPaymentMethodInfo,
} from '@/lib/billing-api';
import {
  RiCheckLine,
  RiArrowLeftLine,
  RiFileCopyLine,
  RiLoader4Line,
  RiSmartphoneLine,
  RiBankLine,
} from '@remixicon/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

/**
 * Manual payment page — shows our own bank accounts and mobile money details,
 * managed in admin, so a customer can pay by transfer or deposit and tell us
 * the reference. Nothing here comes from the customer's own linked accounts.
 */
export default function ManualPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';
  const orgId = searchParams.get('organization_id') || undefined;

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [methods, setMethods] = useState<ManualPaymentMethodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<ManualPaymentMethodInfo | null>(null);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    Promise.all([getSubscriptionPlans(), getManualPaymentMethods()])
      .then(([plans, manualMethods]) => {
        setPlan(plans.find((p) => p.code === planCode) || plans[0] || null);
        setMethods(manualMethods);
      })
      .catch((err: any) => {
        setLoadError(err?.message || 'We could not load the payment details. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [planCode]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSubmit = async () => {
    if (!plan || !selected) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await submitManualPayment(plan.code, billingCycle, selected.id, reference, orgId);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'We could not record that. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const fmtPrice = (p: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(p));

  const price = plan ? (billingCycle === 'annual' ? plan.annual_price : plan.monthly_price) : '0';

  const CopyRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); copyToClipboard(value, `${label}-${value}`); }}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        title={`Copy ${label.toLowerCase()}`}
      >
        {copied === `${label}-${value}`
          ? <RiCheckLine className="w-4 h-4 text-primary" />
          : <RiFileCopyLine className="w-4 h-4 text-muted-foreground" />}
      </button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const bankMethods = methods.filter((m) => m.method_type === 'bank_account');
  const mobileMethods = methods.filter((m) => m.method_type === 'mobile_money');

  const MethodCard = ({ method }: { method: ManualPaymentMethodInfo }) => (
    <div
      onClick={() => setSelected(method)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${
        selected?.id === method.id
          ? 'border-primary ring-1 ring-primary bg-muted/30'
          : 'border-border hover:border-primary/40'
      }`}
    >
      <p className="font-semibold text-foreground text-sm mb-2">{method.name}</p>

      {method.method_type === 'bank_account' ? (
        <>
          {method.bank_name && <CopyRow label="Bank" value={method.bank_name} />}
          {method.account_name && <CopyRow label="Account name" value={method.account_name} />}
          {method.account_number && <CopyRow label="Account number" value={method.account_number} />}
          {method.branch_code && <CopyRow label="Branch code" value={method.branch_code} />}
          {method.swift_code && <CopyRow label="SWIFT code" value={method.swift_code} />}
        </>
      ) : (
        <>
          {method.merchant_name && <CopyRow label="Merchant name" value={method.merchant_name} />}
          {method.merchant_code && <CopyRow label="Merchant code" value={method.merchant_code} />}
          {method.phone_number && <CopyRow label="Phone number" value={method.phone_number} />}
        </>
      )}
      <CopyRow label="Currency" value={method.currency} />

      {method.ussd_instructions && (
        <p className="mt-3 text-xs text-muted-foreground whitespace-pre-line">
          {method.ussd_instructions}
        </p>
      )}
      {method.reference_instructions && (
        <p className="mt-3 text-xs text-muted-foreground whitespace-pre-line">
          {method.reference_instructions}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/30">
      <header className="bg-[rgb(var(--brand-dark))] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src={BRAND.logo.mini} alt="" className="w-6 h-6" />
            </div>
            <span className="text-lg font-semibold">{BRAND.name}</span>
          </div>
          <button onClick={() => router.back()} className="text-sm text-white/70 hover:text-white transition-colors flex items-center gap-1">
            <RiArrowLeftLine className="w-4 h-4" /> Back
          </button>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          {submitted ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiCheckLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment notification received</h2>
              <p className="text-sm text-muted-foreground mb-6">
                We&apos;ll verify and activate your <strong>{plan?.name}</strong> subscription shortly.
              </p>
              <Button onClick={() => router.push('/dashboard')}>Go to Dashboard</Button>
            </div>
          ) : (
            <>
              {/* Order summary */}
              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-semibold tracking-widest uppercase text-primary">{plan?.name}</p>
                  <span className="text-xs text-muted-foreground capitalize">{billingCycle}</span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className="text-2xl font-bold text-foreground">{fmtPrice(price)}</span>
                  <span className="text-sm text-muted-foreground">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
                </div>
              </div>

              <div className="bg-card border border-border rounded-2xl p-6 mb-6">
                <h2 className="text-lg font-semibold text-foreground mb-1">Pay by transfer or deposit</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Send {fmtPrice(price)} to one of the accounts below, then tell us the reference so we can match it.
                </p>

                {loadError && (
                  <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                    <p className="text-sm text-destructive">{loadError}</p>
                  </div>
                )}

                {bankMethods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiBankLine className="w-4 h-4" /> Bank transfer
                    </h3>
                    <div className="space-y-3">
                      {bankMethods.map((m) => <MethodCard key={m.id} method={m} />)}
                    </div>
                  </div>
                )}

                {mobileMethods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiSmartphoneLine className="w-4 h-4" /> Mobile money
                    </h3>
                    <div className="space-y-3">
                      {mobileMethods.map((m) => <MethodCard key={m.id} method={m} />)}
                    </div>
                  </div>
                )}

                {!loadError && methods.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No payment details are published yet. Please contact support and we&apos;ll send them to you.
                  </p>
                )}
              </div>

              {selected && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Confirm your payment</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Payment reference <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      value={reference} onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. TXN-12345" className="h-11"
                    />
                  </div>
                  {submitError && (
                    <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                      <p className="text-sm text-destructive">{submitError}</p>
                    </div>
                  )}
                  <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                    {submitting ? 'Sending…' : "I've made payment"}
                  </Button>
                  <p className="mt-3 text-xs text-center text-muted-foreground">
                    We&apos;ll verify and activate your subscription within 24 hours.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
