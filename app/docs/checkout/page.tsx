import { Metadata } from 'next';
import {
  DocsLayout,
  DocsSection,
  DocsCard,
  Endpoint,
  ParamTable,
} from '@/components/docs/docs-layout';
import { CodeBlock, TabbedCodeBlock } from '@/components/docs/code-block';
import {
  Code2,
  CreditCard,
  Globe,
  Key,
  Rocket,
  Shield,
  Webhook,
  Zap,
  Package,
  AlertTriangle,
  Gauge,
  TestTube,
  ArrowRight,
  Banknote,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Checkout API Documentation',
  description: 'Accept payments across Africa with Centry Checkout',
};

export default function CheckoutDocsPage() {
  return (
    <DocsLayout>
      <div className="px-6 lg:px-12 py-10 max-w-4xl">
        {/* Hero */}
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
            <Zap className="size-4" />
            Checkout API v1
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Accept payments across Africa
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed">
            One integration, multiple payment providers. Centry Checkout routes payments to the right
            provider across 10+ African countries — cards, EFT, mobile money, vouchers, and crypto.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <DocsCard icon={<Rocket className="size-5" />} title="Quick Start" description="5 min setup" href="#quickstart" />
          <DocsCard icon={<Code2 className="size-5" />} title="API Reference" description="Full endpoints" href="#api-reference" />
          <DocsCard icon={<Globe className="size-5" />} title="Providers" description="Countries & methods" href="#providers" />
          <DocsCard icon={<Webhook className="size-5" />} title="Webhooks" description="Payment events" href="#webhooks" />
        </div>

        {/* Introduction */}
        <DocsSection id="introduction" title="Introduction" description="How Centry Checkout works">
          <p className="text-muted-foreground leading-relaxed mb-6">
            Centry Checkout provides a unified API for accepting payments across multiple
            African countries and payment providers. You integrate once — we handle provider selection,
            currency routing, and webhook consolidation.
          </p>

          <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-foreground mb-4">The checkout flow</h4>
            <div className="space-y-3">
              {[
                'Your server creates a checkout session with amount, currency, and reference',
                'Redirect your customer to the checkout URL (or embed the widget)',
                'Customer selects their country and sees available payment methods',
                'Customer picks a provider and method (e.g., OneGate card, Paystack bank transfer)',
                'We route the payment to the selected provider and return a redirect URL',
                'You receive a webhook when the payment completes or fails',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-muted/50 border border-border rounded-xl p-4">
            <h4 className="font-medium text-foreground text-sm mb-2">Multi-country, multi-provider</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Merchants operating in multiple countries can accept payments through different providers
              in each country. A Nigerian customer pays via Paystack (cards, bank transfer, USSD),
              while a South African customer pays via OneGate (card, EFT, vouchers) or Ozow (instant EFT) —
              all through the same checkout session.
            </p>
          </div>
        </DocsSection>

        {/* Quick Start */}
        <DocsSection id="quickstart" title="Quick Start" description="Start accepting payments in minutes">
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-foreground mb-2">1. Get your API key</h4>
              <p className="text-muted-foreground text-sm mb-4">
                Create an account and get your API key from the dashboard. Keys start with <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">cen_</code>.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">2. Enable providers per country</h4>
              <p className="text-muted-foreground text-sm mb-4">
                In your dashboard under <strong>Payments &rarr; Provider Configuration</strong>, enable the providers you want for each country.
                For example, enable Paystack for Nigeria and OneGate + Ozow for South Africa.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">3. Create a checkout session</h4>
              <TabbedCodeBlock
                tabs={[
                  {
                    label: 'cURL',
                    language: 'bash',
                    code: `curl -X POST https://api.getcentry.io/api/v1/checkout/sessions/ \\
  -H "Authorization: Api-Key cen_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5000.00",
    "currency": "NGN",
    "reference": "ORDER-12345",
    "success_url": "https://yoursite.com/success",
    "cancel_url": "https://yoursite.com/cancel",
    "webhook_url": "https://yoursite.com/webhooks/centry",
    "customer": {
      "email": "customer@example.com",
      "phone": "+2348012345678"
    }
  }'`,
                  },
                  {
                    label: 'Python (pycentry)',
                    language: 'python',
                    code: `# pip install 'pycentry==0.1.1'   # beta — pin the version
from centry import Client

client = Client(api_key="cen_your_api_key")

session = client.checkout.create(
    amount="5000.00",
    currency="NGN",
    reference="ORDER-12345",
    success_url="https://yoursite.com/success",
    cancel_url="https://yoursite.com/cancel",
    webhook_url="https://yoursite.com/webhooks/centry",
    customer={"email": "customer@example.com"},
)

print(session.checkout_url)  # Redirect customer here`,
                  },
                  {
                    label: 'Node.js (fetch)',
                    language: 'javascript',
                    code: `// No official Node SDK yet — call the HTTPS endpoint directly.
const res = await fetch('https://api.getcentry.io/api/v1/checkout/sessions/', {
  method: 'POST',
  headers: {
    Authorization: 'Api-Key cen_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    amount: '5000.00',
    currency: 'NGN',
    reference: 'ORDER-12345',
    success_url: 'https://yoursite.com/success',
    cancel_url: 'https://yoursite.com/cancel',
    webhook_url: 'https://yoursite.com/webhooks/centry',
    customer: { email: 'customer@example.com' },
  }),
});

if (!res.ok) throw new Error(\`Centry \${res.status}: \${await res.text()}\`);
const { session } = await res.json();
console.log(session.checkout_url); // Redirect customer here`,
                  },
                ]}
              />
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">4. Response</h4>
              <CodeBlock
                language="json"
                filename="Response — 201 Created"
                code={`{
  "success": true,
  "session": {
    "id": "cs_abc123",
    "session_token": "tok_xyz789",
    "checkout_url": "https://checkout.getcentry.io/checkout/tok_xyz789",
    "status": "pending",
    "expires_at": "2024-01-15T12:00:00Z"
  }
}`}
              />
            </div>
          </div>
        </DocsSection>

        {/* Authentication */}
        <DocsSection id="authentication" title="Authentication" description="Secure your API requests">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              All API requests require your API key in the Authorization header.
            </p>
            <CodeBlock language="bash" code={`Authorization: Api-Key cen_your_api_key`} />

            <div id="ip-whitelisting">
              <h4 className="font-semibold text-foreground text-sm mb-2">IP whitelisting</h4>
              <p className="text-sm text-muted-foreground mb-3">
                You can lock a key to specific source IPs or CIDR ranges. Calls from outside the
                list are rejected with{' '}
                <code className="px-1 py-0.5 bg-muted rounded text-[11px] font-mono">403 ip_not_whitelisted</code>{' '}
                and the response body echoes the IP we observed — so your team can self-diagnose
                misconfigured deploys without guessing.
              </p>
              <CodeBlock
                language="json"
                filename="403 response body"
                code={`{
  "code": "ip_not_whitelisted",
  "detail": "Request IP not in API key whitelist",
  "client_ip": "203.0.113.42"
}`}
              />
              <ul className="text-xs text-muted-foreground list-disc pl-5 space-y-1 mt-3">
                <li>
                  Entries are bare IPs or CIDR (IPv4 or IPv6):{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">203.0.113.4</code>,{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">198.51.100.0/24</code>,{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">2001:db8::/32</code>.
                </li>
                <li>
                  We honor{' '}
                  <code className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">X-Forwarded-For</code>{' '}
                  only when the immediate peer is in our trusted-proxy list. Spoofed XFF
                  headers are ignored.
                </li>
                <li>
                  Empty whitelist = allow any source. Strongly discouraged for production keys.
                </li>
              </ul>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <Shield className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 text-sm">Keep your API key secure</h4>
                <p className="text-xs text-amber-600 mt-1">
                  Never expose your API key in client-side code. Use environment variables on
                  your server, rotate compromised keys immediately, and pair production keys
                  with an IP whitelist.
                </p>
              </div>
            </div>
          </div>
        </DocsSection>

        {/* Hosted Checkout */}
        <DocsSection id="hosted-checkout" title="Hosted Checkout" description="Redirect customers to our hosted checkout page">
          <TabbedCodeBlock
            tabs={[
              {
                label: 'Node.js',
                language: 'javascript',
                code: `// Express.js example
app.post('/create-checkout', async (req, res) => {
  const session = await centry.checkout.create({
    amount: req.body.amount,
    currency: req.body.currency, // "NGN", "ZAR", "KES", etc.
    reference: 'ORDER-' + req.body.orderId,
    successUrl: 'https://yoursite.com/success?order=' + req.body.orderId,
    cancelUrl: 'https://yoursite.com/cart',
    webhookUrl: 'https://yoursite.com/webhooks/centry',
    customer: { email: req.body.email },
    // Optional: restrict to specific countries/providers
    allowedCountries: ['NG', 'ZA'],
    allowedProviders: ['paystack', 'onegate'],
  });

  res.redirect(session.checkoutUrl);
});`,
              },
              {
                label: 'Python',
                language: 'python',
                code: `# Django example
def create_checkout(request):
    session = client.checkout.create(
        amount=request.POST["amount"],
        currency=request.POST["currency"],
        reference=f"ORDER-{request.POST['order_id']}",
        success_url=f"https://yoursite.com/success?order={request.POST['order_id']}",
        cancel_url="https://yoursite.com/cart",
        webhook_url="https://yoursite.com/webhooks/centry",
        customer={"email": request.POST["email"]},
        # Optional: restrict to specific countries/providers
        allowed_countries=["NG", "ZA"],
    )
    return redirect(session.checkout_url)`,
              },
            ]}
          />
        </DocsSection>

        {/* Headless / Embedded Checkout */}
        <DocsSection id="headless" title="Headless / Embedded Checkout" description="Build your own checkout UI — use Centry as a payment tunnel">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Don&apos;t want to redirect customers? Build your own checkout form and call the Centry API
              directly from your frontend. Your customers never leave your site — Centry handles payment
              routing behind the scenes.
            </p>

            <div className="bg-primary/5 border border-primary/10 rounded-xl p-6">
              <h4 className="font-semibold text-foreground mb-4">The headless flow</h4>
              <div className="space-y-3">
                {[
                  { step: 'Server', desc: 'Create session with mode: "embedded" — get session_token' },
                  { step: 'Client', desc: 'GET /checkout/{token}/ — fetch amount, currency, available countries' },
                  { step: 'Client', desc: 'GET /checkout/{token}/methods/?country=ZA — get available providers & methods' },
                  { step: 'Client', desc: 'Render your own UI — country picker, method selector, email form' },
                  { step: 'Client', desc: 'POST /checkout/{token}/pay/ — initiate payment with selected provider' },
                  { step: 'Client', desc: 'Redirect to authorization_url (if requires_redirect: true)' },
                  { step: 'Client', desc: 'GET /checkout/{token}/status/ — poll until completed or failed' },
                  { step: 'Server', desc: 'Receive webhook at your webhook_url confirming payment' },
                ].map((s, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${s.step === 'Server' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {s.step}
                    </span>
                    <span className="text-sm text-foreground">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">1. Create session (server-side)</h4>
              <CodeBlock
                language="javascript"
                filename="Your server"
                code={`// Set mode: "embedded" so Centry knows you're handling the UI
const response = await fetch(CENTRY_API + "/api/v1/checkout/sessions/", {
  method: "POST",
  headers: {
    "Authorization": "Api-Key " + CENTRY_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    amount: "500.00",
    currency: "ZAR",
    reference: "TICKET-" + orderId,
    mode: "embedded",
    success_url: "https://yoursite.com/tickets/success",
    cancel_url: "https://yoursite.com/tickets",
    webhook_url: "https://yoursite.com/api/webhooks/centry",
  }),
});
const { session } = await response.json();
// Pass session.session_token to your frontend`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">2. Fetch methods + render UI (client-side)</h4>
              <CodeBlock
                language="javascript"
                filename="Your frontend (React, Vue, vanilla JS, etc.)"
                code={`const API = "https://api.getcentry.io";  // CORS-enabled, no API key needed

// Fetch session info
const info = await fetch(API + "/api/v1/checkout/" + sessionToken + "/");
const { session, countries, default_country } = await info.json();

// Fetch payment methods for the country
const methods = await fetch(
  API + "/api/v1/checkout/" + sessionToken + "/methods/?country=" + default_country
);
const { methods: providers } = await methods.json();

// Render your own UI with the providers and methods
// e.g. show cards: "OneGate — Card Payment", "Ozow — Instant EFT", etc.`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">3. Initiate payment (client-side)</h4>
              <CodeBlock
                language="javascript"
                filename="When customer clicks 'Pay'"
                code={`const result = await fetch(API + "/api/v1/checkout/" + sessionToken + "/pay/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    country: "ZA",
    provider: "onegate",        // Customer's choice
    payment_method: "credit_card",
    customer: { email: "customer@example.com" },
  }),
});
const payment = await result.json();

if (payment.requires_redirect) {
  // Redirect to provider's payment page (e.g., OneGate card form)
  window.location.href = payment.authorization_url;
} else {
  // Inline flow (e.g., mobile money STK push) — poll for status
  pollForCompletion(sessionToken);
}`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">4. Poll for completion (client-side)</h4>
              <CodeBlock
                language="javascript"
                code={`async function pollForCompletion(token) {
  const interval = setInterval(async () => {
    const res = await fetch(API + "/api/v1/checkout/" + token + "/status/");
    const { session_status, payment_status } = await res.json();

    if (session_status === "completed") {
      clearInterval(interval);
      showSuccess();  // Update your UI
    } else if (session_status === "failed" || session_status === "expired") {
      clearInterval(interval);
      showError();
    }
  }, 3000);  // Poll every 3 seconds
}`}
              />
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <Shield className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 text-sm">CORS enabled</h4>
                <p className="text-xs text-amber-600 mt-1">
                  The public checkout endpoints (<code className="text-xs">/checkout/&#123;token&#125;/</code>) accept cross-origin
                  requests from any domain. No API key is needed — the session token is the auth.
                  Your API key stays on your server.
                </p>
              </div>
            </div>
          </div>
        </DocsSection>

        {/* Embedded Widget */}
        <DocsSection id="embedded-widget" title="Embedded Widget" description="Embed checkout in your site with our JavaScript SDK">
          <div className="space-y-6">
            <CodeBlock
              language="html"
              filename="index.html"
              code={`<script src="https://checkout.getcentry.io/widget/centry-checkout.js"></script>

<script>
  CentryCheckout.open({
    sessionToken: 'tok_xyz789',
    onSuccess: function(data) {
      window.location.href = '/success';
    },
    onError: function(error) {
      console.error('Payment failed:', error);
    },
    onClose: function() {
      console.log('Checkout closed');
    }
  });
</script>`}
            />
          </div>
        </DocsSection>

        {/* SDKs */}
        <DocsSection id="sdks" title="SDKs & Libraries" description="Client libraries">
          <div className="grid sm:grid-cols-3 gap-3 mb-3">
            {[
              {
                id: 'sdk-python',
                name: 'Python',
                install: 'pip install pycentry',
                version: '0.1.1',
                status: 'beta' as const,
                note: 'Published on PyPI. Imports as `centry`.',
              },
              {
                id: 'sdk-node',
                name: 'Node.js',
                install: '—',
                version: null,
                status: 'planned' as const,
                note: 'Not yet published. Use raw fetch/axios for now.',
              },
              {
                id: 'sdk-php',
                name: 'PHP',
                install: '—',
                version: null,
                status: 'planned' as const,
                note: 'Not yet published. Use Guzzle for now.',
              },
            ].map((sdk) => (
              <div
                key={sdk.id}
                id={sdk.id}
                className="p-4 rounded-xl border border-border bg-card"
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-foreground text-sm">{sdk.name}</div>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded uppercase ${
                      sdk.status === 'beta'
                        ? 'bg-[#D4B35A]/10 text-[#D4B35A]'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {sdk.status}
                  </span>
                </div>
                <code className="text-xs text-muted-foreground font-mono block truncate">
                  {sdk.install}
                </code>
                {sdk.version && (
                  <div className="text-[10px] text-muted-foreground/60 mt-2">v{sdk.version}</div>
                )}
                <p className="text-[11px] text-muted-foreground mt-2">{sdk.note}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Until the Node and PHP SDKs ship, every endpoint is a plain HTTPS call with a{' '}
            <code className="px-1 py-0.5 bg-muted rounded font-mono">Authorization: Api-Key …</code>{' '}
            header — see the API Reference below. The Python SDK is currently{' '}
            <strong className="text-foreground">beta</strong>; pin the version in production.
          </p>
        </DocsSection>

        {/* API Reference */}
        <DocsSection id="api-reference" title="API Reference" description="Complete endpoint documentation">
          <p className="text-muted-foreground text-sm mb-4">
            Base URL: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">https://api.getcentry.io</code>
          </p>
          <div className="overflow-x-auto rounded-xl border border-border mb-4">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Endpoint</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Auth</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-blue-600 font-bold">POST</span> /checkout/sessions/</td><td className="px-4 py-2.5 text-muted-foreground">API Key</td><td className="px-4 py-2.5 text-muted-foreground">Create a checkout session</td></tr>
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-emerald-600 font-bold">GET</span> /checkout/sessions/{'{id}'}/</td><td className="px-4 py-2.5 text-muted-foreground">API Key</td><td className="px-4 py-2.5 text-muted-foreground">Get session details</td></tr>
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-emerald-600 font-bold">GET</span> /checkout/{'{token}'}/</td><td className="px-4 py-2.5 text-muted-foreground">Session Token</td><td className="px-4 py-2.5 text-muted-foreground">Get checkout info (public)</td></tr>
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-emerald-600 font-bold">GET</span> /checkout/{'{token}'}/methods/</td><td className="px-4 py-2.5 text-muted-foreground">Session Token</td><td className="px-4 py-2.5 text-muted-foreground">List payment methods for a country</td></tr>
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-blue-600 font-bold">POST</span> /checkout/{'{token}'}/pay/</td><td className="px-4 py-2.5 text-muted-foreground">Session Token</td><td className="px-4 py-2.5 text-muted-foreground">Initiate a payment</td></tr>
                <tr className="hover:bg-muted/30"><td className="px-4 py-2.5 font-mono"><span className="text-emerald-600 font-bold">GET</span> /checkout/{'{token}'}/status/</td><td className="px-4 py-2.5 text-muted-foreground">Session Token</td><td className="px-4 py-2.5 text-muted-foreground">Poll payment status</td></tr>
              </tbody>
            </table>
          </div>
        </DocsSection>

        {/* Create Session */}
        <DocsSection id="create-session" title="Create Session" description="Create a new checkout session for payment collection">
          <div className="space-y-6">
            <Endpoint method="POST" path="/api/v1/checkout/sessions/" description="Create a new checkout session. Requires API key authentication." />

            <div className="p-4 rounded-md bg-primary/5 border border-primary/10">
              <h4 className="text-sm font-semibold text-foreground mb-1">Send an Idempotency-Key</h4>
              <p className="text-xs text-muted-foreground">
                Add{' '}
                <code className="px-1 py-0.5 bg-muted rounded font-mono">Idempotency-Key: &lt;uuid&gt;</code>{' '}
                on every create-session call. If the same key reaches us twice (network retry,
                lambda re-invocation), we replay the original response instead of opening a
                second session. UUIDv4 is the safe default.
              </p>
            </div>

            <ParamTable
              params={[
                { name: 'amount', type: 'string', required: true, description: 'Payment amount (e.g., "5000.00")' },
                { name: 'currency', type: 'string', required: true, description: 'ISO 4217 currency code (NGN, KES, ZAR, UGX, GHS, TZS, RWF)' },
                { name: 'reference', type: 'string', required: true, description: 'Your unique order/invoice reference (max 100 chars, unique per org)' },
                { name: 'success_url', type: 'string', required: true, description: 'Redirect URL after successful payment' },
                { name: 'cancel_url', type: 'string', required: true, description: 'Redirect URL if customer cancels' },
                { name: 'webhook_url', type: 'string', required: false, description: 'URL to receive webhook notifications' },
                { name: 'description', type: 'string', required: false, description: 'Payment description shown to customer' },
                { name: 'customer', type: 'object', required: false, description: 'Customer info: {email, phone, name}. Email required for card payments.' },
                { name: 'metadata', type: 'object', required: false, description: 'Custom key-value pairs returned in webhooks' },
                { name: 'allowed_countries', type: 'string[]', required: false, description: 'Restrict to specific countries (e.g., ["NG", "ZA"]). Omit for all enabled countries.' },
                { name: 'allowed_providers', type: 'string[]', required: false, description: 'Restrict to specific providers (e.g., ["paystack", "onegate"]). Omit for all enabled providers.' },
                { name: 'expiry_minutes', type: 'integer', required: false, description: 'Session timeout in minutes (5-1440, default 60)' },
              ]}
            />
          </div>
        </DocsSection>

        {/* Get Session */}
        <DocsSection id="get-session" title="Get Session" description="Retrieve a checkout session by ID">
          <div className="space-y-6">
            <Endpoint method="GET" path="/api/v1/checkout/sessions/{session_id}/" description="Retrieve details of an existing checkout session. Requires API key." />
            <CodeBlock
              language="json"
              filename="Response"
              code={`{
  "id": "cs_1a2b3c4d5e6f",
  "reference": "ORDER-12345",
  "amount": "5000.00",
  "currency": "NGN",
  "status": "completed",
  "payment": {
    "provider": "paystack",
    "method": "card",
    "provider_reference": "PAY_xyz789",
    "status": "success"
  },
  "customer": {
    "email": "customer@example.com"
  },
  "metadata": {"order_id": "12345"},
  "created_at": "2024-01-15T12:00:00Z",
  "completed_at": "2024-01-15T12:05:00Z"
}`}
            />
          </div>
        </DocsSection>

        {/* Payment Methods */}
        <DocsSection id="payment-methods" title="Get Payment Methods" description="List available payment providers and methods for a country">
          <div className="space-y-6">
            <Endpoint method="GET" path="/api/v1/checkout/{session_token}/methods/?country=ZA" description="Returns available providers and methods for a country. Uses session token (no API key needed)." />
            <p className="text-muted-foreground text-sm">
              The checkout page calls this endpoint when the customer selects their country. It returns all
              enabled providers for that country, with their supported payment methods.
            </p>
            <CodeBlock
              language="json"
              filename="Response — South Africa"
              code={`{
  "country": "ZA",
  "currency": "ZAR",
  "methods": [
    {
      "provider": "onegate",
      "name": "OneGate",
      "icon": "onegate.svg",
      "color": "#E94E1B",
      "requires_redirect": true,
      "supports_inline": false,
      "methods": [
        {"code": "credit_card", "name": "Card Payment", "description": "Pay with Visa, Mastercard (3D Secure)"},
        {"code": "eft", "name": "Instant EFT", "description": "Pay via instant bank transfer"},
        {"code": "ott_voucher", "name": "OTT Voucher", "description": "Pay with OTT voucher"}
      ]
    },
    {
      "provider": "ozow",
      "name": "Ozow",
      "icon": "ozow.svg",
      "color": "#3EC7F4",
      "requires_redirect": true,
      "methods": [
        {"code": "instant_eft", "name": "Instant EFT (Ozow)", "description": "Pay via instant bank transfer"}
      ]
    },
  ]
}`}
            />
          </div>
        </DocsSection>

        {/* Initiate Payment */}
        <DocsSection id="initiate-payment" title="Initiate Payment" description="Start a payment with a specific provider and method">
          <div className="space-y-6">
            <Endpoint method="POST" path="/api/v1/checkout/{session_token}/pay/" description="Initiates payment with the selected provider. Returns a redirect URL or inline payment data." />
            <ParamTable
              params={[
                { name: 'country', type: 'string', required: true, description: 'ISO country code (e.g., "ZA", "NG")' },
                { name: 'provider', type: 'string', required: true, description: 'Provider code (e.g., "onegate", "ozow_legacy")' },
                { name: 'payment_method', type: 'string', required: true, description: 'Method code from the methods endpoint (e.g., "credit_card", "eft", "card")' },
                { name: 'customer', type: 'object', required: false, description: '{email, phone} — email required for card payments' },
              ]}
            />
            <TabbedCodeBlock
              tabs={[
                {
                  label: 'Request',
                  language: 'json',
                  code: `{
  "country": "ZA",
  "provider": "onegate",
  "payment_method": "credit_card",
  "customer": {
    "email": "customer@example.com"
  }
}`,
                },
                {
                  label: 'Response',
                  language: 'json',
                  code: `{
  "success": true,
  "payment": {
    "id": "pay_abc123",
    "status": "pending",
    "redirect_url": "https://payments.onegate.co.za/pay/hosted?payment_key=...",
    "requires_redirect": true,
    "inline_data": null
  }
}`,
                },
              ]}
            />
          </div>
        </DocsSection>

        {/* Check Status */}
        <DocsSection id="check-status" title="Check Status" description="Poll for payment completion">
          <div className="space-y-6">
            <Endpoint method="GET" path="/api/v1/checkout/{session_token}/status/" description="Check if the payment has completed. Use for polling after redirect." />
            <CodeBlock
              language="json"
              filename="Response"
              code={`{
  "session_status": "completed",
  "payment_status": "success",
  "redirect_url": "https://yoursite.com/success?ref=ORDER-12345"
}`}
            />
            <p className="text-muted-foreground text-sm">
              <strong>Statuses:</strong> <code className="text-xs bg-muted px-1 py-0.5 rounded">pending</code> <ArrowRight className="inline size-3" /> <code className="text-xs bg-muted px-1 py-0.5 rounded">processing</code> <ArrowRight className="inline size-3" /> <code className="text-xs bg-emerald-500/10 text-emerald-600 px-1 py-0.5 rounded">completed</code> | <code className="text-xs bg-red-500/10 text-red-600 px-1 py-0.5 rounded">failed</code> | <code className="text-xs bg-muted px-1 py-0.5 rounded">expired</code>
            </p>
          </div>
        </DocsSection>

        {/* Providers & Countries */}
        <DocsSection id="providers" title="Providers & Countries" description="Available payment providers per country">
          <p className="text-muted-foreground text-sm mb-6">
            Each country has specific providers available. Enable the ones you need in your dashboard.
            Customers see only the providers you have enabled for their country.
          </p>

          <div className="space-y-4">
            {[
              {
                country: 'South Africa', code: 'ZA', currency: 'ZAR',
                providers: [
                  { name: 'OneGate', methods: 'Cards (3D Secure), Instant EFT, OTT Vouchers, BluVoucher' },
                  { name: 'Ozow', methods: 'Instant EFT' },
                ],
              },
              {
                country: 'Nigeria', code: 'NG', currency: 'NGN',
                providers: [
                  { name: 'Paystack', methods: 'Cards, Bank Transfer, USSD, QR Code, Mobile Money' },
                ],
              },
              {
                country: 'Ghana', code: 'GH', currency: 'GHS',
                providers: [
                  { name: 'Paystack', methods: 'Cards, Mobile Money' },
                ],
              },
              {
                country: 'Kenya', code: 'KE', currency: 'KES',
                providers: [
                  { name: 'Paystack', methods: 'Cards' },
                  { name: 'Airtel', methods: 'Airtel Money' },
                ],
              },
              {
                country: 'Uganda', code: 'UG', currency: 'UGX',
                providers: [
                  { name: 'MTN', methods: 'MTN MoMo' },
                  { name: 'Airtel', methods: 'Airtel Money' },
                ],
              },
              {
                country: 'Tanzania', code: 'TZ', currency: 'TZS',
                providers: [
                  { name: 'Airtel', methods: 'Airtel Money' },
                ],
              },
              {
                country: 'Rwanda', code: 'RW', currency: 'RWF',
                providers: [
                  { name: 'MTN', methods: 'MTN MoMo' },
                ],
              },
            ].map((c) => (
              <div key={c.code} className="rounded-xl border border-border overflow-hidden">
                <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground text-sm">{c.country}</span>
                    <code className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{c.code}</code>
                  </div>
                  <code className="text-xs font-mono text-muted-foreground">{c.currency}</code>
                </div>
                <div className="divide-y divide-border">
                  {c.providers.map((p) => (
                    <div key={p.name} className="px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{p.methods}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DocsSection>

        {/* Webhooks */}
        <DocsSection id="webhooks" title="Webhooks" description="Receive real-time payment notifications">
          <div className="space-y-6">
            <div id="webhook-events">
              <h4 className="font-semibold text-foreground mb-3">Events</h4>
              <div className="space-y-2">
                {[
                  { event: 'session.completed', desc: 'Payment was successful' },
                  { event: 'session.failed', desc: 'Payment failed' },
                  { event: 'session.expired', desc: 'Session expired without payment' },
                  { event: 'payment.success', desc: 'Individual payment attempt succeeded' },
                  { event: 'payment.failed', desc: 'Individual payment attempt failed' },
                ].map((e) => (
                  <div key={e.event} className="p-3 rounded-lg border border-border flex items-center justify-between">
                    <code className="text-sm font-mono text-primary">{e.event}</code>
                    <span className="text-xs text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Webhook envelope</h4>
              <CodeBlock
                language="json"
                filename="POST to your webhook_url"
                code={`{
  "id": "evt_550e8400-...",
  "event": "session.completed",
  "created": 1713090900,
  "livemode": true,
  "data": {
    "session": {
      "id": "cs_abc123",
      "reference": "ORDER-12345",
      "amount": "5000.00",
      "currency": "NGN",
      "status": "completed"
    },
    "payment": {
      "provider": "paystack",
      "method": "card",
      "provider_reference": "PAY_xyz789",
      "status": "success"
    }
  }
}`}
              />
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Headers:</strong>{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">Centry-Signature: t=&lt;unix&gt;,v1=&lt;hex&gt;</code>{' '}
                (HMAC-SHA256 with replay window),{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">X-Centry-Event</code>
              </p>
              <p>
                <strong>Retries:</strong> on non-2xx or timeout we retry at <strong>+1m, +5m,
                +30m, +2h, +24h</strong> (6 attempts total). Centry expects a 2xx within ~10s —
                process async if your handler is slow.
              </p>
              <p>
                <strong>URL safety:</strong> webhook URLs that resolve to private (RFC1918),
                loopback, link-local, or cloud-metadata IPs (e.g.{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">169.254.169.254</code>)
                are rejected at write time and re-checked at send time. Use https in production.
              </p>
              <p>
                <strong>Replay + test:</strong> send a{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">webhook.test</code> event
                from the merchant dashboard before going live, and replay any past delivery
                from its Webhooks tab.
              </p>
            </div>

            <div id="webhook-verification">
              <h4 className="font-semibold text-foreground mb-3">Signature verification</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Three checks, in order: parse the header, reject if{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">t</code> is more than 5
                minutes off (replay guard), then constant-time compare your recomputed HMAC to{' '}
                <code className="text-xs bg-muted px-1 py-0.5 rounded">v1</code>. Use the{' '}
                <strong>raw request body bytes</strong> — re-encoding the JSON will break the
                signature.
              </p>
              <TabbedCodeBlock
                tabs={[
                  {
                    label: 'Python',
                    language: 'python',
                    code: `import hmac, hashlib, time

def verify_centry_webhook(raw_body: bytes, header_value: str, secret: str,
                          tolerance: int = 300) -> bool:
    parts = dict(p.split("=", 1) for p in header_value.split(",") if "=" in p)
    try:
        ts = int(parts.get("t", ""))
    except ValueError:
        return False
    if abs(time.time() - ts) > tolerance:
        return False
    expected = hmac.new(
        secret.encode(),
        f"{ts}.".encode() + raw_body,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, parts.get("v1", ""))

# Django / Flask handler
body = request.body  # raw bytes — never request.json before verifying
header = request.headers.get("Centry-Signature", "")
if not verify_centry_webhook(body, header, WEBHOOK_SECRET):
    return HttpResponseBadRequest("invalid signature")

event = json.loads(body)
if event["event"] == "session.completed":
    fulfill_order(event["data"]["session"]["reference"])`,
                  },
                  {
                    label: 'Node.js',
                    language: 'javascript',
                    code: `const crypto = require('crypto');

function verifyCentryWebhook(rawBody, headerValue, secret, toleranceSec = 300) {
  const parts = Object.fromEntries(
    headerValue.split(',').map(p => p.split('=').map(s => s.trim()))
  );
  const t = parseInt(parts.t, 10);
  if (!t || Math.abs(Date.now() / 1000 - t) > toleranceSec) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${t}.\${rawBody}\`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(parts.v1 || '', 'hex'),
  );
}

// IMPORTANT: use express.raw so req.body stays as a Buffer
app.post('/webhooks/centry', express.raw({ type: 'application/json' }), (req, res) => {
  const ok = verifyCentryWebhook(
    req.body.toString('utf8'),
    req.get('Centry-Signature'),
    process.env.CENTRY_WEBHOOK_SECRET,
  );
  if (!ok) return res.status(400).send('invalid signature');
  const event = JSON.parse(req.body.toString('utf8'));
  if (event.event === 'session.completed') {
    fulfillOrder(event.data.session.reference);
  }
  res.status(200).send();
});`,
                  },
                ]}
              />
            </div>
          </div>
        </DocsSection>

        {/* Payouts */}
        <DocsSection id="payouts" title="Payouts API" description="Send money to recipients via provider-direct endpoints">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm leading-relaxed">
              Payouts are sent directly via payment provider APIs. Each provider has its own payout endpoint
              with provider-specific parameters. Configure your provider account in the dashboard, then use
              the provider endpoints below.
            </p>

            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Provider</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Countries</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Payout Methods</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Endpoint</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-xs">
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">OneGate</td>
                    <td className="px-4 py-3 text-muted-foreground">ZA</td>
                    <td className="px-4 py-3 text-muted-foreground">FNB eWallet, Standard Bank Instant Money, OTT Voucher, 48+ methods</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">POST /payments/api/onegate/payouts/create/</td>
                  </tr>
                  <tr className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">Ozow</td>
                    <td className="px-4 py-3 text-muted-foreground">ZA</td>
                    <td className="px-4 py-3 text-muted-foreground">RTC, SVSS (bank-to-bank)</td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">POST /payments/api/ozow/payouts/create/</td>
                  </tr>
                  {/* Paystack transfers — coming soon */}
                </tbody>
              </table>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">OneGate payout example</h4>
              <CodeBlock
                language="bash"
                code={`curl -X POST https://api.getcentry.io/payments/api/onegate/payouts/create/ \\
  -H "Authorization: Api-Key cen_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "payout_method_slug": "fnb-ewallet",
    "reference": "PAYOUT-001",
    "amount": "250.00",
    "first_name": "John",
    "surname": "Doe",
    "mobile": "0821234567",
    "id_number": "9001015009087",
    "id_type": "rsa_id",
    "nationality": "ZA",
    "country_of_issue": "ZA"
  }'`}
              />
            </div>
          </div>
        </DocsSection>

        {/* OpenAPI / Swagger */}
        <DocsSection id="openapi" title="OpenAPI / Swagger" description="Interactive API reference with try-it-out">
          <div className="space-y-4">
            <p className="text-muted-foreground text-sm leading-relaxed">
              The full API schema is available as OpenAPI 3.0. Use Swagger UI to explore
              endpoints, view request/response schemas, and test API calls directly from the browser.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <a
                href={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/docs/'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="size-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-3">
                  <Zap className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">Swagger UI</h3>
                <p className="text-sm text-muted-foreground">Interactive explorer with try-it-out</p>
                <code className="text-xs text-muted-foreground font-mono mt-2 block">/api/docs/</code>
              </a>

              <a
                href={(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') + '/api/redoc/'}
                target="_blank"
                rel="noopener noreferrer"
                className="p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                <div className="size-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center mb-3">
                  <Code2 className="size-5" />
                </div>
                <h3 className="font-semibold text-foreground mb-1">ReDoc</h3>
                <p className="text-sm text-muted-foreground">Clean, readable API reference</p>
                <code className="text-xs text-muted-foreground font-mono mt-2 block">/api/redoc/</code>
              </a>
            </div>

            <div className="bg-muted/50 border border-border rounded-xl p-4 text-sm text-muted-foreground">
              <strong>Tags in Swagger:</strong> Checkout, Checkout (Public), OneGate, Ozow, Banking, Payments, Wallet, ERP, and more.
              Each tag groups related endpoints with descriptions and examples.
            </div>
          </div>
        </DocsSection>

        {/* Error Codes */}
        <DocsSection id="errors" title="Error Codes" description="API error response reference">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Status</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { code: 'invalid_request', status: '400', desc: 'The request body is malformed or missing required fields' },
                  { code: 'authentication_failed', status: '401', desc: 'Invalid or missing API key' },
                  { code: 'forbidden', status: '403', desc: 'API key does not have permission for this action' },
                  { code: 'not_found', status: '404', desc: 'The requested resource does not exist' },
                  { code: 'duplicate_reference', status: '409', desc: 'A session with this reference already exists' },
                  { code: 'country_not_enabled', status: '400', desc: 'No providers configured for the selected country' },
                  { code: 'provider_not_enabled', status: '400', desc: 'Provider not enabled for this country in your config' },
                  { code: 'rate_limit_exceeded', status: '429', desc: 'Too many requests — slow down' },
                  { code: 'provider_error', status: '502', desc: 'The payment provider returned an error' },
                  { code: 'internal_error', status: '500', desc: 'Something went wrong on our end' },
                ].map((err) => (
                  <tr key={err.code} className="hover:bg-muted/30">
                    <td className="px-4 py-3"><code className="text-xs font-mono text-destructive">{err.code}</code></td>
                    <td className="px-4 py-3"><span className="text-xs font-mono text-muted-foreground">{err.status}</span></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{err.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DocsSection>

        {/* Rate Limits */}
        <DocsSection id="rate-limits" title="Rate Limits" description="API request limits">
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b border-border">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Plan</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Requests/min</th>
                    <th className="text-left px-4 py-3 font-semibold text-foreground">Sessions/day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-foreground font-medium">Sandbox</td><td className="px-4 py-3 text-muted-foreground">60</td><td className="px-4 py-3 text-muted-foreground">100</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-foreground font-medium">Starter</td><td className="px-4 py-3 text-muted-foreground">120</td><td className="px-4 py-3 text-muted-foreground">1,000</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-foreground font-medium">Business</td><td className="px-4 py-3 text-muted-foreground">300</td><td className="px-4 py-3 text-muted-foreground">10,000</td></tr>
                  <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-foreground font-medium">Enterprise</td><td className="px-4 py-3 text-muted-foreground">Custom</td><td className="px-4 py-3 text-muted-foreground">Unlimited</td></tr>
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Rate limit headers: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">X-RateLimit-Remaining</code>, <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">X-RateLimit-Reset</code>
            </p>
          </div>
        </DocsSection>

        {/* Testing & Sandbox */}
        <DocsSection id="testing" title="Testing & Sandbox" description="Test your integration before going live">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Use the sandbox environment to test without processing real payments.
              Sandbox API keys start with <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">cen_test_</code>.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sandbox</div>
                <code className="text-xs font-mono text-foreground">https://sandbox.getcentry.io</code>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Production</div>
                <code className="text-xs font-mono text-foreground">https://api.getcentry.io</code>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Test card numbers</h4>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Provider</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Card</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-xs text-muted-foreground">Paystack</td><td className="px-4 py-3 font-mono text-xs">4084 0840 8408 4081</td><td className="px-4 py-3 text-emerald-600 text-xs font-medium">Success</td></tr>
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-xs text-muted-foreground">Paystack</td><td className="px-4 py-3 font-mono text-xs">4084 0840 8408 4099</td><td className="px-4 py-3 text-red-600 text-xs font-medium">Declined</td></tr>
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 text-xs text-muted-foreground">OneGate</td><td className="px-4 py-3 font-mono text-xs">4229 9899 9900 0012</td><td className="px-4 py-3 text-emerald-600 text-xs font-medium">Success (3DS code: test123)</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use any future expiry date and any 3-digit CVV.</p>
            </div>
          </div>
        </DocsSection>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Need help?{' '}
              <a href="mailto:support@getcentry.app" className="text-primary hover:underline">support@getcentry.app</a>
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'} className="hover:text-foreground" target="_blank" rel="noopener noreferrer">Website</a>
              <a href="/auth/login" className="hover:text-foreground">Dashboard</a>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}
