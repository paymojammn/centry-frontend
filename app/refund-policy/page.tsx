'use client';

import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';

export default function RefundPolicyPage() {
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
            Refund Policy
          </h1>
          <p className="text-sm text-gray-500 mb-8">
            Last updated: February 7, 2026
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                1. Overview
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                At Centry, we are committed to ensuring your satisfaction with our services.
                This Refund Policy outlines the terms and conditions under which refunds may be
                issued for our subscription-based payment automation platform.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                2. Subscription Refunds
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                We offer refunds under the following circumstances:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>
                  <strong>14-Day Money-Back Guarantee:</strong> New subscribers may request a full
                  refund within 14 days of their initial subscription if they are not satisfied
                  with our services.
                </li>
                <li>
                  <strong>Service Unavailability:</strong> If our platform experiences significant
                  downtime (exceeding 24 consecutive hours) that materially affects your business
                  operations, you may be eligible for a prorated refund.
                </li>
                <li>
                  <strong>Billing Errors:</strong> If you were charged incorrectly due to a
                  technical error on our part, we will issue a full refund for the erroneous charge.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                3. Transaction Fees
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                Transaction processing fees are non-refundable once a payment has been successfully
                processed through our platform. This includes fees for:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Bank transfers and wire payments</li>
                <li>Mobile money transactions</li>
                <li>Foreign exchange conversions</li>
                <li>Payment processing charges</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                If a payment fails due to an error on our platform, any associated fees will be
                refunded or credited to your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                4. How to Request a Refund
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                To request a refund, please contact our support team:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Email: <a href="mailto:support@getcentry.app" className="text-[#1c252c] hover:underline">support@getcentry.app</a></li>
                <li>Include your account email, transaction details, and reason for the refund request</li>
              </ul>
              <p className="text-gray-600 leading-relaxed mt-4">
                Refund requests are typically processed within 5-10 business days. Approved refunds
                will be credited to your original payment method.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                5. Non-Refundable Items
              </h2>
              <p className="text-gray-600 leading-relaxed mb-4">
                The following are not eligible for refunds:
              </p>
              <ul className="list-disc list-inside text-gray-600 space-y-2 ml-4">
                <li>Subscription fees after the 14-day guarantee period</li>
                <li>Successfully processed transaction fees</li>
                <li>Setup or onboarding fees (if applicable)</li>
                <li>Charges for add-on services already rendered</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                6. Changes to This Policy
              </h2>
              <p className="text-gray-600 leading-relaxed">
                We reserve the right to modify this refund policy at any time. Changes will be
                effective immediately upon posting to our website. We encourage you to review
                this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                7. Contact Us
              </h2>
              <p className="text-gray-600 leading-relaxed">
                If you have any questions about our refund policy, please contact us at{' '}
                <a href="mailto:support@getcentry.app" className="text-[#1c252c] hover:underline">
                  support@getcentry.app
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-500">
            <Link href="/pricing" className="hover:text-gray-700 hover:underline">Pricing</Link>
            <span className="w-1 h-1 rounded-full bg-gray-300" />
            <Link href="/cancellation-policy" className="hover:text-gray-700 hover:underline">Cancellation Policy</Link>
          </div>
          <p className="text-sm text-gray-500">&copy; {new Date().getFullYear()} Centry. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
