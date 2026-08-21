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
    id: 'subscription-cancellation',
    title: 'Subscription Cancellation',
    content: (
      <>
        <p>
          You may cancel your {BRAND.name} subscription at any time. We believe in flexibility and
          do not lock you into long-term contracts. Subscriptions are per organization, so
          cancelling one organization&apos;s subscription does not affect any other organization on
          your account. Here&apos;s what you need to know:
        </p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Monthly Subscriptions:</strong> Cancel anytime before your next billing
            date. Your access continues until the end of your current billing period.
          </li>
          <li>
            <strong className="text-foreground">Annual Subscriptions:</strong> Cancel anytime. You will retain access
            until the end of your annual term. No prorated refunds are provided for early
            cancellation of annual plans.
          </li>
          <li>
            <strong className="text-foreground">Who can cancel:</strong> Only an owner or administrator of the
            organization may cancel its subscription, and we may rely on a cancellation request made
            through such an account as authorized by the organization.
          </li>
          <li>
            <strong className="text-foreground">Accrued fees:</strong> Cancellation does not waive fees already accrued
            or due, which remain payable.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-to-cancel',
    title: 'How to Cancel',
    content: (
      <>
        <p>You can cancel your subscription through any of the following methods:</p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Dashboard:</strong> Navigate to Settings → Billing → Cancel Subscription
          </li>
          <li>
            <strong className="text-foreground">Email:</strong> Send a cancellation request from an owner or
            administrator email address to{' '}
            <a
              href={`mailto:${BRAND.email.support}`}
              className="font-medium text-primary hover:underline"
            >
              {BRAND.email.support}
            </a>
          </li>
          <li>
            <strong className="text-foreground">Support:</strong> Contact our customer support team for assistance
          </li>
        </ul>
        <p>
          Cancellation is effective when confirmed by us, and in any case takes effect at the end of
          the current billing period unless we agree otherwise in writing.
        </p>
      </>
    ),
  },
  {
    id: 'after-cancellation',
    title: 'What Happens After Cancellation',
    content: (
      <>
        <p>Once your subscription is cancelled:</p>
        <ul className={legalBullets}>
          <li>You will continue to have access until the end of your current billing period</li>
          <li>No further subscription charges will be made to your payment method</li>
          <li>Your account data will be retained for 30 days after cancellation</li>
          <li>You can export your data at any time before or during this period</li>
          <li>
            After 30 days, your data will be deleted or irreversibly anonymized unless you
            reactivate — except records we are required to retain for longer under applicable law,
            such as financial-transaction and anti-money-laundering record-keeping obligations,
            which we retain for the legally required period and then delete
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'pending-payments',
    title: 'Pending Payments',
    content: (
      <>
        <p>
          If you have pending payments scheduled through {BRAND.name} at the time of cancellation:
        </p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Scheduled Payments:</strong> Any payments scheduled before your
            cancellation effective date will still be processed. You are responsible for cancelling
            individual payments you no longer want before they are processed.
          </li>
          <li>
            <strong className="text-foreground">Recurring Payments:</strong> Recurring payment schedules will be
            automatically paused when your subscription ends.
          </li>
          <li>
            <strong className="text-foreground">In-Progress Payments:</strong> Payments already submitted to a bank or
            payment provider cannot be cancelled through {BRAND.name}. Any recall or reversal is
            subject to that provider&apos;s rules, and we are not responsible for whether it
            succeeds.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'reactivation',
    title: 'Reactivation',
    content: (
      <>
        <p>You can reactivate your organization at any time:</p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Within 30 Days:</strong> Your data and settings will be restored upon
            reactivation and payment of the applicable subscription fee.
          </li>
          <li>
            <strong className="text-foreground">After 30 Days:</strong> Deleted data cannot be restored, and you may
            need to set up the organization again.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'termination-by-us',
    title: 'Account Termination by Us',
    content: (
      <>
        <p>
          {BRAND.name} reserves the right to suspend or terminate accounts or organizations in the
          following cases:
        </p>
        <ul className={legalBullets}>
          <li>Violation of our Terms of Service</li>
          <li>Fraudulent, unlawful, or suspicious activity</li>
          <li>
            Requirements of law, regulators, sanctions, or our banking and payment partners —
            including while an investigation or inquiry is pending
          </li>
          <li>Non-payment after failed attempts and notification</li>
          <li>Risk to the security or integrity of the Platform or other users</li>
        </ul>
        <p>
          Where we reasonably consider it necessary — for example in cases of suspected financial
          crime or a legal prohibition on notice — suspension or termination may be immediate and
          without prior notice. In cases of termination due to policy violations or unlawful
          activity, no refunds will be provided, and accrued fees remain payable.
        </p>
      </>
    ),
  },
  {
    id: 'data-export',
    title: 'Data Export',
    content: (
      <>
        <p>Before cancelling, we recommend exporting your data. You can export:</p>
        <ul className={legalBullets}>
          <li>Transaction history (CSV, PDF)</li>
          <li>Vendor and contact information</li>
          <li>Payment records and receipts</li>
          <li>Financial reports and statements</li>
        </ul>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about cancellation or need assistance, please contact us at{' '}
        <a
          href={`mailto:${BRAND.email.support}`}
          className="font-medium text-primary hover:underline"
        >
          {BRAND.email.support}
        </a>
        . See also our{' '}
        <Link href="/refund-policy" className="font-medium text-primary hover:underline">
          Refund Policy
        </Link>{' '}
        and{' '}
        <Link href="/terms-of-service" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>
        .
      </p>
    ),
  },
];

export default function CancellationPolicyPage() {
  return (
    <LegalLayout
      title="Cancellation Policy"
      lastUpdated="August 21, 2026"
      sections={sections}
      footerLinks={[
        { href: '/terms-of-service', label: 'Terms of Service' },
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/refund-policy', label: 'Refund Policy' },
      ]}
    />
  );
}
