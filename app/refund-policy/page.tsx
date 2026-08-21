'use client';

import Link from 'next/link';
import { BRAND } from '@/config/brand';
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
        At {BRAND.name}, we are committed to ensuring your satisfaction with our services. This
        Refund Policy outlines the terms and conditions under which refunds may be issued for our
        subscription-based payment automation platform. This policy forms part of our{' '}
        <Link href="/terms-of-service" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>
        ; capitalized terms have the meanings given there.
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
            <strong className="text-foreground">14-Day Money-Back Guarantee:</strong> First-time subscribers may request
            a full refund of their first subscription payment within 14 days of the initial
            subscription for an organization. The guarantee applies once per organization and once
            per customer, and does not apply to renewals, reactivations, or accounts terminated for
            violating our terms.
          </li>
          <li>
            <strong className="text-foreground">Service Unavailability:</strong> If the Platform experiences significant
            downtime (exceeding 24 consecutive hours, as measured by our monitoring) that materially
            affects your business operations, you may request a prorated credit or refund for the
            affected period. This is your sole and exclusive remedy for unavailability. Downtime
            caused by scheduled maintenance, third-party providers (banks, mobile-money operators,
            ERP platforms), your own systems or connectivity, or events beyond our reasonable
            control does not qualify.
          </li>
          <li>
            <strong className="text-foreground">Billing Errors:</strong> If you were charged incorrectly due to a
            technical error on our part, we will issue a full refund of the erroneous charge.
            Billing disputes must be raised within 60 days of the charge.
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
          If a payment fails due to an error on our platform, any associated fees charged by us will
          be refunded or credited to your account. Fees are not refundable where a payment was
          executed according to the beneficiary details or approvals supplied through your account,
          or where a failure was caused by a third-party provider, insufficient funds, or incorrect
          information you provided. Third-party provider fees are governed by those providers and
          are outside our control.
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
            <a
              href={`mailto:${BRAND.email.support}`}
              className="font-medium text-primary hover:underline"
            >
              {BRAND.email.support}
            </a>
          </li>
          <li>Include your account email, organization, transaction details, and reason for the refund request</li>
        </ul>
        <p>
          Refund requests are typically processed within 5–10 business days of approval. Approved
          refunds are made to the original payment method where possible, in the currency of the
          original charge; any exchange-rate differences, and any charges imposed by your bank or
          payment provider on receipt, are not borne by us. Refunds may be reduced by taxes we
          cannot recover.
        </p>
      </>
    ),
  },
  {
    id: 'chargebacks',
    title: 'Chargebacks and Disputes',
    content: (
      <p>
        Please contact us before initiating a chargeback or payment dispute — most issues are
        resolved faster through support. If you initiate a chargeback for a charge that complies
        with our terms while a refund request is open or without contacting us, we may suspend the
        affected organization until the dispute is resolved and may recover costs we reasonably
        incur in disputing it. Nothing in this section limits any non-waivable rights you have
        under applicable law or your card scheme.
      </p>
    ),
  },
  {
    id: 'non-refundable',
    title: 'Non-Refundable Items',
    content: (
      <>
        <p>Except where required by applicable law, the following are not eligible for refunds:</p>
        <ul className={legalBullets}>
          <li>Subscription fees after the 14-day guarantee period, including unused time</li>
          <li>Successfully processed transaction fees</li>
          <li>Setup or onboarding fees (if applicable)</li>
          <li>Charges for add-on services already rendered</li>
          <li>
            Any fees where the account or organization was terminated for violating our Terms of
            Service or for unlawful activity
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>
        We may modify this refund policy from time to time. We will notify you of material changes
        via email or through the Platform before they take effect, and changes apply prospectively —
        the policy in force at the time of a charge governs that charge. We encourage you to review
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
        <a
          href={`mailto:${BRAND.email.support}`}
          className="font-medium text-primary hover:underline"
        >
          {BRAND.email.support}
        </a>
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="Refund Policy"
      lastUpdated="August 21, 2026"
      sections={sections}
      footerLinks={[
        { href: '/terms-of-service', label: 'Terms of Service' },
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/cancellation-policy', label: 'Cancellation Policy' },
      ]}
    />
  );
}
