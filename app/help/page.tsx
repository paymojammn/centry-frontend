'use client';

import * as React from 'react';
import Link from 'next/link';
import { BRAND } from '@/config/brand';
import {
  RiRocketLine,
  RiBankCardLine,
  RiBankLine,
  RiLinksLine,
  RiShieldKeyholeLine,
  RiToolsLine,
  RiSearchLine,
  RiArrowRightLine,
  RiArrowDownSLine,
  RiMailLine,
  RiBookOpenLine,
  type RemixiconComponentType,
} from '@remixicon/react';

type Faq = {
  q: string;
  a: React.ReactNode;
  /** Extra search keywords (mirrors the legacy data-q attribute). */
  keywords: string;
};

type Category = {
  id: string;
  title: string;
  icon: RemixiconComponentType;
  description: string;
  faqs: Faq[];
};

const categories: Category[] = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: RiRocketLine,
    description: 'Connect your ERP, set up your team, and make your first payment',
    faqs: [
      {
        q: 'How do I create a Centry account?',
        keywords: 'how do i sign up',
        a: 'Click "Get Started" on the homepage and sign in with your Xero or QuickBooks account. Centry uses OAuth so you never need to share your ERP credentials. Once connected, your organizations, contacts, and bills sync automatically.',
      },
      {
        q: 'How do I connect my ERP (Xero/QuickBooks)?',
        keywords: 'connect xero quickbooks erp',
        a: 'Go to the login page and click "Continue with Xero" or "Continue with QuickBooks". You\'ll be redirected to authorize Centry. Once approved, your bills, contacts, and chart of accounts sync within seconds.',
      },
      {
        q: 'How do I invite team members?',
        keywords: 'invite team members users',
        a: 'Go to Organizations in the dashboard sidebar, select your org, and click "Invite Member". You can assign roles (Owner, Admin, Manager, Member, Viewer) and set specific permissions for payments, banking, and ERP access.',
      },
      {
        q: 'How do I make my first payment?',
        keywords: 'first payment setup',
        a: '1) Sync bills from your ERP. 2) Go to the Bills page and select bills to pay. 3) Choose a payment method (bank transfer or mobile money). 4) The payment goes into the approval queue. 5) An approver reviews and approves. 6) An exporter generates the bank file (pain.001) for upload.',
      },
    ],
  },
  {
    id: 'payments',
    title: 'Payments & Bills',
    icon: RiBankCardLine,
    description: 'Creating, approving, and processing supplier payments',
    faqs: [
      {
        q: 'How does the approval workflow work?',
        keywords: 'approval workflow segregation duties',
        a: (
          <>
            Centry enforces segregation of duties with three roles: <strong>Creator</strong>{' '}
            (initiates payments), <strong>Approver</strong> (approves/rejects), and{' '}
            <strong>Exporter</strong> (generates bank files). A person cannot approve their own
            payment, and the approver cannot generate the file for payments they approved.
          </>
        ),
      },
      {
        q: 'Can I pay multiple bills at once?',
        keywords: 'pay multiple bills bulk',
        a: 'Yes. On the Bills page, select multiple bills using the checkboxes, then click "Pay Selected". You can choose different payment methods per bill or pay all via the same bank account.',
      },
      {
        q: 'Does Centry support international payments?',
        keywords: 'international remittance cross border',
        a: 'Yes. In the payment modal, choose "International Remittance" to send cross-border payments. You\'ll need to provide the beneficiary\'s IBAN, SWIFT/BIC code, and address. The payment file is generated in ISO 20022 pain.001 format.',
      },
      {
        q: 'Can I pay via mobile money?',
        keywords: 'mobile money mtn airtel',
        a: 'Yes. Centry supports MTN MoMo and Airtel Money. When paying a bill, select the mobile money account as your payment source. The recipient\'s phone number is auto-populated from the ERP contact.',
      },
      {
        q: 'Why is my payment stuck in "Pending Approval"?',
        keywords: 'payment stuck pending',
        a: (
          <>
            This means the payment is waiting for someone with the <strong>payments.approve</strong>{' '}
            permission to review it. The creator cannot approve their own payment (segregation of
            duties). Ask a team member with approve permissions to review the queue.
          </>
        ),
      },
    ],
  },
  {
    id: 'banking',
    title: 'Banking & SFTP',
    icon: RiBankLine,
    description: 'Bank file generation, SFTP uploads, and pain.002 reconciliation',
    faqs: [
      {
        q: 'How do I generate a bank payment file?',
        keywords: 'generate bank file pain 001',
        a: 'After payments are approved (status: PROCESSING), go to the Queue tab, select the payments, choose your bank account, and click "Generate File". This creates an ISO 20022 pain.001 XML file that can be uploaded to your bank.',
      },
      {
        q: 'How does SFTP upload work?',
        keywords: 'sftp upload download',
        a: 'Go to Banking → Export → Pay tab. Select the generated file and click Upload. Centry sends the file to your bank\'s SFTP server automatically. You need SFTP credentials configured under Banking → Accounts.',
      },
      {
        q: 'What is pain.002 reconciliation?',
        keywords: 'pain 002 reconciliation bank response',
        a: 'Pain.002 is the bank\'s response file that tells you which payments were accepted or rejected. Centry pulls these automatically via SFTP, parses them, and updates each payment\'s status. Successful payments can then be synced back to your ERP.',
      },
    ],
  },
  {
    id: 'erp',
    title: 'ERP Integration',
    icon: RiLinksLine,
    description: 'Connecting Xero, QuickBooks, and syncing your data',
    faqs: [
      {
        q: 'How do I sync bills from my ERP?',
        keywords: 'sync bills contacts xero quickbooks',
        a: 'Bills sync automatically when you connect your ERP. You can also manually trigger a sync from the Bills page by clicking the "Sync" button. This pulls the latest bills, contacts, and bank details from Xero or QuickBooks.',
      },
      {
        q: 'How are vendor bank details imported?',
        keywords: 'contact bank details linked',
        a: 'Bank details come from three sources: 1) Xero API sync (BatchPayments data), 2) CSV import with BankAccountParticulars column, 3) Manual edit via the contact\'s bank-details endpoint. Centry automatically matches bank names to your system\'s bank records.',
      },
      {
        q: 'Can I import contacts from CSV?',
        keywords: 'csv import contacts',
        a: 'Yes. Go to Contacts and click "Import CSV". Upload a Xero-format CSV with columns: ContactName, BankAccountName, BankAccountNumber, BankAccountParticulars, PhoneNumber, etc. The importer auto-matches bank names and deduplicates contacts.',
      },
    ],
  },
  {
    id: 'permissions',
    title: 'Permissions & Security',
    icon: RiShieldKeyholeLine,
    description: 'User roles, finance permissions, and segregation of duties',
    faqs: [
      {
        q: 'What permissions are available?',
        keywords: 'finance role permissions',
        a: (
          <>
            Centry has granular permissions across three areas:
            <br />
            <strong>Payments:</strong> view, create, approve, export
            <br />
            <strong>Banking:</strong> view, edit, delete, sync, export (SFTP)
            <br />
            <strong>ERP:</strong> view, edit, delete, sync, manage connections
            <br />
            Org owners and admins automatically have all permissions.
          </>
        ),
      },
      {
        q: 'Who can see the Bills menu?',
        keywords: 'who can see bills sidebar menu',
        a: (
          <>
            Only users with the <strong>finance</strong> role (User.role = "finance") or org
            owners/admins can see the Bills and Banking sidebar items. Other users see a "Finance
            Access Required" page if they navigate to those URLs directly.
          </>
        ),
      },
      {
        q: 'How does segregation of duties work?',
        keywords: 'segregation duties creator approver exporter',
        a: (
          <>
            Three-way segregation: the <strong>creator</strong> cannot approve their own payment,
            and the <strong>approver</strong> cannot generate the bank file for payments they
            approved. This ensures no single person can initiate and complete a payment.
          </>
        ),
      },
    ],
  },
  {
    id: 'troubleshooting',
    title: 'Troubleshooting',
    icon: RiToolsLine,
    description: 'Common issues, error messages, and how to resolve them',
    faqs: [
      {
        q: 'I\'m getting a "Permission Denied" error',
        keywords: '403 permission denied error',
        a: 'This means your user account doesn\'t have the required permission. Ask your organization admin to go to Django Admin → Organization Memberships → your membership, and tick the required permission checkboxes (e.g., payments.create, banking.export).',
      },
      {
        q: 'Vendor bank details aren\'t loading in the pay modal',
        keywords: 'bank not matched linked contact',
        a: 'Click "Load bank details from ERP" in the pay modal. If the bank still doesn\'t appear, the vendor\'s contact may not have a linked bank. Go to the contact in Django Admin and set the linked_bank field, or re-import contacts from CSV with the BankAccountParticulars column.',
      },
      {
        q: 'I can\'t approve a payment I created',
        keywords: 'approve own payment segregation',
        a: (
          <>
            This is by design — segregation of duties prevents the creator from approving their own
            payment. Ask a different team member with the <strong>payments.approve</strong>{' '}
            permission to approve it.
          </>
        ),
      },
      {
        q: 'The processing queue is empty after I paid bills',
        keywords: 'queue empty no payments',
        a: 'Switch to the "Processing" tab in the Bills page. New payments start in "Pending Approval" status. If you don\'t see them, check that you\'re looking at the correct organization and that the status filter isn\'t hiding them.',
      },
    ],
  },
];

export default function HelpCenterPage() {
  const [query, setQuery] = React.useState('');
  const [open, setOpen] = React.useState<Set<string>>(new Set());

  const q = query.trim().toLowerCase();

  const matches = (faq: Faq) =>
    !q || `${faq.q} ${faq.keywords}`.toLowerCase().includes(q);

  const visibleCategories = categories
    .map((cat) => ({ ...cat, faqs: cat.faqs.filter(matches) }))
    .filter((cat) => cat.faqs.length > 0);

  const noResults = q.length > 0 && visibleCategories.length === 0;

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const scrollToSection = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgb(var(--brand-dark))] text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={BRAND.logo.markDark} alt={BRAND.name} className="h-7 w-7" />
            <span className="font-semibold">Centry</span>
          </Link>
          <div className="flex items-center gap-1">
            <nav className="hidden items-center gap-1 sm:flex">
              <Link href="/" className="rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                Home
              </Link>
              <Link href="/pricing" className="rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                Pricing
              </Link>
              <Link href="/docs/checkout" className="rounded-lg px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                API Docs
              </Link>
            </nav>
            <Link
              href="/auth/login"
              className="ml-2 rounded-lg bg-white px-4 py-1.5 text-sm font-semibold text-[rgb(var(--brand-dark))] transition-opacity hover:opacity-90"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[rgb(var(--brand-dark))] px-6 pb-20 pt-14 text-center text-white">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">How can we help?</h1>
          <p className="mt-3 text-base text-white/60 sm:text-lg">
            Find answers, guides, and resources to get the most out of Centry
          </p>
        </div>
      </section>

      {/* Search (overlaps hero) */}
      <div className="relative z-10 mx-auto -mt-7 max-w-xl px-6">
        <div className="flex h-14 items-center gap-3 rounded-xl border border-border bg-card px-5 shadow-lg">
          <RiSearchLine className="size-5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for help..."
            className="w-full bg-transparent text-base text-foreground outline-none placeholder:text-muted-foreground"
            aria-label="Search help articles"
          />
        </div>
      </div>

      {/* Category cards — hidden while searching */}
      {!q && (
        <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-5 px-6 md:grid-cols-2 lg:grid-cols-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.id}
                onClick={() => scrollToSection(cat.id)}
                className="group rounded-xl border border-border bg-card p-7 text-left transition-all hover:border-primary hover:shadow-md"
              >
                <span className="mb-4 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </span>
                <h3 className="font-semibold text-foreground">{cat.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {cat.description}
                </p>
                <p className="mt-3 text-xs text-muted-foreground/70">
                  {cat.faqs.length} {cat.faqs.length === 1 ? 'article' : 'articles'}
                </p>
              </button>
            );
          })}
        </div>
      )}

      {/* FAQ sections */}
      <div className="mx-auto max-w-3xl px-6">
        {visibleCategories.map((cat) => {
          const Icon = cat.icon;
          return (
            <section key={cat.id} id={cat.id} className="mt-12 scroll-mt-20">
              <h2 className="mb-5 flex items-center gap-3 text-xl font-bold text-foreground">
                <span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-4" />
                </span>
                {cat.title}
              </h2>
              <div className="space-y-3">
                {cat.faqs.map((faq, i) => {
                  const key = `${cat.id}-${i}`;
                  const isOpen = open.has(key);
                  return (
                    <div key={key} className="overflow-hidden rounded-xl border border-border bg-card">
                      <button
                        onClick={() => toggle(key)}
                        aria-expanded={isOpen}
                        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/50"
                      >
                        <span className="text-sm font-semibold text-foreground">{faq.q}</span>
                        <RiArrowDownSLine
                          className={`size-5 shrink-0 text-muted-foreground transition-transform ${
                            isOpen ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
                          {faq.a}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        {/* No results */}
        {noResults && (
          <div className="mt-16 text-center text-muted-foreground">
            <p className="text-sm">
              No results found. Try a different search, or{' '}
              <a
                href="mailto:support@paymoja.com"
                className="font-medium text-primary hover:underline"
              >
                email support
              </a>
              .
            </p>
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="mx-auto mt-16 max-w-xl px-6">
        <h2 className="mb-6 text-center text-2xl font-bold text-foreground">Still need help?</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <RiMailLine className="size-5" />
            </span>
            <h4 className="text-sm font-semibold text-foreground">Email Support</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Response within 24 hours</p>
            <a
              href="mailto:support@paymoja.com"
              className="mt-2 inline-block text-sm font-medium text-primary hover:underline"
            >
              support@paymoja.com
            </a>
          </div>
          <Link
            href="/docs/checkout"
            className="group rounded-xl border border-border bg-card p-6 text-center transition-all hover:border-primary hover:shadow-md"
          >
            <span className="mx-auto mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
              <RiBookOpenLine className="size-5" />
            </span>
            <h4 className="text-sm font-semibold text-foreground">API Docs</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Developer documentation</p>
            <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:underline">
              View docs <RiArrowRightLine className="size-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-20 bg-muted py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <img src={BRAND.logo.mark} alt={BRAND.name} className="size-7" />
            <span className="font-semibold text-foreground">Centry</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
            <Link href="/terms-of-service" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy-policy" className="hover:text-foreground">Privacy</Link>
            <a href="mailto:support@paymoja.com" className="hover:text-foreground">Support</a>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Centry Technologies. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
