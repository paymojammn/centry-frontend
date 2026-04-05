'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSubscriptionPlans,
  getManualPaymentMethods,
  submitManualPayment,
  SubscriptionPlan,
  ManualPaymentMethodInfo,
} from '@/lib/billing-api';
import {
  RiSmartphoneLine,
  RiBankLine,
  RiCheckLine,
  RiArrowLeftLine,
  RiFileCopyLine,
  RiLoader4Line,
} from '@remixicon/react';

export default function ManualPaymentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [methods, setMethods] = useState<ManualPaymentMethodInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<ManualPaymentMethodInfo | null>(null);
  const [reference, setReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [copied, setCopied] = useState('');

  useEffect(() => {
    Promise.all([getSubscriptionPlans(), getManualPaymentMethods()]).then(
      ([plans, paymentMethods]) => {
        setPlan(plans.find((p) => p.code === planCode) || plans[0] || null);
        setMethods(paymentMethods);
        setLoading(false);
      }
    );
  }, [planCode]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const handleSubmit = async () => {
    if (!plan || !selectedMethod) return;
    setSubmitting(true);
    try {
      await submitManualPayment(plan.code, billingCycle, selectedMethod.id, reference);
      setSubmitted(true);
    } catch {
      // Error handling
    } finally {
      setSubmitting(false);
    }
  };

  const fmtPrice = (p: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(p));

  const price = plan ? (billingCycle === 'annual' ? plan.annual_price : plan.monthly_price) : '0';

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const mobileMoneyMethods = methods.filter((m) => m.method_type === 'mobile_money');
  const bankMethods = methods.filter((m) => m.method_type === 'bank_account');

  // CopyRow helper
  const CopyRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
      <button
        onClick={() => copyToClipboard(value, label)}
        className="p-2 rounded-lg hover:bg-muted transition-colors"
        title="Copy"
      >
        {copied === label ? (
          <RiCheckLine className="w-4 h-4 text-primary" />
        ) : (
          <RiFileCopyLine className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen w-full flex flex-col bg-muted/30">
      {/* Header */}
      <header className="bg-[rgb(var(--brand-dark))] text-white shrink-0">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[rgb(var(--brand-dark))] font-bold text-lg">C</span>
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

          {/* Success state */}
          {submitted ? (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiCheckLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment notification received</h2>
              <p className="text-sm text-muted-foreground mb-2">
                We've recorded your payment. Our team will verify it and activate your
                <strong> {plan?.name}</strong> subscription shortly.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                You'll receive an email once your subscription is active.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
              >
                Go to Dashboard
              </button>
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
                  Send payment using any of the methods below, then click "I've made payment" to notify us.
                </p>

                {/* Mobile Money Methods */}
                {mobileMoneyMethods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiSmartphoneLine className="w-4 h-4" /> Mobile Money
                    </h3>
                    <div className="space-y-3">
                      {mobileMoneyMethods.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMethod(m)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedMethod?.id === m.id
                              ? 'border-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-dark))] bg-muted/30'
                              : 'border-border hover:border-[rgb(var(--brand-dark))]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground text-sm">{m.name}</p>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">{m.country}</span>
                          </div>
                          {m.merchant_code && <CopyRow label="Merchant Code" value={m.merchant_code} />}
                          {m.merchant_name && <CopyRow label="Merchant Name" value={m.merchant_name} />}
                          {m.phone_number && <CopyRow label="Phone Number" value={m.phone_number} />}
                          {m.ussd_instructions && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">How to pay:</p>
                              <p className="text-xs text-foreground whitespace-pre-line">{m.ussd_instructions}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Bank Methods */}
                {bankMethods.length > 0 && (
                  <div className="mb-6">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
                      <RiBankLine className="w-4 h-4" /> Bank Transfer
                    </h3>
                    <div className="space-y-3">
                      {bankMethods.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMethod(m)}
                          className={`p-4 rounded-xl border cursor-pointer transition-all ${
                            selectedMethod?.id === m.id
                              ? 'border-[rgb(var(--brand-dark))] ring-1 ring-[rgb(var(--brand-dark))] bg-muted/30'
                              : 'border-border hover:border-[rgb(var(--brand-dark))]/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <p className="font-semibold text-foreground text-sm">{m.name}</p>
                            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">{m.country}</span>
                          </div>
                          {m.bank_name && <CopyRow label="Bank" value={m.bank_name} />}
                          {m.account_name && <CopyRow label="Account Name" value={m.account_name} />}
                          {m.account_number && <CopyRow label="Account Number" value={m.account_number} />}
                          {m.branch_code && <CopyRow label="Branch Code" value={m.branch_code} />}
                          {m.swift_code && <CopyRow label="SWIFT Code" value={m.swift_code} />}
                          {m.reference_instructions && (
                            <div className="mt-3 p-3 bg-muted/50 rounded-lg">
                              <p className="text-xs font-semibold text-muted-foreground mb-1">Payment reference:</p>
                              <p className="text-xs text-foreground">{m.reference_instructions}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {methods.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No manual payment methods configured yet. Please contact support.
                  </p>
                )}
              </div>

              {/* Confirmation */}
              {selectedMethod && (
                <div className="bg-card border border-border rounded-2xl p-6">
                  <h3 className="text-sm font-semibold text-foreground mb-3">Confirm your payment</h3>
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Payment reference / transaction ID <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={reference}
                      onChange={(e) => setReference(e.target.value)}
                      placeholder="e.g. TXN-12345 or your phone number"
                      className="w-full h-11 px-4 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {submitting ? 'Submitting...' : "I've made payment"}
                  </button>
                  <p className="mt-3 text-xs text-center text-muted-foreground">
                    Our team will verify your payment and activate your subscription within 24 hours.
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
