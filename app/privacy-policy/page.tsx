'use client';

import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <RiArrowLeftLine className="w-4 h-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-card rounded-lg border border-border p-8 md:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[rgb(var(--brand-dark))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-semibold text-foreground">Centry</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-foreground mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: March 8, 2026
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                1. Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We collect information that you provide directly to us and information generated
                through your use of the Platform:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Account Information:</strong> Name, email address, phone number,
                  organization details, and role within your organization.
                </li>
                <li>
                  <strong>Financial Data:</strong> Payment details, bank account information,
                  transaction records, and vendor/supplier information that you enter into the Platform.
                </li>
                <li>
                  <strong>Usage Data:</strong> Log data, device information, IP addresses,
                  and how you interact with the Platform.
                </li>
                <li>
                  <strong>Communication Data:</strong> Messages sent through the Platform,
                  support requests, and feedback.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide, maintain, and improve the Platform</li>
                <li>Process payments and financial transactions on your behalf</li>
                <li>Send transactional notifications (payment approvals, confirmations, alerts)</li>
                <li>Provide customer support</li>
                <li>Detect and prevent fraud, abuse, and security incidents</li>
                <li>Comply with legal and regulatory obligations</li>
                <li>Generate anonymized, aggregated analytics to improve our services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We take the security of your data seriously and implement multiple layers of protection:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Encryption of sensitive data at rest and in transit</li>
                <li>Two-factor authentication (2FA) for account access</li>
                <li>Secure SFTP connections for banking file transfers</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Role-based access controls within organizations</li>
                <li>Encrypted storage of credentials and API keys</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Data Sharing
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We do not sell your personal data. We may share your information with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>
                  <strong>Payment Providers:</strong> To process payments you initiate
                  (e.g., Paystack, bank SFTP integrations).
                </li>
                <li>
                  <strong>ERP/Accounting Integrations:</strong> When you connect third-party
                  services like Xero, we share the data necessary for synchronization.
                </li>
                <li>
                  <strong>Service Providers:</strong> Third-party services that help us
                  operate the Platform (hosting, email delivery, SMS providers).
                </li>
                <li>
                  <strong>Legal Requirements:</strong> When required by law, regulation,
                  or legal process.
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Data Retention
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your data for as long as your account is active or as needed to provide
                services. Financial transaction records are retained for a minimum of 7 years to
                comply with regulatory requirements. After account cancellation, your data is
                retained for 30 days before permanent deletion, during which time you can export
                your data or reactivate your account.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Access the personal data we hold about you</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data (subject to legal retention requirements)</li>
                <li>Export your data in a portable format</li>
                <li>Withdraw consent for optional data processing</li>
                <li>Object to processing of your data for specific purposes</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise any of these rights, contact us at{' '}
                <a href="mailto:privacy@getcentry.app" className="text-[rgb(var(--brand-dark))] hover:underline">
                  privacy@getcentry.app
                </a>
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Cookies and Tracking
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences. We do not use
                third-party advertising cookies. Analytics cookies are used only in anonymized,
                aggregated form to help us understand how the Platform is used and improve the
                user experience.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                8. International Data Transfers
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Your data may be processed in countries other than your own. We ensure that
                appropriate safeguards are in place for any international data transfers,
                including standard contractual clauses and data processing agreements with
                our service providers.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                9. Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of
                material changes via email or through the Platform. Your continued use of the
                Platform after changes constitutes acceptance of the updated policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                10. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact us at{' '}
                <a href="mailto:privacy@getcentry.app" className="text-[rgb(var(--brand-dark))] hover:underline">
                  privacy@getcentry.app
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-foreground hover:underline">Terms of Service</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link href="/cancellation-policy" className="hover:text-foreground hover:underline">Cancellation Policy</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link href="/refund-policy" className="hover:text-foreground hover:underline">Refund Policy</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Centry. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
