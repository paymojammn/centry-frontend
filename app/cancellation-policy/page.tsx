'use client';

import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <RiArrowLeftLine className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-lg border border-gray-200 p-8 md:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1c252c] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-semibold text-gray-900">Centry</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-gray-900 mb-2">
            Cancellation Policy
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: February 7, 2026
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                1. Subscription Cancellation
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You may cancel your Centry subscription at any time. We believe in flexibility
                and do not lock you into long-term contracts. Here's what you need to know:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>Monthly Subscriptions:</strong> Cancel anytime before your next billing
                  date. Your access continues until the end of your current billing period.
                </li>
                <li>
                  <strong>Annual Subscriptions:</strong> Cancel anytime. You will retain access
                  until the end of your annual term. No prorated refunds are provided for early
                  cancellation of annual plans.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                2. How to Cancel
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You can cancel your subscription through any of the following methods:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>Dashboard:</strong> Navigate to Settings → Billing → Cancel Subscription
                </li>
                <li>
                  <strong>Email:</strong> Send a cancellation request to{' '}
                  <a href="mailto:support@getcentry.app" className="text-[#1c252c] hover:underline">
                    support@getcentry.app
                  </a>
                </li>
                <li>
                  <strong>Support:</strong> Contact our customer support team for assistance
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                3. What Happens After Cancellation
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Once your subscription is cancelled:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>You will continue to have access until the end of your current billing period</li>
                <li>No further charges will be made to your payment method</li>
                <li>Your account data will be retained for 30 days after cancellation</li>
                <li>You can export your data at any time before or during this period</li>
                <li>After 30 days, your data will be permanently deleted unless you reactivate</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                4. Pending Payments
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                If you have pending payments scheduled through Centry at the time of cancellation:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>Scheduled Payments:</strong> Any payments scheduled before your cancellation
                  effective date will still be processed. You can cancel individual payments before
                  processing.
                </li>
                <li>
                  <strong>Recurring Payments:</strong> Recurring payment schedules will be automatically
                  paused when your subscription ends.
                </li>
                <li>
                  <strong>In-Progress Payments:</strong> Payments already in progress cannot be
                  cancelled through Centry. Contact your bank for payment reversals.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                5. Reactivation
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                You can reactivate your account at any time:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>Within 30 Days:</strong> All your data and settings will be restored
                  immediately upon reactivation.
                </li>
                <li>
                  <strong>After 30 Days:</strong> You will need to set up a new account as
                  previous data will have been permanently deleted.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                6. Account Termination by Centry
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Centry reserves the right to suspend or terminate accounts in the following cases:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Violation of our Terms of Service</li>
                <li>Fraudulent or suspicious activity</li>
                <li>Non-payment after multiple failed attempts and notifications</li>
                <li>Use of the platform for illegal purposes</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                In cases of termination due to policy violations, no refunds will be provided.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                7. Data Export
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Before cancelling, we recommend exporting your data. You can export:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4 mt-4">
                <li>Transaction history (CSV, PDF)</li>
                <li>Vendor and contact information</li>
                <li>Payment records and receipts</li>
                <li>Financial reports and statements</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                8. Contact Us
              </h2>
              <p className="text-gray-600 leading-relaxed">
                If you have questions about cancellation or need assistance, please contact us at{' '}
                <a href="mailto:support@getcentry.app" className="text-[#1c252c] hover:underline">
                  support@getcentry.app
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} Centry. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
