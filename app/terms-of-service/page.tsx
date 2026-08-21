'use client';

import Link from 'next/link';
import {
  LegalLayout,
  legalBullets,
  type LegalSection,
} from '@/components/legal/legal-layout';

const sections: LegalSection[] = [
  {
    id: 'acceptance',
    title: 'Acceptance of Terms',
    content: (
      <p>
        By accessing or using Centry (&quot;the Platform&quot;), operated by Centry Technologies Ltd,
        you agree to be bound by these Terms of Service. If you do not agree to these terms,
        you may not use the Platform. These terms apply to all users, including organizations,
        administrators, and individual users.
      </p>
    ),
  },
  {
    id: 'description',
    title: 'Description of Service',
    content: (
      <>
        <p>Centry is a financial operations platform that provides:</p>
        <ul className={legalBullets}>
          <li>Payment processing and management</li>
          <li>Multi-level payment approval workflows</li>
          <li>Banking integrations and file generation</li>
          <li>Expense tracking and reporting</li>
          <li>ERP and accounting system integrations</li>
          <li>Currency conversion services</li>
        </ul>
      </>
    ),
  },
  {
    id: 'registration',
    title: 'Account Registration',
    content: (
      <>
        <p>
          To use Centry, you must create an account and provide accurate, complete information.
          You are responsible for:
        </p>
        <ul className={legalBullets}>
          <li>Maintaining the confidentiality of your account credentials</li>
          <li>All activities that occur under your account</li>
          <li>Notifying us immediately of any unauthorized use of your account</li>
          <li>Ensuring that your account information remains current and accurate</li>
        </ul>
      </>
    ),
  },
  {
    id: 'payments',
    title: 'Payment Processing',
    content: (
      <>
        <p>
          Centry facilitates payment processing through third-party payment providers. By using
          our payment services, you acknowledge that:
        </p>
        <ul className={legalBullets}>
          <li>Payment processing is subject to the terms of the respective payment providers</li>
          <li>Centry is not a bank or financial institution</li>
          <li>You are responsible for ensuring sufficient funds for scheduled payments</li>
          <li>Payment approvals within your organization are your responsibility to configure correctly</li>
          <li>Exchange rates are indicative and may vary at the time of transaction settlement</li>
        </ul>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Acceptable Use',
    content: (
      <>
        <p>You agree not to use the Platform to:</p>
        <ul className={legalBullets}>
          <li>Violate any applicable laws or regulations</li>
          <li>Process payments for illegal goods or services</li>
          <li>Engage in money laundering or terrorist financing</li>
          <li>Circumvent payment approval workflows or security measures</li>
          <li>Attempt to gain unauthorized access to other accounts or systems</li>
          <li>Transmit viruses, malware, or other harmful code</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-security',
    title: 'Data and Security',
    content: (
      <p>
        We implement industry-standard security measures to protect your data, including
        encryption of sensitive information, secure SFTP connections for banking integrations,
        and two-factor authentication. However, no system is completely secure, and you
        acknowledge that you use the Platform at your own risk. You are responsible for
        maintaining the security of your own systems and credentials.
      </p>
    ),
  },
  {
    id: 'fees',
    title: 'Subscription and Fees',
    content: (
      <>
        <p>Centry offers subscription-based pricing. By subscribing, you agree to:</p>
        <ul className={legalBullets}>
          <li>Pay all applicable fees for your chosen plan</li>
          <li>Automatic renewal unless you cancel before the renewal date</li>
          <li>Fee changes with 30 days prior notice</li>
        </ul>
        <p>
          See our{' '}
          <Link href="/cancellation-policy" className="font-medium text-primary hover:underline">
            Cancellation Policy
          </Link>{' '}
          and{' '}
          <Link href="/refund-policy" className="font-medium text-primary hover:underline">
            Refund Policy
          </Link>{' '}
          for more details.
        </p>
      </>
    ),
  },
  {
    id: 'intellectual-property',
    title: 'Intellectual Property',
    content: (
      <p>
        The Platform, including its design, features, and content, is owned by Centry
        Technologies Ltd and protected by intellectual property laws. You retain ownership
        of your data uploaded to the Platform. You grant us a limited license to process
        your data solely for the purpose of providing the services.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Limitation of Liability',
    content: (
      <p>
        To the maximum extent permitted by law, Centry shall not be liable for any indirect,
        incidental, special, consequential, or punitive damages, including loss of profits,
        data, or business opportunities, arising from your use of the Platform. Our total
        liability shall not exceed the fees paid by you in the twelve months preceding the claim.
      </p>
    ),
  },
  {
    id: 'termination',
    title: 'Termination',
    content: (
      <p>
        We may suspend or terminate your access to the Platform at any time for violation of
        these terms, fraudulent activity, or non-payment. Upon termination, your right to use
        the Platform ceases immediately. You may export your data within 30 days of termination.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to Terms',
    content: (
      <p>
        We may update these Terms of Service from time to time. We will notify you of material
        changes via email or through the Platform. Continued use of the Platform after changes
        constitutes acceptance of the updated terms.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about these Terms of Service, please contact us at{' '}
        <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
          support@paymoja.com
        </a>
      </p>
    ),
  },
];

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      lastUpdated="March 8, 2026"
      sections={sections}
      footerLinks={[
        { href: '/privacy-policy', label: 'Privacy Policy' },
        { href: '/cancellation-policy', label: 'Cancellation Policy' },
        { href: '/refund-policy', label: 'Refund Policy' },
      ]}
    />
  );
}
