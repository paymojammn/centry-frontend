'use client';

import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';

export default function TermsOfServicePage() {
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
            Terms of Service
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Last updated: March 8, 2026
          </p>

          <div className="prose prose-gray max-w-none">
            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                1. Acceptance of Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Centry (&quot;the Platform&quot;), operated by Centry Technologies Ltd,
                you agree to be bound by these Terms of Service. If you do not agree to these terms,
                you may not use the Platform. These terms apply to all users, including organizations,
                administrators, and individual users.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Centry is a financial operations platform that provides:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Payment processing and management</li>
                <li>Multi-level payment approval workflows</li>
                <li>Banking integrations and file generation</li>
                <li>Expense tracking and reporting</li>
                <li>ERP and accounting system integrations</li>
                <li>Currency conversion services</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                3. Account Registration
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To use Centry, you must create an account and provide accurate, complete information.
                You are responsible for:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Maintaining the confidentiality of your account credentials</li>
                <li>All activities that occur under your account</li>
                <li>Notifying us immediately of any unauthorized use of your account</li>
                <li>Ensuring that your account information remains current and accurate</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                4. Payment Processing
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Centry facilitates payment processing through third-party payment providers. By using
                our payment services, you acknowledge that:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Payment processing is subject to the terms of the respective payment providers</li>
                <li>Centry is not a bank or financial institution</li>
                <li>You are responsible for ensuring sufficient funds for scheduled payments</li>
                <li>Payment approvals within your organization are your responsibility to configure correctly</li>
                <li>Exchange rates are indicative and may vary at the time of transaction settlement</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                5. Acceptable Use
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                You agree not to use the Platform to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Violate any applicable laws or regulations</li>
                <li>Process payments for illegal goods or services</li>
                <li>Engage in money laundering or terrorist financing</li>
                <li>Circumvent payment approval workflows or security measures</li>
                <li>Attempt to gain unauthorized access to other accounts or systems</li>
                <li>Transmit viruses, malware, or other harmful code</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                6. Data and Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures to protect your data, including
                encryption of sensitive information, secure SFTP connections for banking integrations,
                and two-factor authentication. However, no system is completely secure, and you
                acknowledge that you use the Platform at your own risk. You are responsible for
                maintaining the security of your own systems and credentials.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                7. Subscription and Fees
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Centry offers subscription-based pricing. By subscribing, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Pay all applicable fees for your chosen plan</li>
                <li>Automatic renewal unless you cancel before the renewal date</li>
                <li>Fee changes with 30 days prior notice</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                See our{' '}
                <Link href="/cancellation-policy" className="text-[rgb(var(--brand-dark))] hover:underline">
                  Cancellation Policy
                </Link>{' '}
                and{' '}
                <Link href="/refund-policy" className="text-[rgb(var(--brand-dark))] hover:underline">
                  Refund Policy
                </Link>{' '}
                for more details.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                8. Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Platform, including its design, features, and content, is owned by Centry
                Technologies Ltd and protected by intellectual property laws. You retain ownership
                of your data uploaded to the Platform. You grant us a limited license to process
                your data solely for the purpose of providing the services.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                9. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                To the maximum extent permitted by law, Centry shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages, including loss of profits,
                data, or business opportunities, arising from your use of the Platform. Our total
                liability shall not exceed the fees paid by you in the twelve months preceding the claim.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                10. Termination
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may suspend or terminate your access to the Platform at any time for violation of
                these terms, fraudulent activity, or non-payment. Upon termination, your right to use
                the Platform ceases immediately. You may export your data within 30 days of termination.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-lg font-semibold text-foreground mb-3">
                11. Changes to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update these Terms of Service from time to time. We will notify you of material
                changes via email or through the Platform. Continued use of the Platform after changes
                constitutes acceptance of the updated terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-foreground mb-3">
                12. Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms of Service, please contact us at{' '}
                <a href="mailto:support@getcentry.app" className="text-[rgb(var(--brand-dark))] hover:underline">
                  support@getcentry.app
                </a>
              </p>
            </section>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/privacy-policy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
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
