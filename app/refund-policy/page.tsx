'use client';

import {
  LegalLayout,
  legalBullets,
  type LegalSection,
} from '@/components/legal/legal-layout';

const sections: LegalSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    content: (
      <p>
        At Centry, we are committed to ensuring your satisfaction with our services.
        This Refund Policy outlines the terms and conditions under which refunds may be
        issued for our subscription-based payment automation platform.
      </p>
    ),
  },
  {
    id: 'subscription-refunds',
    title: 'Subscription Refunds',
    content: (
      <>
        <p>We offer refunds under the following circumstances:</p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">14-Day Money-Back Guarantee:</strong> New subscribers may request a full
            refund within 14 days of their initial subscription if they are not satisfied
            with our services.
          </li>
          <li>
            <strong className="text-foreground">Service Unavailability:</strong> If our platform experiences significant
            downtime (exceeding 24 consecutive hours) that materially affects your business
            operations, you may be eligible for a prorated refund.
          </li>
          <li>
            <strong className="text-foreground">Billing Errors:</strong> If you were charged incorrectly due to a
            technical error on our part, we will issue a full refund for the erroneous charge.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'transaction-fees',
    title: 'Transaction Fees',
    content: (
      <>
        <p>
          Transaction processing fees are non-refundable once a payment has been successfully
          processed through our platform. This includes fees for:
        </p>
        <ul className={legalBullets}>
          <li>Bank transfers and wire payments</li>
          <li>Mobile money transactions</li>
          <li>Foreign exchange conversions</li>
          <li>Payment processing charges</li>
        </ul>
        <p>
          If a payment fails due to an error on our platform, any associated fees will be
          refunded or credited to your account.
        </p>
      </>
    ),
  },
  {
    id: 'how-to-request',
    title: 'How to Request a Refund',
    content: (
      <>
        <p>To request a refund, please contact our support team:</p>
        <ul className={legalBullets}>
          <li>
            Email:{' '}
            <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
              support@paymoja.com
            </a>
          </li>
          <li>Include your account email, transaction details, and reason for the refund request</li>
        </ul>
        <p>
          Refund requests are typically processed within 5–10 business days. Approved refunds
          will be credited to your original payment method.
        </p>
      </>
    ),
  },
  {
    id: 'non-refundable',
    title: 'Non-Refundable Items',
    content: (
      <>
        <p>The following are not eligible for refunds:</p>
        <ul className={legalBullets}>
          <li>Subscription fees after the 14-day guarantee period</li>
          <li>Successfully processed transaction fees</li>
          <li>Setup or onboarding fees (if applicable)</li>
          <li>Charges for add-on services already rendered</li>
        </ul>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>
        We reserve the right to modify this refund policy at any time. Changes will be
        effective immediately upon posting to our website. We encourage you to review
        this policy periodically.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have any questions about our refund policy, please contact us at{' '}
        <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
          support@paymoja.com
        </a>
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      lastUpdated="February 7, 2026"
      sections={sections}
      footerLinks={[
        { href: '/terms-of-service', label: 'Terms of Service' },
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/cancellation-policy', label: 'Cancellation Policy' },
      ]}
    />
  );
}
