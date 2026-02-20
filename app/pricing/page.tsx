'use client';

import { useState } from 'react';
import Link from 'next/link';
import { RiCheckLine, RiArrowRightLine, RiQuestionLine } from '@remixicon/react';

type BillingCycle = 'monthly' | 'annual';

interface PricingTier {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Starter',
    description: 'For small businesses getting started with payment automation',
    monthlyPrice: 49,
    annualPrice: 490,
    features: [
      'Up to 3 users',
      '1 ERP connection (Xero, QuickBooks)',
      '100 payments per month',
      'Bank account linking',
      'Basic approval workflows',
      'Email support',
      'Standard bank integrations',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/billing/subscribe',
  },
  {
    name: 'Professional',
    description: 'For growing businesses with advanced payment needs',
    monthlyPrice: 149,
    annualPrice: 1490,
    highlighted: true,
    features: [
      'Up to 10 users',
      '3 ERP connections',
      'Unlimited payments',
      'Multi-currency support',
      'Advanced approval workflows',
      'Priority support',
      'All bank integrations',
      'Custom payment schedules',
      'Bulk payment uploads',
      'Detailed analytics & reports',
    ],
    cta: 'Start Free Trial',
    ctaLink: '/billing/subscribe',
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with complex requirements',
    monthlyPrice: 0, // Custom pricing
    annualPrice: 0,
    features: [
      'Unlimited users',
      'Unlimited ERP connections',
      'Unlimited payments',
      'White-label options',
      'Custom approval workflows',
      'Dedicated account manager',
      'SLA guarantees',
      'API access',
      'Custom integrations',
      'On-premise deployment options',
      'Training & onboarding',
    ],
    cta: 'Contact Sales',
    ctaLink: 'mailto:sales@getcentry.app',
  },
];

const transactionFees = [
  {
    type: 'Local Bank Transfers',
    description: 'Same-country bank-to-bank transfers',
    fee: '0.5%',
    min: '$0.50',
    max: '$10',
  },
  {
    type: 'International Transfers',
    description: 'Cross-border wire transfers (SWIFT)',
    fee: '1.0%',
    min: '$5',
    max: '$50',
  },
  {
    type: 'Mobile Money',
    description: 'Mobile money providers',
    fee: '1.5%',
    min: '$0.25',
    max: '$15',
  },
  {
    type: 'FX Conversion',
    description: 'Currency exchange markup',
    fee: '0.5%',
    min: '-',
    max: '-',
  },
];

const faqs = [
  {
    question: 'What payment methods are supported?',
    answer: 'Centry supports bank transfers (EFT, RTGS, ACH), SWIFT international transfers, mobile money, and various local payment rails across Africa and globally.',
  },
  {
    question: 'How does the 14-day free trial work?',
    answer: 'Start using Centry immediately with full access to all features in your chosen plan. No credit card required. If you love it, upgrade before the trial ends. Otherwise, your account will be paused.',
  },
  {
    question: 'Can I switch plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be prorated for the remaining period. When downgrading, changes take effect at the next billing cycle.',
  },
  {
    question: 'What ERP systems do you integrate with?',
    answer: 'We currently support Xero, QuickBooks Online, and Sage. More integrations are coming soon. Enterprise customers can request custom integrations.',
  },
  {
    question: 'How secure is Centry?',
    answer: 'Centry uses bank-grade 256-bit SSL encryption, is SOC 2 compliant, and follows strict data protection standards. All payments are processed through licensed financial institutions.',
  },
  {
    question: 'Do you offer refunds?',
    answer: 'Yes, we offer a 14-day money-back guarantee for new subscribers. Transaction fees for processed payments are non-refundable. See our refund policy for details.',
  },
];

export default function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const formatPrice = (price: number) => {
    if (price === 0) return 'Custom';
    return `$${price}`;
  };

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="bg-[rgb(var(--brand-dark))] text-white">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
                <span className="text-[rgb(var(--brand-dark))] font-bold text-xl">C</span>
              </div>
              <span className="text-xl font-semibold">Centry</span>
            </Link>
            <div className="flex items-center gap-6">
              <Link href="/auth/login" className="text-white/80 hover:text-white transition-colors">
                Sign In
              </Link>
              <Link
                href="/auth/login"
                className="bg-white text-[rgb(var(--brand-dark))] px-4 py-2 rounded-lg font-medium hover:bg-muted transition-colors"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[rgb(var(--brand-dark))] text-white pt-16 pb-24">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-white/70 mb-8">
            Start with a 14-day free trial. No credit card required.
            <br />
            Pay only for what you use.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex bg-white/10 p-1 rounded-lg">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-white text-[rgb(var(--brand-dark))]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-6 py-2.5 rounded-md text-sm font-medium transition-all ${
                billingCycle === 'annual'
                  ? 'bg-white text-[rgb(var(--brand-dark))]'
                  : 'text-white/80 hover:text-white'
              }`}
            >
              Annual
              <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                Save 17%
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="max-w-7xl mx-auto px-6 -mt-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingTiers.map((tier) => {
            const price = billingCycle === 'annual' ? tier.annualPrice : tier.monthlyPrice;

            return (
              <div
                key={tier.name}
                className={`relative bg-card rounded-xl border-2 ${
                  tier.highlighted
                    ? 'border-[rgb(var(--brand-dark))] shadow-xl'
                    : 'border-border shadow-sm'
                }`}
              >
                {tier.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-[rgb(var(--brand-dark))] text-white text-sm font-medium px-4 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="p-8">
                  <h3 className="text-xl font-semibold text-foreground">{tier.name}</h3>
                  <p className="mt-2 text-muted-foreground text-sm h-12">{tier.description}</p>

                  <div className="mt-6">
                    <span className="text-4xl font-bold text-foreground">
                      {formatPrice(price)}
                    </span>
                    {price > 0 && (
                      <span className="text-muted-foreground">
                        /{billingCycle === 'annual' ? 'year' : 'month'}
                      </span>
                    )}
                  </div>

                  {price > 0 && billingCycle === 'annual' && (
                    <p className="mt-1 text-sm text-primary">
                      ${Math.round(price / 12)}/month billed annually
                    </p>
                  )}

                  <Link
                    href={tier.ctaLink}
                    className={`mt-6 w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      tier.highlighted
                        ? 'bg-[rgb(var(--brand-dark))] text-white hover:bg-[#2d3a44]'
                        : 'bg-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {tier.cta}
                    <RiArrowRightLine className="w-4 h-4" />
                  </Link>

                  <ul className="mt-8 space-y-4">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <RiCheckLine className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Transaction Fees */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Transaction Fees</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Pay-as-you-go transaction fees. No hidden charges.
            Fees are charged per successful payment.
          </p>
        </div>

        <div className="bg-muted rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-[rgb(var(--brand-dark))] text-white">
                <th className="text-left py-4 px-6 font-medium">Payment Type</th>
                <th className="text-left py-4 px-6 font-medium hidden md:table-cell">Description</th>
                <th className="text-center py-4 px-6 font-medium">Fee</th>
                <th className="text-center py-4 px-6 font-medium">Min</th>
                <th className="text-center py-4 px-6 font-medium">Max</th>
              </tr>
            </thead>
            <tbody>
              {transactionFees.map((fee, idx) => (
                <tr key={idx} className="border-b border-border last:border-0">
                  <td className="py-4 px-6">
                    <div className="font-medium text-foreground">{fee.type}</div>
                    <div className="text-sm text-muted-foreground md:hidden">{fee.description}</div>
                  </td>
                  <td className="py-4 px-6 text-muted-foreground hidden md:table-cell">{fee.description}</td>
                  <td className="py-4 px-6 text-center font-semibold text-foreground">{fee.fee}</td>
                  <td className="py-4 px-6 text-center text-muted-foreground">{fee.min}</td>
                  <td className="py-4 px-6 text-center text-muted-foreground">{fee.max}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Volume discounts available for Enterprise customers. <Link href="mailto:sales@getcentry.app" className="text-[rgb(var(--brand-dark))] hover:underline">Contact sales</Link> for custom pricing.
        </p>
      </section>

      {/* Features Comparison */}
      <section className="bg-muted py-24">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-foreground mb-4">Compare Plans</h2>
            <p className="text-muted-foreground">Choose the plan that fits your business needs</p>
          </div>

          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-4 px-6 font-medium text-foreground">Feature</th>
                  <th className="text-center py-4 px-4 font-medium text-foreground">Starter</th>
                  <th className="text-center py-4 px-4 font-medium text-foreground bg-muted">Professional</th>
                  <th className="text-center py-4 px-4 font-medium text-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { feature: 'Users', starter: '3', professional: '10', enterprise: 'Unlimited' },
                  { feature: 'ERP Connections', starter: '1', professional: '3', enterprise: 'Unlimited' },
                  { feature: 'Payments/Month', starter: '100', professional: 'Unlimited', enterprise: 'Unlimited' },
                  { feature: 'Bank Integrations', starter: 'Standard', professional: 'All', enterprise: 'All + Custom' },
                  { feature: 'Approval Workflows', starter: 'Basic', professional: 'Advanced', enterprise: 'Custom' },
                  { feature: 'Multi-Currency', starter: false, professional: true, enterprise: true },
                  { feature: 'Bulk Uploads', starter: false, professional: true, enterprise: true },
                  { feature: 'API Access', starter: false, professional: false, enterprise: true },
                  { feature: 'Custom Integrations', starter: false, professional: false, enterprise: true },
                  { feature: 'SLA Guarantee', starter: false, professional: false, enterprise: true },
                  { feature: 'Dedicated Support', starter: false, professional: false, enterprise: true },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-4 px-6 text-foreground">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.starter === 'boolean' ? (
                        row.starter ? (
                          <RiCheckLine className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.starter}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center bg-muted">
                      {typeof row.professional === 'boolean' ? (
                        row.professional ? (
                          <RiCheckLine className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )
                      ) : (
                        <span className="text-foreground font-medium">{row.professional}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.enterprise === 'boolean' ? (
                        row.enterprise ? (
                          <RiCheckLine className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.enterprise}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-foreground mb-4">Frequently Asked Questions</h2>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">{faq.question}</span>
                <RiQuestionLine
                  className={`w-5 h-5 text-muted-foreground/60 transition-transform ${
                    expandedFaq === idx ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {expandedFaq === idx && (
                <div className="px-5 pb-5 text-muted-foreground">
                  {faq.answer}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[rgb(var(--brand-dark))] text-white py-16">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to streamline your payments?</h2>
          <p className="text-white/70 mb-8">
            Start your 14-day free trial today. No credit card required.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link
              href="/auth/login"
              className="bg-white text-[rgb(var(--brand-dark))] px-8 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Start Free Trial
            </Link>
            <Link
              href="mailto:sales@getcentry.app"
              className="border border-white/30 text-white px-8 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors"
            >
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[rgb(var(--brand-dark))] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="text-foreground font-semibold">Centry</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link>
              <Link href="/cancellation-policy" className="hover:text-foreground">Cancellation Policy</Link>
              <Link href="mailto:support@getcentry.app" className="hover:text-foreground">Support</Link>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} Centry. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
