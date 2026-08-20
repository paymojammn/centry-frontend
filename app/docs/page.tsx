import { Metadata } from 'next';
import {
  DocsLayout,
  DocsSection,
  DocsCard,
  Endpoint,
} from '@/components/docs/docs-layout';
import { CodeBlock } from '@/components/docs/code-block';
import { BRAND } from '@/config/brand';
import {
  ArrowRight,
  Banknote,
  Building2,
  ClipboardCheck,
  FileText,
  Globe,
  KeyRound,
  RefreshCw,
  Shield,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Platform Documentation',
  description: `Sign in with your ERP, sync bills and invoices, and move money — how the ${BRAND.name} platform works.`,
};

/**
 * Platform docs — documents what this app actually does: ERP-connected login,
 * bill/invoice sync and processing, and money movement (pay-ins, payouts)
 * with approvals. The separate Checkout API (server-to-server, cen_ keys)
 * lives at /docs/checkout.
 *
 * Every endpoint listed here is one the dashboard itself calls — see the
 * clients in lib/*-api.ts. If you change an endpoint, change it here too.
 */
export default function PlatformDocsPage() {
  return (
    <DocsLayout>
      <div className="px-6 lg:px-12 py-10 max-w-4xl">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Building2 className="size-4" />
            {BRAND.name} Platform
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Your ERP, connected to African payment rails
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            {BRAND.name} is a payments back office for your accounting system. Sign in with
            your ERP — no separate account — and your bills, invoices, vendors, and accounts
            sync in. Pay bills, collect on invoices, send payouts over mobile money and bank
            rails, and reconcile everything back to the ERP.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <DocsCard icon={<KeyRound className="size-5" />} title="Sign in with your ERP" description="OAuth, no new password" href="#erp-login" />
          <DocsCard icon={<FileText className="size-5" />} title="Bills & Invoices" description="Synced from your ERP" href="#bills" />
          <DocsCard icon={<Banknote className="size-5" />} title="Pay Out" description="Payouts with approvals" href="#payouts" />
          <DocsCard icon={<RefreshCw className="size-5" />} title="Reconciliation" description="Payments back to ERP" href="#reconciliation" />
        </div>

        {/* Introduction */}
        <DocsSection id="introduction" title="How it works" description="From ERP sign-in to reconciled payment">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 mb-6">
            <div className="space-y-3">
              {[
                'Sign in with your ERP — Xero, QuickBooks Online, ERPNext (OAuth), or Odoo (API key)',
                'Your organization and its bills, invoices, vendors, and accounts sync in automatically',
                'Pay bills from your wallet or a provider rail — or generate a bank payment file',
                'Collect on outstanding invoices with request-to-pay pushes or payment links',
                'Send payouts (single or bulk) — every send passes an approval workflow first',
                'Completed payments reconcile back to your ERP, so the books stay right',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-4">
            <h4 className="font-medium text-foreground text-sm mb-2">Two money directions, one queue</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Money out (bill payments, payouts) and money in (invoice collections, pay-in
              requests) both land in a payment-events queue with per-item status, so a bulk
              run can be tracked and retried one recipient — or one payer — at a time.
            </p>
          </div>
        </DocsSection>

        {/* ERP Login */}
        <DocsSection id="erp-login" title="Sign in with your ERP" description="Your accounting system is the identity provider">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              There is no {BRAND.name} password. You authenticate against your ERP, and
              {' '}{BRAND.name} creates (or matches) your organization from the ERP tenant.
              OAuth providers redirect to the provider&apos;s consent screen; API-key
              providers (Odoo) take credentials in a form instead.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Provider</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Method</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">You provide</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-medium text-foreground">Xero</td><td className="px-4 py-3 text-muted-foreground">OAuth 2.0</td><td className="px-4 py-3 text-muted-foreground">Consent on xero.com</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-medium text-foreground">QuickBooks Online</td><td className="px-4 py-3 text-muted-foreground">OAuth 2.0</td><td className="px-4 py-3 text-muted-foreground">Consent on intuit.com</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-medium text-foreground">ERPNext</td><td className="px-4 py-3 text-muted-foreground">OAuth 2.0 (Frappe)</td><td className="px-4 py-3 text-muted-foreground">Consent on your Frappe site</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-medium text-foreground">Odoo</td><td className="px-4 py-3 text-muted-foreground">API key</td><td className="px-4 py-3 text-muted-foreground">Base URL, database, API key</td></tr>
                </tbody>
              </table>
            </div>

            <div className="space-y-3">
              <Endpoint method="GET" path="/api/v1/erp/providers/available/" description="Public list of sign-in providers — drives the login page's provider grid." />
              <Endpoint method="GET" path="/api/auth/{provider}/signin/?redirect_url={url}" description="Starts the OAuth flow for xero, qbo, or erpnext. Redirects the browser to the provider's consent screen, then back to redirect_url." />
              <Endpoint method="POST" path="/api/auth/odoo/signin/" description="API-key sign-in for Odoo. Body: base_url, database, api_key." />
              <Endpoint method="POST" path="/api/auth/exchange/" description="Exchanges the one-time auth code from the OAuth callback for JWT access and refresh tokens." />
              <Endpoint method="POST" path="/api/auth/token/refresh/" description="Refreshes an expired access token. The dashboard does this automatically on a 401." />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <Shield className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 text-sm">Session tokens</h4>
                <p className="text-xs text-amber-600 mt-1">
                  After sign-in, every dashboard API call carries{' '}
                  <code className="text-[11px]">Authorization: Bearer &lt;access token&gt;</code>.
                  Tokens are short-lived and refreshed transparently; signing out clears them
                  and revokes the server session.
                </p>
              </div>
            </div>
          </div>
        </DocsSection>

        {/* Data sync */}
        <DocsSection id="sync" title="Syncing ERP data" description="Bills, invoices, vendors, and accounts pull from your ERP connection">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Each organization has one or more ERP connections. Syncs are pull-based — trigger
              them from the Bills or Invoices pages (the sync button) or call the connection&apos;s
              sync endpoints. Reads are unified across providers: the same list endpoint serves
              Xero, QuickBooks, ERPNext, and Odoo data.
            </p>

            <div className="space-y-3">
              <Endpoint method="GET" path="/api/v1/erp/connections/" description="Your organizations' ERP connections — provider, last_sync_at, active state." />
              <Endpoint method="POST" path="/api/v1/erp/connections/{id}/sync_bills/" description="Pull payables (bills) from the ERP. Also: sync_invoices/, sync_contacts/, sync_accounts/." />
              <Endpoint method="GET" path="/api/v1/erp/bills/" description="Unified bills list across all connected ERPs. Filters: status, organization. Stats at /api/v1/erp/bills/stats/." />
              <Endpoint method="GET" path="/api/v1/erp/invoices/" description="Unified sales invoices (receivables). Filters: status, organization. Stats at /api/v1/erp/invoices/stats/." />
            </div>

            <CodeBlock
              language="json"
              filename="Sync response"
              code={`{
  "status": "success",
  "synced_count": 42,
  "message": "Synced 42 bills from Xero"
}`}
            />
          </div>
        </DocsSection>

        {/* Invoices — money in */}
        <DocsSection id="invoices" title="Invoices (money in)" description="Receivables synced from your ERP, collectable from the dashboard">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Invoices page shows your outstanding, overdue, and paid receivables with
              totals per organization. Invoices in{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">AUTHORISED</code>{' '}
              status are collectable: you can send the customer a request-to-pay push or a
              payment link, and watch the collection progress on the Collections tab. Collecting
              requires the{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">invoices.collect</code>{' '}
              permission on the organization.
            </p>

            <div className="bg-muted/50 border border-border rounded-xl p-4">
              <h4 className="font-medium text-foreground text-sm mb-2">Payment-link returns</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                When a customer pays through a hosted payment link, they are returned to the
                Invoices page with{' '}
                <code className="font-mono">?payment=success|cancelled|error</code> — the page
                surfaces the outcome and jumps to the Collections tab on success.
              </p>
            </div>
          </div>
        </DocsSection>

        {/* Pay In — collections */}
        <DocsSection id="collections" title="Pay In (collections)" description="Request money from one payer or many, tracked per number">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              A pay-in is a <strong>collection request</strong>: every payer becomes an item, so
              a bulk collection can be dispatched, polled, and retried one number at a time.
              Dispatching sends the request-to-pay push (e.g. a mobile money approval prompt)
              to each payer.
            </p>

            <div className="space-y-3">
              <Endpoint method="POST" path="/api/v1/payments/api/collection-requests/" description="Create a collection request. Dispatches the push immediately unless dispatch: false (draft)." />
              <Endpoint method="POST" path="/api/v1/payments/api/collection-requests/{id}/dispatch_request/" description="Send the push for a request that was created as a draft." />
              <Endpoint method="POST" path="/api/v1/payments/api/collection-requests/{id}/refresh/" description="Poll the provider for every payer still awaiting approval." />
              <Endpoint method="POST" path="/api/v1/payments/api/collection-requests/{id}/items/{item_id}/retry/" description="Re-send the push to one failed payer." />
              <Endpoint method="GET" path="/api/v1/payments/api/collection-requests/stats/" description="Collection totals for the dashboard cards. Pending list at .../pending/." />
            </div>
          </div>
        </DocsSection>

        {/* Bills — money out */}
        <DocsSection id="bills" title="Bills (money out)" description="Pay synced bills from a wallet or rail, or export a bank file">
          <div className="space-y-6">
            <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
              <h4 className="font-semibold text-foreground mb-4">The bill payment flow</h4>
              <div className="space-y-3">
                {[
                  'Select one or more synced bills to pay',
                  'The dashboard checks your wallet balance covers the total',
                  'If the source currency differs from the bill currency, an FX quote is fetched (5-minute freshness window — the pay endpoint re-quotes if it expired)',
                  'Payment is submitted; each bill becomes a payment event in the processing queue',
                  'Alternatively, generate a bank payment file (CSV or XML) to upload to your bank',
                  'Completed payments are marked against the bill and synced back to the ERP',
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 size-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <Endpoint method="POST" path="/api/v1/xero/bills/check_wallet_balance/" description="Verify the wallet covers the selected bills. Body: bills [{bill_id, amount}], currency." />
              <Endpoint method="GET" path="/api/v1/xero/bills/fx-quote/?from=USD&to=UGX&amount=100" description="FX quote for cross-currency payment. Returns rate, converted_amount, expires_at." />
              <Endpoint method="POST" path="/api/v1/xero/bills/pay/" description="Pay the selected bills from the chosen source (wallet or provider account)." />
              <Endpoint method="GET" path="/api/v1/xero/payments/" description="The payment-events queue. Filters: organization, direction (IN/OUT), status, method, bill_id, invoice_id, synced_to_xero." />
              <Endpoint method="POST" path="/api/v1/banking/exports/" description="Generate a bank payment file server-side (CSV or XML) for the given payment_event_ids, with optional debtor IBAN/BIC and currency conversion." />
            </div>
          </div>
        </DocsSection>

        {/* Pay Out — payouts */}
        <DocsSection id="payouts" title="Pay Out (payouts)" description="Send money to one recipient or disburse to many — always through approval">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              A payout is a <strong>payment request</strong>. Nothing reaches a provider until
              the request has been submitted and approved — the approval workflow is not
              optional. Bulk sends fan out one provider call per recipient, tracked
              individually. Payment methods:{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">mobile_money</code>,{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">bank</code>,{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">wallet</code>.
            </p>

            <div className="bg-muted/50 border border-border rounded-xl p-4">
              <h4 className="font-medium text-foreground text-sm mb-3">Lifecycle</h4>
              <p className="text-sm text-muted-foreground">
                <code className="text-xs bg-muted px-1 py-0.5 rounded">draft</code> <ArrowRight className="inline size-3" />{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">pending</code> <ArrowRight className="inline size-3" />{' '}
                <code className="text-xs bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded">approved</code> |{' '}
                <code className="text-xs bg-red-500/10 text-red-600 px-1 py-0.5 rounded">rejected</code> <ArrowRight className="inline size-3" />{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">processing</code> <ArrowRight className="inline size-3" />{' '}
                <code className="text-xs bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded">completed</code> |{' '}
                <code className="text-xs bg-red-500/10 text-red-600 px-1 py-0.5 rounded">failed</code>
              </p>
            </div>

            <div className="space-y-3">
              <Endpoint method="POST" path="/api/v1/payments/api/payment-requests/" description="Create a payout request — single (recipient_name, recipient_phone, amount) or bulk (recipients array)." />
              <Endpoint method="POST" path="/api/v1/payments/api/payment-requests/{id}/submit/" description="Submit a draft for approval." />
              <Endpoint method="POST" path="/api/v1/payments/api/payment-requests/{id}/approve/" description="Approve (with optional notes). Reject via .../reject/ with a reason." />
              <Endpoint method="POST" path="/api/v1/payments/api/payment-requests/{id}/process/" description="Execute an approved request against the selected rail." />
              <Endpoint method="GET" path="/api/v1/payments/api/payment-requests/pending/" description="Requests awaiting your approval. Totals at .../stats/." />
            </div>

            <CodeBlock
              language="json"
              filename="Create — bulk mobile money payout"
              code={`{
  "organization_id": "3f6c…",
  "payment_type": "bulk",
  "payment_method": "mobile_money",
  "currency": "UGX",
  "description": "August field-team allowances",
  "source_provider_account": "9b2e…",
  "recipients": [
    { "name": "A. Okello", "phone": "+256700000001", "amount": 150000 },
    { "name": "B. Nansubuga", "phone": "+256700000002", "amount": 150000 }
  ]
}`}
            />
          </div>
        </DocsSection>

        {/* Rails */}
        <DocsSection id="rails" title="Payment rails" description="Which countries this org can move money in, and over which providers">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              The Pay In and Pay Out pages drive their country and rail pickers from one
              endpoint. Each rail reports its provider, country, environment
              (<code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">sandbox</code> or{' '}
              <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">production</code>),
              and whether the platform can execute it for that capability yet
              (<code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">supported</code>{' '}
              with an <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">unsupported_reason</code> when not).
              Rails come from the provider accounts you configure under{' '}
              <strong>Rails &rarr; Provider Accounts</strong> — OneGate and Ozow (South Africa),
              MTN MoMo and Airtel Money (East Africa), and Paystack.
            </p>

            <Endpoint method="GET" path="/api/v1/payments/api/payment-rails/?organization_id={id}&capability=payout" description="Countries and rails available to this organization for payin or payout." />

            <CodeBlock
              language="json"
              filename="Response (truncated)"
              code={`{
  "capability": "payout",
  "countries": [
    {
      "code": "UG",
      "name": "Uganda",
      "currency": "UGX",
      "phone_code": "+256",
      "rails": [
        {
          "provider": "mtn",
          "provider_display": "MTN MoMo",
          "environment": "sandbox",
          "is_live": false,
          "capabilities": ["payin", "payout"],
          "supported": true,
          "unsupported_reason": ""
        }
      ]
    }
  ]
}`}
            />
          </div>
        </DocsSection>

        {/* Approvals */}
        <DocsSection id="approvals" title="Approval workflows" description="Who must sign off before money moves">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Approval workflows are configured per organization and scoped to what they govern
              (payouts, wallet transfers, …). Every payout request and department wallet
              transfer passes through the matching workflow before processing. New
              organizations can seed a sensible default set.
            </p>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/v1/approvals/workflows/" description="List, create (POST), update (PATCH), and delete workflows." />
              <Endpoint method="GET" path="/api/v1/approvals/workflows/scopes/" description="The things a workflow can govern." />
              <Endpoint method="POST" path="/api/v1/approvals/workflows/seed-defaults/" description="Create the default workflow set for an organization." />
            </div>
          </div>
        </DocsSection>

        {/* Wallet */}
        <DocsSection id="wallet" title="Wallet" description="Org balances, department wallets, and internal transfers">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Each organization holds wallet balances per currency, used as a payment source for
              bills and payouts. Department wallets carve the org wallet into budgets with their
              own linked accounts, transfer approvals, and fee previews.
            </p>
            <div className="space-y-3">
              <Endpoint method="GET" path="/api/v1/wallet/balance/?currency=UGX" description="Org wallet balance for a currency. Transactions at /api/v1/wallet/transactions/." />
              <Endpoint method="POST" path="/api/v1/wallet/load/" description="Load the wallet from a saved payment method." />
              <Endpoint method="GET" path="/api/v1/wallet/departments/?organization_id={id}" description="Department wallets. Per-wallet: balance/, transactions/, transfer/, fee_preview/, pending_approvals/, approve/{txn}/, reject/{txn}/." />
            </div>
          </div>
        </DocsSection>

        {/* Reconciliation */}
        <DocsSection id="reconciliation" title="Reconciliation" description="Getting payments back into the ERP">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Every payment event tracks whether it has been written back to the ERP
              (<code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">synced_to_xero</code>).
              The <strong>Banking &rarr; Sync to ERP</strong> page shows unsynced events and
              pushes them, so a bill paid here shows as paid in Xero, QuickBooks, ERPNext, or
              Odoo — and bank transactions imported under <strong>Banking &rarr; Transactions</strong>{' '}
              can be matched against them.
            </p>
          </div>
        </DocsSection>

        {/* API access */}
        <DocsSection id="api-access" title="API access" description="Base URLs, auth, and the machine-to-machine surfaces">
          <div className="space-y-6">
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sandbox</div>
                <code className="text-xs font-mono text-foreground">{BRAND.urls.apiSandbox}</code>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Production</div>
                <code className="text-xs font-mono text-foreground">{BRAND.urls.api}</code>
              </div>
            </div>

            <p className="text-muted-foreground text-sm leading-relaxed">
              The endpoints on this page are the dashboard API: they authenticate with the JWT
              you get from ERP sign-in (<code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">Authorization: Bearer …</code>).
              For server-to-server integrations there are two separate, key-authenticated
              surfaces with their own docs:
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <DocsCard
                icon={<Globe className="size-5" />}
                title="Checkout API"
                description="Hosted & headless checkout sessions, cen_ API keys, webhooks."
                href="/docs/checkout"
              />
              <DocsCard
                icon={<ClipboardCheck className="size-5" />}
                title="OpenAPI / Swagger"
                description="Interactive reference for the public API surface."
                href={BRAND.urls.api + '/api/docs/'}
              />
            </div>
          </div>
        </DocsSection>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Need help?{' '}
              <a href={`mailto:${BRAND.email.support}`} className="text-primary hover:underline">{BRAND.email.support}</a>
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href={BRAND.urls.api} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">Admin</a>
              <a href="/auth/login" className="hover:text-foreground">Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}
