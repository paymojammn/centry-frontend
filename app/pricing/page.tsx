'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import { RiCheckLine, RiArrowRightLine, RiQuestionLine } from '@remixicon/react';

type BillingCycle = 'monthly' | 'annual';

interface PricingTier {
  name: string;
  code: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  txnFee: string;
  features: string[];
  excluded?: string[];
  highlighted?: boolean;
  cta: string;
  ctaLink: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'SME',
    code: 'sme',
    description: 'For small and medium businesses getting started with payment automation',
    monthlyPrice: 100,
    annualPrice: 960,
    txnFee: '0.8%',
    features: [
      'Centry Lite ERP — included free',
      'Mobile money — MTN & Airtel',
      'Card & EFT acceptance',
      'SA · Uganda · Zambia',
      'Standard reconciliation & reporting',
      'Up to 5 users',
      '1 ERP connection',
    ],
    excluded: ['Third-party ERP integrations', 'Dedicated account manager'],
    cta: 'Start 14-day free trial',
    ctaLink: '/auth/login?plan=sme',
  },
  {
    name: 'Medium Business',
    code: 'medium',
    description: 'For growing businesses with advanced ERP integrations and payment routing',
    monthlyPrice: 500,
    annualPrice: 4800,
    txnFee: '0.6%',
    highlighted: true,
    features: [
      'Everything in SME',
      'Sage, Odoo & QuickBooks ERP',
      'Multi-rail payment routing',
      'Invoice discounting access',
      'Advanced reconciliation',
      'Priority support',
      'Up to 25 users',
      '5 ERP connections',
    ],
    excluded: ['SAP integration', 'Custom SLAs'],
    cta: 'Start 14-day free trial',
    ctaLink: '/auth/login?plan=medium',
  },
  {
    name: 'Enterprise',
    code: 'enterprise',
    description: 'Full payment orchestration, multi-currency, and dedicated support',
    monthlyPrice: 2000,
    annualPrice: 19200,
    txnFee: '0.4%',
    features: [
      'Everything in Medium',
      'SAP & all ERP integrations',
      'Full payment orchestration',
      'Multi-currency & FX settlement',
      'Dedicated account manager',
      'Custom SLAs & uptime guarantee',
      'B2B supplier marketplace access',
      'Unlimited users & connections',
    ],
    excluded: [],
    cta: 'Contact Sales',
    ctaLink: 'mailto:sales@getcentry.app',
  },
];

const transactionFees = [
  {
    type: 'SME',
    description: 'All payment rails',
    fee: '0.8%',
    min: '-',
    max: '-',
  },
  {
    type: 'Medium Business',
    description: 'All payment rails',
    fee: '0.6%',
    min: '-',
    max: '-',
  },
  {
    type: 'Enterprise',
    description: 'All payment rails',
    fee: '0.4%',
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
                <img src={BRAND.logo.mini} alt="" className="w-7 h-7" />
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
                Save 20%
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
            const ctaHref = tier.ctaLink.startsWith('mailto:')
              ? tier.ctaLink
              : `${tier.ctaLink}&cycle=${billingCycle}`;

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

                  {/* Transaction fee */}
                  <div className="mt-4 bg-muted rounded-lg px-4 py-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Transaction fee</p>
                    <p className="text-base font-bold text-foreground">{tier.txnFee} per payment</p>
                  </div>

                  <Link
                    href={ctaHref}
                    className={`mt-6 w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                      tier.highlighted
                        ? 'bg-[rgb(var(--brand-dark))] text-white hover:bg-[#2C2C2E]'
                        : 'bg-muted text-foreground hover:bg-muted'
                    }`}
                  >
                    {tier.cta}
                    <RiArrowRightLine className="w-4 h-4" />
                  </Link>
                  {!tier.ctaLink.startsWith('mailto:') && (
                    <p className="mt-2 text-xs text-center text-muted-foreground">No credit card required</p>
                  )}

                  <ul className="mt-8 space-y-4">
                    {tier.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-3">
                        <RiCheckLine className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-muted-foreground text-sm">{feature}</span>
                      </li>
                    ))}
                    {tier.excluded && tier.excluded.length > 0 && (
                      <>
                        <li className="border-t border-border pt-4" />
                        {tier.excluded.map((item, idx) => (
                          <li key={`ex-${idx}`} className="flex items-start gap-3 opacity-40">
                            <span className="w-5 h-5 shrink-0 mt-0.5 text-center text-muted-foreground">&#x2715;</span>
                            <span className="text-muted-foreground text-sm">{item}</span>
                          </li>
                        ))}
                      </>
                    )}
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
                  <th className="text-center py-4 px-4 font-medium text-foreground">SME</th>
                  <th className="text-center py-4 px-4 font-medium text-foreground bg-muted">Medium</th>
                  <th className="text-center py-4 px-4 font-medium text-foreground">Enterprise</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {[
                  { feature: 'Transaction Fee', sme: '0.8%', medium: '0.6%', enterprise: '0.4%' },
                  { feature: 'Users', sme: '5', medium: '25', enterprise: 'Unlimited' },
                  { feature: 'ERP Connections', sme: '1', medium: '5', enterprise: 'Unlimited' },
                  { feature: 'Mobile Money (MTN/Airtel)', sme: true, medium: true, enterprise: true },
                  { feature: 'Card & EFT', sme: true, medium: true, enterprise: true },
                  { feature: 'Reconciliation', sme: 'Standard', medium: 'Advanced', enterprise: 'Advanced' },
                  { feature: 'Sage / Odoo / QuickBooks', sme: false, medium: true, enterprise: true },
                  { feature: 'Multi-Rail Routing', sme: false, medium: true, enterprise: true },
                  { feature: 'Invoice Discounting', sme: false, medium: true, enterprise: true },
                  { feature: 'SAP Integration', sme: false, medium: false, enterprise: true },
                  { feature: 'Full Payment Orchestration', sme: false, medium: false, enterprise: true },
                  { feature: 'Multi-Currency & FX', sme: false, medium: false, enterprise: true },
                  { feature: 'Dedicated Account Manager', sme: false, medium: false, enterprise: true },
                  { feature: 'Custom SLAs', sme: false, medium: false, enterprise: true },
                  { feature: 'B2B Marketplace', sme: false, medium: false, enterprise: true },
                ].map((row, idx) => (
                  <tr key={idx} className="border-b border-border last:border-0">
                    <td className="py-4 px-6 text-foreground">{row.feature}</td>
                    <td className="py-4 px-4 text-center">
                      {typeof row.sme === 'boolean' ? (
                        row.sme ? (
                          <RiCheckLine className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )
                      ) : (
                        <span className="text-muted-foreground">{row.sme}</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-center bg-muted">
                      {typeof row.medium === 'boolean' ? (
                        row.medium ? (
                          <RiCheckLine className="w-5 h-5 text-primary mx-auto" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )
                      ) : (
                        <span className="text-foreground font-medium">{row.medium}</span>
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
                <img src={BRAND.logo.miniDark} alt="" className="w-5 h-5" />
              </div>
              <span className="text-foreground font-semibold">Centry</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/refund-policy" className="hover:text-foreground">Refund Policy</Link>
              <Link href="/cancellation-policy" className="hover:text-foreground">Cancellation Policy</Link>
              <Link href="mailto:support@paymoja.com" className="hover:text-foreground">Support</Link>
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
