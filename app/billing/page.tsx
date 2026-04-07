'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  getSubscriptionDetails,
  getPaymentHistory,
  cancelSubscription,
  OrganizationSubscription,
  Payment,
} from '@/lib/billing-api';

export default function BillingPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<OrganizationSubscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);

  useEffect(() => {
    async function loadBillingData() {
      try {
        const [subData, paymentData] = await Promise.all([
          getSubscriptionDetails(),
          getPaymentHistory(),
        ]);
        setSubscription(subData);
        setPayments(paymentData);
      } catch (err: any) {
        console.error('Failed to load billing data:', err);
        if (err.message?.includes('Subscription required')) {
          router.push('/billing/subscribe');
        } else {
          setError(err.message || 'Failed to load billing information');
        }
      } finally {
        setLoading(false);
      }
    }

    loadBillingData();
  }, [router]);

  const handleManagePayment = () => {
    router.push('/billing/manage');
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await cancelSubscription(true); // Cancel at period end
      // Refresh subscription data
      const subData = await getSubscriptionDetails();
      setSubscription(subData);
      setShowCancelModal(false);
    } catch (err: any) {
      console.error('Failed to cancel subscription:', err);
      setError(err.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatPrice = (price: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(parseFloat(price));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading billing information...</p>
        </div>
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <p className="text-muted-foreground">No subscription found</p>
          <button
            onClick={() => router.push('/billing/subscribe')}
            className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    trial: 'bg-primary/5 text-primary',
    active: 'bg-primary/10 text-primary',
    past_due: 'bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]',
    suspended: 'bg-destructive/5 text-destructive',
    cancelled: 'bg-muted text-foreground',
    expired: 'bg-destructive/5 text-destructive',
  };

  return (
    <div className="min-h-screen bg-muted py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-foreground mb-8">
          Billing & Subscription
        </h1>

        {error && (
          <div className="mb-6 bg-destructive/5 border border-destructive/20 rounded-lg p-4">
            <p className="text-destructive">{error}</p>
          </div>
        )}

        {/* Current Subscription */}
        <div className="bg-card rounded-xl shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Current Plan
              </h2>
              <p className="text-muted-foreground mt-1">
                {subscription.organization_name}
              </p>
            </div>
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
                statusColors[subscription.status] || 'bg-muted text-foreground'
              }`}
            >
              {subscription.status.replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-muted-foreground">Plan</p>
              <p className="text-lg font-semibold text-foreground">
                {subscription.plan.name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Billing Cycle</p>
              <p className="text-lg font-semibold text-foreground capitalize">
                {subscription.billing_cycle}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Price</p>
              <p className="text-lg font-semibold text-foreground">
                {formatPrice(
                  subscription.billing_cycle === 'annual'
                    ? subscription.plan.annual_price
                    : subscription.plan.monthly_price
                )}
                /{subscription.billing_cycle === 'annual' ? 'year' : 'month'}
              </p>
            </div>
          </div>

          {/* Trial Info */}
          {subscription.status === 'trial' && subscription.trial_ends_at && (
            <div className="mt-6 p-4 bg-primary/5 rounded-lg">
              <p className="text-primary">
                <strong>Trial Period:</strong> Your trial ends on{' '}
                {formatDate(subscription.trial_ends_at)}.
                <br />
                <span className="text-sm">
                  {subscription.days_remaining} days remaining
                </span>
              </p>
            </div>
          )}

          {/* Active Subscription Info */}
          {subscription.status === 'active' && subscription.current_period_end && (
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-foreground">
                <strong>Next billing date:</strong>{' '}
                {formatDate(subscription.current_period_end)}
              </p>
              {subscription.cancel_at_period_end && (
                <p className="text-[rgb(var(--warning))] mt-2">
                  Your subscription will be cancelled at the end of the billing
                  period.
                </p>
              )}
            </div>
          )}

          {/* Payment Method */}
          {subscription.payment_method_last4 && (
            <div className="mt-6 flex items-center">
              <div className="p-2 bg-muted rounded">
                <svg
                  className="h-6 w-6 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="text-foreground capitalize">
                  {subscription.payment_method_brand} ending in{' '}
                  {subscription.payment_method_last4}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-6 flex flex-wrap gap-4">
            {subscription.status === 'trial' && (
              <button
                onClick={() => router.push('/billing/subscribe')}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
              >
                Upgrade Now
              </button>
            )}

            {subscription.stripe_customer_id && (
              <button
                onClick={handleManagePayment}
                className="px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted"
              >
                Manage Payment Method
              </button>
            )}

            {subscription.status === 'active' &&
              !subscription.cancel_at_period_end && (
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="px-4 py-2 text-destructive hover:text-destructive"
                >
                  Cancel Subscription
                </button>
              )}
          </div>
        </div>

        {/* Payment History */}
        <div className="bg-card rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">
            Payment History
          </h2>

          {payments.length === 0 ? (
            <p className="text-muted-foreground">No payments yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Date
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Description
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">
                      Invoice
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-border last:border-0"
                    >
                      <td className="py-3 px-2 text-foreground">
                        {formatDate(payment.paid_at || payment.created_at)}
                      </td>
                      <td className="py-3 px-2 text-muted-foreground">
                        {payment.description}
                      </td>
                      <td className="py-3 px-2 text-foreground">
                        {formatPrice(payment.amount)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                            payment.status === 'succeeded'
                              ? 'bg-primary/10 text-primary'
                              : payment.status === 'failed'
                                ? 'bg-destructive/5 text-destructive'
                                : 'bg-muted text-foreground'
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        {payment.invoice_url && (
                          <a
                            href={payment.invoice_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:text-primary/80"
                          >
                            View
                          </a>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Back to Dashboard */}
        <div className="mt-6 text-center">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            &larr; Back to Dashboard
          </button>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl p-6 max-w-md mx-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Cancel Subscription?
            </h3>
            <p className="text-muted-foreground mb-6">
              Your subscription will remain active until the end of your current
              billing period. You can resubscribe at any time.
            </p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted"
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-destructive text-white rounded-lg hover:bg-destructive/90 disabled:opacity-50"
              >
                {cancelling ? 'Cancelling...' : 'Cancel Subscription'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
