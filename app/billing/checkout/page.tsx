'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSubscriptionPlans,
  startCheckout,
  getCheckoutStatus,
  SubscriptionPlan,
  PaymentMethodCode,
  CheckoutSessionResponse,
} from '@/lib/billing-api';
import {
  RiSmartphoneLine,
  RiBankLine,
  RiCheckLine,
  RiCloseLine,
  RiLoader4Line,
  RiArrowLeftLine,
  RiPhoneLine,
  RiHandCoinLine,
} from '@remixicon/react';

const PAYMENT_METHODS: { code: PaymentMethodCode | 'manual'; name: string; icon: typeof RiSmartphoneLine; description: string; region: string }[] = [
  { code: 'mtn_momo', name: 'MTN Mobile Money', icon: RiSmartphoneLine, description: 'Pay via USSD prompt on your phone', region: 'Uganda' },
  { code: 'airtel_money', name: 'Airtel Money', icon: RiPhoneLine, description: 'Pay via USSD prompt on your phone', region: 'Uganda' },
  { code: 'ozow_eft', name: 'Bank / EFT (Ozow)', icon: RiBankLine, description: 'Instant EFT or bank transfer', region: 'South Africa' },
  { code: 'manual', name: 'Manual Payment', icon: RiHandCoinLine, description: 'Pay via bank transfer or mobile money merchant code', region: 'All' },
];

type CheckoutStep = 'method' | 'phone' | 'processing' | 'success' | 'failed';

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planCode = searchParams.get('plan') || 'sme';
  const billingCycle = (searchParams.get('cycle') || 'monthly') as 'monthly' | 'annual';

  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [step, setStep] = useState<CheckoutStep>('method');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodCode | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [session, setSession] = useState<CheckoutSessionResponse | null>(null);
  const [failureReason, setFailureReason] = useState('');

  // Load plan
  useEffect(() => {
    getSubscriptionPlans().then((plans) => {
      const match = plans.find((p) => p.code === planCode);
      setPlan(match || plans[0] || null);
    });
  }, [planCode]);

  // Poll for status when processing
  useEffect(() => {
    if (step !== 'processing' || !session) return;

    const interval = setInterval(async () => {
      try {
        const status = await getCheckoutStatus(session.session_id);
        if (status.status === 'completed') {
          setStep('success');
          clearInterval(interval);
        } else if (status.status === 'failed' || status.status === 'expired') {
          setFailureReason(status.failure_reason || 'Payment was not completed');
          setStep('failed');
          clearInterval(interval);
        }
      } catch {
        // Keep polling on network errors
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, session]);

  const price = plan
    ? billingCycle === 'annual'
      ? plan.annual_price
      : plan.monthly_price
    : '0';

  const currency = selectedMethod === 'ozow_eft' ? 'ZAR' : 'UGX';

  const handleSelectMethod = (method: PaymentMethodCode | 'manual') => {
    if (method === 'manual') {
      router.push(`/billing/checkout/manual?plan=${planCode}&cycle=${billingCycle}`);
      return;
    }
    setSelectedMethod(method);
    setError('');
    if (method === 'ozow_eft') {
      // Ozow doesn't need a phone number — go straight to processing
      handlePay(method);
    } else {
      setStep('phone');
    }
  };

  const handlePay = async (methodOverride?: PaymentMethodCode) => {
    const method = methodOverride || selectedMethod;
    if (!method || !plan) return;

    const needsPhone = method !== 'ozow_eft';
    if (needsPhone && !phone.match(/^\d{10,15}$/)) {
      setError('Enter a valid phone number (e.g. 256701234567)');
      return;
    }

    setStep('processing');
    setError('');

    try {
      const result = await startCheckout(plan.code, billingCycle, method, needsPhone ? phone : undefined);
      setSession(result);

      // Ozow redirects externally — startCheckout handles that
      if (result.status === 'failed') {
        setFailureReason('Failed to initiate payment. Please try again.');
        setStep('failed');
      }
    } catch (err: any) {
      setFailureReason(err.message || 'Something went wrong');
      setStep('failed');
    }
  };

  const fmtPrice = (p: string) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(parseFloat(p));

  if (!plan) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-muted/30">
        <RiLoader4Line className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-lg">

          {/* Order summary — always visible */}
          <div className="bg-card border border-border rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-semibold tracking-widest uppercase text-primary">{plan.name}</p>
              <span className="text-xs text-muted-foreground capitalize">{billingCycle}</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-foreground">{fmtPrice(price)}</span>
              <span className="text-sm text-muted-foreground">/{billingCycle === 'annual' ? 'yr' : 'mo'}</span>
            </div>
          </div>

          {/* Step: Choose payment method */}
          {step === 'method' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Choose payment method</h2>
              <p className="text-sm text-muted-foreground mb-6">Select how you'd like to pay for your subscription.</p>

              <div className="space-y-3">
                {PAYMENT_METHODS.map((m) => (
                  <button
                    key={m.code}
                    onClick={() => handleSelectMethod(m.code)}
                    className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-[rgb(var(--brand-dark))]/40 hover:shadow-sm transition-all text-left"
                  >
                    <div className="w-11 h-11 rounded-xl bg-muted flex items-center justify-center shrink-0">
                      <m.icon className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{m.name}</p>
                      <p className="text-xs text-muted-foreground">{m.description}</p>
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full shrink-0">{m.region}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step: Enter phone number (MoMo / Airtel) */}
          {step === 'phone' && (
            <div className="bg-card border border-border rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-foreground mb-1">Enter your phone number</h2>
              <p className="text-sm text-muted-foreground mb-6">
                You'll receive a USSD prompt on your {selectedMethod === 'mtn_momo' ? 'MTN' : 'Airtel'} phone to approve the payment.
              </p>

              <div className="mb-4">
                <label className="block text-sm font-medium text-foreground mb-2">Phone number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="256701234567"
                  className="w-full h-12 px-4 bg-muted/50 border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Include country code (e.g. 256 for Uganda)</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                  <p className="text-sm text-destructive">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('method'); setError(''); }}
                  className="px-5 py-3 rounded-xl text-sm font-medium border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={() => handlePay()}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
                >
                  Pay {fmtPrice(price)}
                </button>
              </div>
            </div>
          )}

          {/* Step: Processing — waiting for payment */}
          {step === 'processing' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiLoader4Line className="w-8 h-8 text-primary animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">Waiting for payment</h2>
              {selectedMethod === 'ozow_eft' ? (
                <p className="text-sm text-muted-foreground">Redirecting to Ozow for bank payment...</p>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-1">
                    Check your <strong>{selectedMethod === 'mtn_momo' ? 'MTN' : 'Airtel'}</strong> phone for the USSD prompt.
                  </p>
                  <p className="text-sm text-muted-foreground">Approve the payment of <strong>{fmtPrice(price)}</strong> to continue.</p>
                </>
              )}
              <p className="mt-6 text-xs text-muted-foreground">This page will update automatically when payment is confirmed.</p>
            </div>
          )}

          {/* Step: Success */}
          {step === 'success' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <RiCheckLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment successful!</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Your <strong>{plan.name}</strong> subscription is now active. Welcome to Centry.
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-8 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Step: Failed */}
          {step === 'failed' && (
            <div className="bg-card border border-border rounded-2xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                <RiCloseLine className="w-8 h-8 text-destructive" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Payment failed</h2>
              <p className="text-sm text-muted-foreground mb-6">{failureReason || 'The payment could not be completed.'}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => { setStep('method'); setSession(null); setFailureReason(''); }}
                  className="px-6 py-3 rounded-xl text-sm font-semibold border border-border text-foreground hover:bg-muted transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={() => router.push('/billing/subscribe')}
                  className="px-6 py-3 rounded-xl text-sm font-semibold bg-[rgb(var(--brand-dark))] text-white hover:opacity-90 transition-all"
                >
                  Change Plan
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
