'use client';

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
          You may cancel your Centry subscription at any time. We believe in flexibility
          and do not lock you into long-term contracts. Here&apos;s what you need to know:
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
            <strong className="text-foreground">Email:</strong> Send a cancellation request to{' '}
            <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
              support@paymoja.com
            </a>
          </li>
          <li>
            <strong className="text-foreground">Support:</strong> Contact our customer support team for assistance
          </li>
        </ul>
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
          <li>No further charges will be made to your payment method</li>
          <li>Your account data will be retained for 30 days after cancellation</li>
          <li>You can export your data at any time before or during this period</li>
          <li>After 30 days, your data will be permanently deleted unless you reactivate</li>
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
          If you have pending payments scheduled through Centry at the time of cancellation:
        </p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Scheduled Payments:</strong> Any payments scheduled before your cancellation
            effective date will still be processed. You can cancel individual payments before
            processing.
          </li>
          <li>
            <strong className="text-foreground">Recurring Payments:</strong> Recurring payment schedules will be automatically
            paused when your subscription ends.
          </li>
          <li>
            <strong className="text-foreground">In-Progress Payments:</strong> Payments already in progress cannot be
            cancelled through Centry. Contact your bank for payment reversals.
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
        <p>You can reactivate your account at any time:</p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Within 30 Days:</strong> All your data and settings will be restored
            immediately upon reactivation.
          </li>
          <li>
            <strong className="text-foreground">After 30 Days:</strong> You will need to set up a new account as
            previous data will have been permanently deleted.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'termination-by-centry',
    title: 'Account Termination by Centry',
    content: (
      <>
        <p>Centry reserves the right to suspend or terminate accounts in the following cases:</p>
        <ul className={legalBullets}>
          <li>Violation of our Terms of Service</li>
          <li>Fraudulent or suspicious activity</li>
          <li>Non-payment after multiple failed attempts and notifications</li>
          <li>Use of the platform for illegal purposes</li>
        </ul>
        <p>In cases of termination due to policy violations, no refunds will be provided.</p>
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
        <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
          support@paymoja.com
        </a>
      </p>
    ),
  },
];

export default function CancellationPolicyPage() {
  return (
    <LegalLayout
      title="Cancellation Policy"
      lastUpdated="February 7, 2026"
      sections={sections}
      footerLinks={[
        { href: '/terms-of-service', label: 'Terms of Service' },
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/refund-policy', label: 'Refund Policy' },
      ]}
    />
  );
}
