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
import { AlertCircle, ArrowLeft, Clock } from 'lucide-react';

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

      // Check if session is expired or completed
      if (session.status === 'expired') {
        setStep('expired');
        return;
      }
      if (session.status === 'completed') {
        setStep('success');
        return;
      }
      if (session.status === 'failed') {
        setStep('failed');
        return;
      }

      // Set default country
      if (checkoutInfo.default_country) {
        setSelectedCountry(checkoutInfo.default_country);
      } else if (checkoutInfo.countries.length === 1) {
        setSelectedCountry(checkoutInfo.countries[0].code);
      }

      setStep('select');
    }
  }, [checkoutInfo]);

  // Handle payment status updates
  React.useEffect(() => {
    if (statusData) {
      if (statusData.session_status === 'completed' || statusData.payment_status === 'success') {
        // For VALR, first show completed state in QR component, then transition to success
        if (step === 'valr_qr') {
          setTimeout(() => {
            setStep('success');
            setValrInlineData(null);
          }, 2000); // Show completed state for 2 seconds
        } else {
          setStep('success');
        }
        // Notify parent if embedded
        postToParent('centry:checkout:success', { status: 'success' });
        // Redirect to success URL after a short delay (unless embedded)
        if (checkoutInfo?.session.success_url && !isEmbedded) {
          setTimeout(() => {
            window.location.href = checkoutInfo.session.success_url;
          }, step === 'valr_qr' ? 4000 : 2000);
        }
      } else if (statusData.payment_status === 'failed') {
        setStep('failed');
        setValrInlineData(null);
        setPaymentError(statusData.message || 'Payment failed');
        // Notify parent if embedded
        postToParent('centry:checkout:error', { message: statusData.message || 'Payment failed' });
      }
    }
  }, [statusData, checkoutInfo, isEmbedded, step]);

  // Get selected provider details
  const selectedProviderDetails = React.useMemo(() => {
    if (!methodsData || !selectedProvider) return null;
    return methodsData.methods.find((p) => p.provider === selectedProvider);
  }, [methodsData, selectedProvider]);

  // Handle method selection
  const handleMethodSelect = (provider: string, method: string) => {
    setSelectedProvider(provider);
    setSelectedMethod(method);
  };

  // Handle continue to details
  const handleContinue = () => {
    if (selectedProvider && selectedMethod) {
      setStep('details');
    }
  };

  // Handle payment submission
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

      // If redirect is required, redirect to authorization URL
      if (result.requires_redirect && result.authorization_url) {
        // Notify parent if embedded (parent handles redirect)
        if (isEmbedded) {
          postToParent('centry:checkout:redirect', { url: result.authorization_url });
        } else {
          window.location.href = result.authorization_url;
        }
        return;
      }

      // Check if this is a VALR QR payment
      if (result.inline_data?.payment_type === 'valr_pay') {
        setValrInlineData(result.inline_data);
        setStep('valr_qr');
        return;
      }

      // Otherwise, continue polling for status (for mobile money STK push)
    } catch (error) {
      setStep('failed');
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      // Notify parent if embedded
      postToParent('centry:checkout:error', { message: errorMessage });
    }
  };

  // Handle retry
  const handleRetry = () => {
    setPaymentError(null);
    setValrInlineData(null);
    setStep('select');
  };

  // Handle VALR QR expiry
  const handleValrExpired = () => {
    setValrInlineData(null);
    setPaymentError('Payment QR code expired. Please try again.');
    setStep('failed');
  };

  // Handle cancel
  const handleCancel = () => {
    // Notify parent if embedded
    if (isEmbedded) {
      postToParent('centry:checkout:close');
      return;
    }
    if (checkoutInfo?.session.cancel_url) {
      window.location.href = checkoutInfo.session.cancel_url;
    }
  };

  // Handle back navigation
  const handleBack = () => {
    if (step === 'details') {
      setStep('select');
    }
  };

  // Loading state
  if (sessionLoading || step === 'loading') {
    return (
      <CheckoutLayout>
        <CheckoutCard>
          <CheckoutCardContent className="py-12">
            <div className="space-y-4">
              <Skeleton className="h-8 w-32 mx-auto" />
              <Skeleton className="h-12 w-48 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  // Error state
  if (sessionError || !checkoutInfo) {
    return (
      <CheckoutLayout>
        <CheckoutCard>
          <CheckoutCardContent className="py-12 text-center">
            <div className="size-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="size-8 text-destructive" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Session not found
            </h2>
            <p className="text-sm text-muted-foreground">
              This checkout session may have expired or is invalid.
            </p>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  // Expired state
  if (step === 'expired') {
    return (
      <CheckoutLayout
        merchantName={checkoutInfo.session.merchant.name}
        merchantLogo={checkoutInfo.session.merchant.logo_url}
      >
        <CheckoutCard>
          <CheckoutCardContent className="py-12 text-center">
            <div className="size-16 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
              <Clock className="size-8 text-amber-500" />
            </div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Session expired
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              This checkout session has expired. Please start a new checkout.
            </p>
            <Button onClick={handleCancel} variant="outline">
              Return to merchant
            </Button>
          </CheckoutCardContent>
        </CheckoutCard>
      </CheckoutLayout>
    );
  }

  const session = checkoutInfo.session;

  return (
    <CheckoutLayout
      merchantName={session.merchant.name}
      merchantLogo={session.merchant.logo_url}
    >
      <div className="space-y-4">
        {/* Order Summary */}
        <CheckoutCard>
          <CheckoutCardContent>
            <OrderSummary session={session} />
          </CheckoutCardContent>
        </CheckoutCard>

        {/* Payment Selection / Details / Status */}
        <CheckoutCard>
          {/* VALR QR Code Payment */}
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
                  statusData?.payment_status === 'success'
                    ? 'completed'
                    : statusData?.payment_status === 'processing'
                    ? 'processing'
                    : 'pending'
                }
              />
            </CheckoutCardContent>
          )}

          {/* Processing / Success / Failed States */}
          {(step === 'processing' || step === 'success' || step === 'failed') && (
            <CheckoutCardContent>
              <PaymentStatus
                status={
                  step === 'processing'
                    ? statusData?.payment_status === 'pending'
                      ? 'pending'
                      : 'processing'
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
            <>
              <CheckoutCardHeader>
                <h2 className="text-base font-semibold text-foreground">
                  Select payment method
                </h2>
              </CheckoutCardHeader>
              <CheckoutCardContent className="space-y-6">
                {/* Country Selector */}
                {checkoutInfo.countries.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
                      Country
                    </label>
                    <CountrySelector
                      countries={checkoutInfo.countries}
                      selectedCountry={selectedCountry}
                      onSelect={setSelectedCountry}
                    />
                  </div>
                )}

                {/* Payment Methods */}
                {selectedCountry && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">
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

                {/* Continue Button */}
                <div className="pt-4 flex gap-3">
                  <Button
                    onClick={handleCancel}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleContinue}
                    size="lg"
                    className="flex-1"
                    disabled={!selectedProvider || !selectedMethod}
                  >
                    Continue
                  </Button>
                </div>
              </CheckoutCardContent>
            </>
          )}

          {/* Details Step */}
          {step === 'details' && (
            <>
              <CheckoutCardHeader className="flex items-center gap-3">
                <button
                  onClick={handleBack}
                  className="p-1 -ml-1 rounded-md hover:bg-muted transition-colors"
                >
                  <ArrowLeft className="size-5 text-muted-foreground" />
                </button>
                <h2 className="text-base font-semibold text-foreground">
                  Enter your details
                </h2>
              </CheckoutCardHeader>
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
      </div>
    </CheckoutLayout>
  );
}
