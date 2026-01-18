'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  getSubscriptionPlans,
  redirectToCheckout,
  exchangeAuthCode,
  SubscriptionPlan,
} from '@/lib/billing-api';
import { setAuthToken } from '@/lib/api';

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [error, setError] = useState<string | null>(null);
  const [processingCheckout, setProcessingCheckout] = useState(false);

  // Check for auth code in URL (from OAuth redirect)
  useEffect(() => {
    const authCode = searchParams.get('auth_code');
    const subscriptionRequired = searchParams.get('subscription_required');
    const reason = searchParams.get('reason');

    if (authCode) {
      // Exchange auth code for tokens
      exchangeAuthCode(authCode)
        .then((response) => {
          // Store tokens
          localStorage.setItem('auth_token', response.access_token);
          localStorage.setItem('refresh_token', response.refresh_token);

          // Clean URL
          const url = new URL(window.location.href);
          url.searchParams.delete('auth_code');
          url.searchParams.delete('subscription_required');
          url.searchParams.delete('reason');
          window.history.replaceState({}, '', url.toString());

          // Show appropriate message based on reason
          if (reason === 'trial_expired') {
            setError('Your trial has expired. Please select a plan to continue.');
          } else if (reason === 'no_subscription') {
            // First time - show welcome
            setError(null);
          }
        })
        .catch((err) => {
          console.error('Failed to exchange auth code:', err);
          setError('Authentication failed. Please try logging in again.');
        });
    }
  }, [searchParams]);

  // Load subscription plans
  useEffect(() => {
    async function loadPlans() {
      try {
        const plansList = await getSubscriptionPlans();
        setPlans(plansList);
        // Pre-select the starter plan
        const starterPlan = plansList.find((p) => p.code === 'starter');
        if (starterPlan) {
          setSelectedPlan(starterPlan.code);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
        setError('Failed to load subscription plans');
      } finally {
        setLoading(false);
      }
    }

    loadPlans();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    setProcessingCheckout(true);
    setError(null);

    try {
      await redirectToCheckout(selectedPlan, billingCycle);
    } catch (err: any) {
      console.error('Checkout failed:', err);
      setError(err.message || 'Failed to start checkout');
      setProcessingCheckout(false);
    }
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Start with a 14-day free trial. No credit card required.
            Upgrade anytime.
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="max-w-md mx-auto mb-8 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 text-center">{error}</p>
          </div>
        )}

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 p-1 rounded-lg inline-flex">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'monthly'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                billingCycle === 'annual'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Annual
              <span className="ml-2 text-green-600 text-xs font-bold">
                Save 17%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan) => {
            const price =
              billingCycle === 'annual'
                ? plan.annual_price
                : plan.monthly_price;
            const isSelected = selectedPlan === plan.code;
            const isPopular = plan.code === 'professional';

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlan(plan.code)}
                className={`relative bg-white rounded-2xl shadow-sm cursor-pointer transition-all ${
                  isSelected
                    ? 'ring-2 ring-indigo-600 shadow-lg'
                    : 'hover:shadow-md'
                } ${isPopular ? 'border-2 border-indigo-600' : 'border border-gray-200'}`}
              >
                {isPopular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                    <span className="bg-indigo-600 text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {plan.name}
                  </h3>
                  <p className="mt-2 text-gray-500 text-sm">
                    {plan.description}
                  </p>

                  <div className="mt-6">
                    <span className="text-4xl font-bold text-gray-900">
                      {formatPrice(price)}
                    </span>
                    <span className="text-gray-500">
                      /{billingCycle === 'annual' ? 'year' : 'month'}
                    </span>
                  </div>

                  {plan.trial_days > 0 && (
                    <p className="mt-2 text-sm text-green-600">
                      {plan.trial_days}-day free trial
                    </p>
                  )}

                  <ul className="mt-8 space-y-4">
                    {plan.max_users && (
                      <li className="flex items-center">
                        <CheckIcon />
                        <span className="ml-3 text-gray-600">
                          Up to {plan.max_users} users
                        </span>
                      </li>
                    )}
                    {plan.max_erp_connections && (
                      <li className="flex items-center">
                        <CheckIcon />
                        <span className="ml-3 text-gray-600">
                          {plan.max_erp_connections} ERP connection
                          {plan.max_erp_connections > 1 ? 's' : ''}
                        </span>
                      </li>
                    )}
                    {Object.entries(plan.features || {}).map(
                      ([feature, enabled]) =>
                        enabled && (
                          <li key={feature} className="flex items-center">
                            <CheckIcon />
                            <span className="ml-3 text-gray-600 capitalize">
                              {feature.replace(/_/g, ' ')}
                            </span>
                          </li>
                        )
                    )}
                  </ul>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPlan(plan.code);
                    }}
                    className={`mt-8 w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    {isSelected ? 'Selected' : 'Select Plan'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Subscribe Button */}
        <div className="mt-12 text-center">
          <button
            onClick={handleSubscribe}
            disabled={!selectedPlan || processingCheckout}
            className="px-8 py-4 bg-indigo-600 text-white text-lg font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processingCheckout ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Processing...
              </span>
            ) : (
              'Start Free Trial'
            )}
          </button>
          <p className="mt-4 text-sm text-gray-500">
            No credit card required for trial. Cancel anytime.
          </p>
        </div>

        {/* Login Link */}
        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <a
              href="/auth/login"
              className="text-indigo-600 hover:text-indigo-700 font-medium"
            >
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-green-500"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
