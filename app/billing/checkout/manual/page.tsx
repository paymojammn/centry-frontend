'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BRAND } from '@/config/brand';
import {
  getSubscriptionPlans,
  SubscriptionPlan,
} from '@/lib/billing-api';
import { paymentSourcesApi } from '@/lib/payment-sources-api';
import type { PaymentSource } from '@/types/payment-sources';
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
 * Manual payment page — shows Centry's bank accounts and mobile money details
 * for customers to pay manually. Uses the same unified payment sources API.
 */
export default function ManualPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [sources, setSources] = useState<PaymentSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [reference, setReference] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    Promise.all([
      getSubscriptionPlans(),
      paymentSourcesApi.getPaymentSources(), // Centry's org sources
    ]).then(([plans, resp]) => {
      setPlan(plans.find((p) => p.code === planCode) || plans[0] || null);
      // Show bank accounts and mobile money as manual deposit options
      setSources(resp.sources?.filter((s) => s.type === 'bank_account' || s.type === 'mobile_money') || []);
      setLoading(false);
    });
  }, [planCode]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSubmit = async () => {
    if (!plan || !selectedSource) return;
    // Submit manual payment notification via billing API
    try {
      const { submitManualPayment } = await import('@/lib/billing-api');
      await submitManualPayment(plan.code, billingCycle, selectedSource.id, reference);
      setSubmitted(true);
    } catch { /* */ }
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
      <button onClick={() => copyToClipboard(value, label)} className="p-2 rounded-lg hover:bg-muted transition-colors" title="Copy">
        {copied === label
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

  const bankSources = sources.filter((s) => s.type === 'bank_account');
  const mobileSources = sources.filter((s) => s.type === 'mobile_money');

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/30">
      <header className="bg-[rgb(var(--brand-dark))] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <img src={BRAND.logo.mini} alt="" className="w-6 h-6" />
            </div>
            <span className="text-lg font-semibold">Centry</span>
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
                We'll verify and activate your <strong>{plan?.name}</strong> subscription shortly.
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
                <h2 className="text-lg font-semibold text-foreground mb-1">Manual payment</h2>
                <p className="text-sm text-muted-foreground mb-6">
                  Send payment to any of the accounts below, then confirm.
                </p>

                {/* Bank accounts */}
                {bankSources.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiBankLine className="w-4 h-4" /> Bank Transfer
                    </h3>
                    <div className="space-y-3">
                      {bankSources.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSource(s)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedSource?.id === s.id
                              ? 'border-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-dark))] bg-muted/30'
                              : 'border-border hover:border-[rgb(var(--brand-dark))]/40'
                          }`}
                        >
                          <p className="font-semibold text-foreground text-sm mb-2">{s.bank_name || s.name}</p>
                          {s.name && <CopyRow label="Account Name" value={s.name} />}
                          {s.account_number && <CopyRow label="Account Number" value={s.account_number} />}
                          {s.swift_code && <CopyRow label="SWIFT Code" value={s.swift_code} />}
                          <CopyRow label="Currency" value={s.currency} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mobile money */}
                {mobileSources.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiSmartphoneLine className="w-4 h-4" /> Mobile Money
                    </h3>
                    <div className="space-y-3">
                      {mobileSources.map((s) => (
                        <div
                          key={s.id}
                          onClick={() => setSelectedSource(s)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedSource?.id === s.id
                              ? 'border-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-dark))] bg-muted/30'
                              : 'border-border hover:border-[rgb(var(--brand-dark))]/40'
                          }`}
                        >
                          <p className="font-semibold text-foreground text-sm mb-2">{s.name}</p>
                          {s.phone_number && <CopyRow label="Phone Number" value={s.phone_number} />}
                          <CopyRow label="Provider" value={s.provider_name || s.provider} />
                          <CopyRow label="Currency" value={s.currency} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sources.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No payment accounts configured. Please contact support.
                  </p>
                )}
              </div>

              {selectedSource && (
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
                  <Button onClick={handleSubmit} className="w-full">I've made payment</Button>
                  <p className="mt-3 text-xs text-center text-muted-foreground">
                    We'll verify and activate your subscription within 24 hours.
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
