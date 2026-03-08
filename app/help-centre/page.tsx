'use client';

import Link from 'next/link';
import { RiArrowLeftLine, RiMailLine, RiQuestionLine, RiBookOpenLine, RiShieldLine } from '@remixicon/react';

export default function HelpCentrePage() {
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
            Help Centre
          </h1>
          <p className="text-sm text-muted-foreground mb-8">
            Find answers, get support, and learn how to make the most of Centry.
          </p>

          <div className="space-y-6">
            {/* Getting Started */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[rgb(var(--brand-dark))]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RiBookOpenLine className="w-5 h-5 text-[rgb(var(--brand-dark))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Getting Started</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    New to Centry? Here&apos;s how to get set up:
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Create your organization and invite team members</li>
                    <li>Configure departments and approval workflows</li>
                    <li>Set up payment approval thresholds</li>
                    <li>Connect your bank accounts and ERP systems</li>
                    <li>Add vendors and start processing payments</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* FAQs */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[rgb(var(--brand-dark))]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RiQuestionLine className="w-5 h-5 text-[rgb(var(--brand-dark))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Frequently Asked Questions</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-foreground">How do payment approvals work?</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Centry supports multi-level payment approvals. Organization admins can configure
                        approval thresholds so that payments above certain amounts require additional sign-off
                        from designated approvers.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Which banks are supported?</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Centry supports bank integrations via SFTP and ISO 20022 payment file formats.
                        Currently supported banks include Stanbic (Uganda and South Africa) and Absa,
                        with more being added regularly.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Can I connect my accounting software?</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Yes. Centry integrates with Xero for automatic synchronization of invoices, bills,
                        contacts, and payments. More ERP integrations are coming soon.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">How are exchange rates determined?</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Centry uses real-time exchange rates from trusted providers. Rates are cached
                        for up to 1 hour and refreshed automatically. The rate shown at the time of
                        payment initiation is the rate applied.
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-foreground">Is my data secure?</h3>
                      <p className="text-muted-foreground text-sm mt-1">
                        Absolutely. We use encryption for sensitive data, two-factor authentication,
                        secure SFTP for banking integrations, and role-based access controls. See our{' '}
                        <Link href="/privacy-policy" className="text-[rgb(var(--brand-dark))] hover:underline">
                          Privacy Policy
                        </Link>{' '}
                        for more details.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Account & Security */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[rgb(var(--brand-dark))]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RiShieldLine className="w-5 h-5 text-[rgb(var(--brand-dark))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Account & Security</h2>
                  <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                    <li>Enable two-factor authentication in Settings for added security</li>
                    <li>Use strong, unique passwords for your Centry account</li>
                    <li>Review user roles and permissions regularly</li>
                    <li>Check the audit log for recent account activity</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Support */}
            <div className="border border-border rounded-lg p-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[rgb(var(--brand-dark))]/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <RiMailLine className="w-5 h-5 text-[rgb(var(--brand-dark))]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground mb-2">Contact Support</h2>
                  <p className="text-muted-foreground leading-relaxed mb-3">
                    Can&apos;t find what you&apos;re looking for? Our support team is here to help.
                  </p>
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Email:{' '}
                      <a href="mailto:support@getcentry.app" className="text-[rgb(var(--brand-dark))] hover:underline">
                        support@getcentry.app
                      </a>
                    </p>
                    <p className="text-muted-foreground text-sm">
                      We typically respond within 24 hours on business days.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 space-y-3">
          <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
            <Link href="/terms-of-service" className="hover:text-foreground hover:underline">Terms of Service</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link href="/privacy-policy" className="hover:text-foreground hover:underline">Privacy Policy</Link>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <Link href="/pricing" className="hover:text-foreground hover:underline">Pricing</Link>
          </div>
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Centry. All rights reserved.</p>
        </div>
      </main>
    </div>
  );
}
