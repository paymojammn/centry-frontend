'use client';

import * as React from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useCheckoutSession, usePaymentMethods, useInitiatePayment, usePaymentStatus } from '@/hooks/use-checkout';
import {
  CheckoutLayout,
  CheckoutCard,
  CheckoutCardHeader,
  CheckoutCardContent,
  OrderSummary,
  CountrySelector,
  PaymentMethodList,
  CustomerForm,
  PaymentStatus,
  ValrPayment,
  CustomerFormData,
} from '@/components/checkout';
import { ValrInlineData } from '@/lib/checkout-api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertCircle, ArrowLeft, Clock, ShieldCheck } from 'lucide-react';

type CheckoutStep = 'loading' | 'select' | 'details' | 'processing' | 'valr_qr' | 'success' | 'failed' | 'expired';

// PostMessage helper for widget communication
function postToParent(type: string, data?: Record<string, unknown>) {
  if (typeof window !== 'undefined' && window.parent !== window) {
    window.parent.postMessage({ type, data }, '*');
  }
}

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = params.token as string;
  const isEmbedded = searchParams.get('embed') === 'true';

  // State
  const [step, setStep] = React.useState<CheckoutStep>('loading');
  const [selectedCountry, setSelectedCountry] = React.useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = React.useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = React.useState<string | null>(null);
  const [paymentError, setPaymentError] = React.useState<string | null>(null);
  const [valrInlineData, setValrInlineData] = React.useState<ValrInlineData | null>(null);

  // API Hooks
  const { data: checkoutInfo, isLoading: sessionLoading, error: sessionError } = useCheckoutSession(token);
  const { data: methodsData, isLoading: methodsLoading } = usePaymentMethods(token, selectedCountry ?? undefined);
  const initiatePayment = useInitiatePayment(token);
  const { data: statusData } = usePaymentStatus(
    token,
    step === 'processing' || step === 'valr_qr'
  );

  // Initialize state from session
  React.useEffect(() => {
    if (checkoutInfo) {
      const session = checkoutInfo.session;

      if (session.status === 'expired') { setStep('expired'); return; }
      if (session.status === 'completed') { setStep('success'); return; }
      if (session.status === 'failed') { setStep('failed'); return; }

      // Set default country
      const countries = checkoutInfo.countries || [];
      if (checkoutInfo.default_country) {
        setSelectedCountry(checkoutInfo.default_country);
      } else if (countries.length === 1) {
        setSelectedCountry(countries[0].code);
      }

      setStep('select');
    }
  }, [checkoutInfo]);

  // Handle payment status updates
  React.useEffect(() => {
    if (statusData) {
      if (statusData.session_status === 'completed' || statusData.payment_status === 'success') {
        if (step === 'valr_qr') {
          setTimeout(() => { setStep('success'); setValrInlineData(null); }, 2000);
        } else {
          setStep('success');
        }
        postToParent('centry:checkout:success', { status: 'success' });
        if (checkoutInfo?.session.success_url && !isEmbedded) {
          setTimeout(() => {
            window.location.href = checkoutInfo.session.success_url;
          }, step === 'valr_qr' ? 4000 : 2000);
        }
      } else if (statusData.payment_status === 'failed') {
        setStep('failed');
        setValrInlineData(null);
        setPaymentError(statusData.message || 'Payment failed');
        postToParent('centry:checkout:error', { message: statusData.message || 'Payment failed' });
      }
    }
  }, [statusData, checkoutInfo, isEmbedded, step]);

  const selectedProviderDetails = React.useMemo(() => {
    if (!methodsData || !selectedProvider) return null;
    return methodsData.methods.find((p) => p.provider === selectedProvider);
  }, [methodsData, selectedProvider]);

  const handleMethodSelect = (provider: string, method: string) => {
    setSelectedProvider(provider);
    setSelectedMethod(method);
  };

  const handleContinue = () => {
    if (selectedProvider && selectedMethod) {
      setStep('details');
    }
  };

  const handleSubmitPayment = async (customerData: CustomerFormData) => {
    if (!selectedProvider || !selectedMethod || !selectedCountry) return;
    setPaymentError(null);
    setStep('processing');

    try {
      const result = await initiatePayment.mutateAsync({
        provider: selectedProvider,
        payment_method: selectedMethod,
        country: selectedCountry,
        ...customerData,
      });

      if (result.requires_redirect && result.authorization_url) {
        if (isEmbedded) {
          postToParent('centry:checkout:redirect', { url: result.authorization_url });
        } else {
          window.location.href = result.authorization_url;
        }
        return;
      }

      if (result.inline_data?.payment_type === 'valr_pay') {
        setValrInlineData(result.inline_data);
        setStep('valr_qr');
        return;
      }
    } catch (error) {
      setStep('failed');
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      postToParent('centry:checkout:error', { message: errorMessage });
    }
  };

  const handleRetry = () => { setPaymentError(null); setValrInlineData(null); setStep('select'); };
  const handleValrExpired = () => { setValrInlineData(null); setPaymentError('Payment QR code expired.'); setStep('failed'); };
  const handleCancel = () => {
    if (isEmbedded) { postToParent('centry:checkout:close'); return; }
    if (checkoutInfo?.session.cancel_url) { window.location.href = checkoutInfo.session.cancel_url; }
  };
  const handleBack = () => { if (step === 'details') setStep('select'); };

  // Loading
  if (sessionLoading || step === 'loading') {
    return (
      <CheckoutLayout>
        <CheckoutCard>
          <CheckoutCardContent className="py-16">
            <div className="space-y-4 flex flex-col items-center">
              <div className="size-10 rounded-full bg-slate-100 animate-pulse" />
              <Skeleton className="h-10 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  // Error
  if (sessionError || !checkoutInfo) {
    return (
      <CheckoutLayout>
        <CheckoutCard>
          <CheckoutCardContent className="py-16 text-center">
            <div className="size-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="size-7 text-red-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Session not found</h2>
            <p className="text-sm text-slate-400">This checkout session may have expired or is invalid.</p>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  // Expired
  if (step === 'expired') {
    return (
      <CheckoutLayout merchantName={checkoutInfo.session.merchant.name} merchantLogo={checkoutInfo.session.merchant.logo_url}>
        <CheckoutCard>
          <CheckoutCardContent className="py-16 text-center">
            <div className="size-14 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="size-7 text-amber-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Session expired</h2>
            <p className="text-sm text-slate-400 mb-6">This checkout session has expired. Please start a new checkout.</p>
            <Button onClick={handleCancel} variant="outline" className="rounded-xl">
              Return to merchant
            </Button>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  const session = checkoutInfo.session;
  const countries = checkoutInfo.countries || [];

  return (
    <CheckoutLayout merchantName={session.merchant.name} merchantLogo={session.merchant.logo_url}>
      <CheckoutCard>
        {/* Order Summary — always visible at top */}
        <CheckoutCardContent>
          <OrderSummary session={session} />
        </CheckoutCardContent>

        {/* Divider */}
        <div className="h-px bg-slate-100" />

        {/* VALR QR */}
        {step === 'valr_qr' && valrInlineData && (
          <CheckoutCardContent>
            <ValrPayment
              qrCodeUrl={valrInlineData.qr_code_url}
              paymentLink={valrInlineData.payment_link}
              webLink={valrInlineData.web_link}
              expiresAt={valrInlineData.expires_at}
              amount={session.amount}
              currency={session.currency}
              receiveCurrency={valrInlineData.receive_currency}
              onExpired={handleValrExpired}
              status={
                statusData?.payment_status === 'success' ? 'completed'
                  : statusData?.payment_status === 'processing' ? 'processing'
                  : 'pending'
              }
            />
          </CheckoutCardContent>
        )}

        {/* Processing / Success / Failed */}
        {(step === 'processing' || step === 'success' || step === 'failed') && step !== 'valr_qr' && (
          <CheckoutCardContent>
            <PaymentStatus
              status={
                step === 'processing'
                  ? statusData?.payment_status === 'pending' ? 'pending' : 'processing'
                  : step
              }
              message={paymentError}
              onRetry={step === 'failed' ? handleRetry : undefined}
              onCancel={step === 'failed' ? handleCancel : undefined}
              canRetry={statusData?.can_retry ?? true}
            />
          </CheckoutCardContent>
        )}

        {/* Selection Step */}
        {step === 'select' && (
          <CheckoutCardContent className="space-y-5">
            {/* Country */}
            {countries.length > 1 && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Country
                </label>
                <CountrySelector
                  countries={countries}
                  selectedCountry={selectedCountry}
                  onSelect={(code) => {
                    setSelectedCountry(code);
                    setSelectedProvider(null);
                    setSelectedMethod(null);
                  }}
                />
              </div>
            )}

            {/* Country badge for single country */}
            {countries.length === 1 && (
              <CountrySelector
                countries={countries}
                selectedCountry={selectedCountry}
                onSelect={setSelectedCountry}
              />
            )}

            {/* Payment Methods */}
            {selectedCountry && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                  Payment method
                </label>
                <PaymentMethodList
                  providers={methodsData?.methods || []}
                  selectedProvider={selectedProvider}
                  selectedMethod={selectedMethod}
                  onSelect={handleMethodSelect}
                  loading={methodsLoading}
                />
              </div>
            )}

            {/* Buttons */}
            <div className="pt-2 flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                size="lg"
                className="flex-1 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                onClick={handleContinue}
                size="lg"
                className="flex-1 rounded-xl"
                disabled={!selectedProvider || !selectedMethod}
              >
                Continue
              </Button>
            </div>

            {/* Trust badge */}
            <div className="flex items-center justify-center gap-1.5 pt-1">
              <ShieldCheck className="size-3 text-emerald-500" />
              <span className="text-[11px] text-slate-400">
                256-bit encrypted &middot; PCI compliant
              </span>
            </div>
          </CheckoutCardContent>
        )}

        {/* Details Step */}
        {step === 'details' && (
          <>
            <div className="px-6 py-3 border-t border-slate-100 flex items-center gap-3">
              <button
                onClick={handleBack}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="size-4 text-slate-400" />
              </button>
              <h2 className="text-sm font-semibold text-slate-700">
                Enter your details
              </h2>
            </div>
            <CheckoutCardContent>
              <CustomerForm
                initialEmail={session.customer_email}
                initialPhone={session.customer_phone}
                initialName={session.customer_name}
                requiresPhone={selectedProviderDetails?.requires_phone ?? false}
                onSubmit={handleSubmitPayment}
                loading={initiatePayment.isPending}
              />
            </CheckoutCardContent>
          </>
        )}
      </CheckoutCard>
    </CheckoutLayout>
  );
}
