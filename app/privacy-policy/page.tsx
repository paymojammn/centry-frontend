'use client';

import {
  LegalLayout,
  legalBullets,
  type LegalSection,
} from '@/components/legal/legal-layout';

const sections: LegalSection[] = [
  {
    id: 'information-we-collect',
    title: 'Information We Collect',
    content: (
      <>
        <p>
          We collect information that you provide directly to us and information generated
          through your use of the Platform:
        </p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Account Information:</strong> Name, email address, phone number,
            organization details, and role within your organization.
          </li>
          <li>
            <strong className="text-foreground">Financial Data:</strong> Payment details, bank account information,
            transaction records, and vendor/supplier information that you enter into the Platform.
          </li>
          <li>
            <strong className="text-foreground">Usage Data:</strong> Log data, device information, IP addresses,
            and how you interact with the Platform.
          </li>
          <li>
            <strong className="text-foreground">Communication Data:</strong> Messages sent through the Platform,
            support requests, and feedback.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'How We Use Your Information',
    content: (
      <>
        <p>We use the information we collect to:</p>
        <ul className={legalBullets}>
          <li>Provide, maintain, and improve the Platform</li>
          <li>Process payments and financial transactions on your behalf</li>
          <li>Send transactional notifications (payment approvals, confirmations, alerts)</li>
          <li>Provide customer support</li>
          <li>Detect and prevent fraud, abuse, and security incidents</li>
          <li>Comply with legal and regulatory obligations</li>
          <li>Generate anonymized, aggregated analytics to improve our services</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-security',
    title: 'Data Security',
    content: (
      <>
        <p>We take the security of your data seriously and implement multiple layers of protection:</p>
        <ul className={legalBullets}>
          <li>Encryption of sensitive data at rest and in transit</li>
          <li>Two-factor authentication (2FA) for account access</li>
          <li>Secure SFTP connections for banking file transfers</li>
          <li>Regular security audits and vulnerability assessments</li>
          <li>Role-based access controls within organizations</li>
          <li>Encrypted storage of credentials and API keys</li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-sharing',
    title: 'Data Sharing',
    content: (
      <>
        <p>We do not sell your personal data. We may share your information with:</p>
        <ul className={legalBullets}>
          <li>
            <strong className="text-foreground">Payment Providers:</strong> To process payments you initiate
            (e.g., Paystack, bank SFTP integrations).
          </li>
          <li>
            <strong className="text-foreground">ERP/Accounting Integrations:</strong> When you connect third-party
            services like Xero, we share the data necessary for synchronization.
          </li>
          <li>
            <strong className="text-foreground">Service Providers:</strong> Third-party services that help us
            operate the Platform (hosting, email delivery, SMS providers).
          </li>
          <li>
            <strong className="text-foreground">Legal Requirements:</strong> When required by law, regulation,
            or legal process.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: 'data-retention',
    title: 'Data Retention',
    content: (
      <p>
        We retain your data for as long as your account is active or as needed to provide
        services. Financial transaction records are retained for a minimum of 7 years to
        comply with regulatory requirements. After account cancellation, your data is
        retained for 30 days before permanent deletion, during which time you can export
        your data or reactivate your account.
      </p>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your Rights',
    content: (
      <>
        <p>You have the right to:</p>
        <ul className={legalBullets}>
          <li>Access the personal data we hold about you</li>
          <li>Request correction of inaccurate data</li>
          <li>Request deletion of your data (subject to legal retention requirements)</li>
          <li>Export your data in a portable format</li>
          <li>Withdraw consent for optional data processing</li>
          <li>Object to processing of your data for specific purposes</li>
        </ul>
        <p>
          To exercise any of these rights, contact us at{' '}
          <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
            support@paymoja.com
          </a>
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and Tracking',
    content: (
      <p>
        We use essential cookies to maintain your session and preferences. We do not use
        third-party advertising cookies. Analytics cookies are used only in anonymized,
        aggregated form to help us understand how the Platform is used and improve the
        user experience.
      </p>
    ),
  },
  {
    id: 'international-transfers',
    title: 'International Data Transfers',
    content: (
      <p>
        Your data may be processed in countries other than your own. We ensure that
        appropriate safeguards are in place for any international data transfers,
        including standard contractual clauses and data processing agreements with
        our service providers.
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to This Policy',
    content: (
      <p>
        We may update this Privacy Policy from time to time. We will notify you of
        material changes via email or through the Platform. Your continued use of the
        Platform after changes constitutes acceptance of the updated policy.
      </p>
    ),
  },
  {
    id: 'contact',
    title: 'Contact Us',
    content: (
      <p>
        If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
        <a href="mailto:support@paymoja.com" className="font-medium text-primary hover:underline">
          support@paymoja.com
        </a>
      </p>
    ),
  },
];

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      lastUpdated="March 8, 2026"
      sections={sections}
      footerLinks={[
        { href: '/terms-of-service', label: 'Terms of Service' },
        { href: '/cancellation-policy', label: 'Cancellation Policy' },
        { href: '/refund-policy', label: 'Refund Policy' },
      ]}
    />
  );
}
