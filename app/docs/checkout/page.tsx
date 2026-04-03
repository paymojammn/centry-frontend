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
            One integration, all payment methods. Centry Checkout routes payments to the right
            provider across 10+ African countries.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-10">
          <DocsCard icon={<Rocket className="size-5" />} title="Quick Start" description="5 min setup" href="#quickstart" />
          <DocsCard icon={<Package className="size-5" />} title="SDKs" description="Python, Node, PHP" href="#sdks" />
          <DocsCard icon={<Code2 className="size-5" />} title="API Reference" description="Full endpoints" href="#api-reference" />
          <DocsCard icon={<Webhook className="size-5" />} title="Webhooks" description="Payment events" href="#webhooks" />
        </div>

        {/* Introduction */}
        <DocsSection id="introduction" title="Introduction" description="How Centry Checkout works">
          <p className="text-muted-foreground leading-relaxed mb-6">
            Centry Checkout provides a unified API for accepting payments across multiple
            African countries and payment providers. Integrate once, accept payments everywhere.
          </p>

          <div className="bg-primary/5 border border-primary/10 rounded-xl p-6 mb-6">
            <h4 className="font-semibold text-foreground mb-4">The checkout flow</h4>
            <div className="space-y-3">
              {[
                'Your server creates a checkout session via our API',
                'Redirect your customer to the checkout URL (or embed the widget)',
                'Customer selects their country and payment method',
                'We route the payment to the appropriate provider',
                'You receive a webhook when the payment completes',
              ].map((step, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm text-foreground">{step}</span>
                </div>
              ))}
            </div>
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
              <h4 className="font-semibold text-foreground mb-3">2. Create a checkout session</h4>
              <TabbedCodeBlock
                tabs={[
                  {
                    label: 'cURL',
                    language: 'bash',
                    code: `curl -X POST https://api.centry.io/api/v1/checkout/sessions/ \\
  -H "Authorization: Api-Key cen_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5000.00",
    "currency": "NGN",
    "reference": "ORDER-12345",
    "success_url": "https://yoursite.com/success",
    "cancel_url": "https://yoursite.com/cancel",
    "webhook_url": "https://yoursite.com/webhooks/centry"
  }'`,
                  },
                  {
                    label: 'Python',
                    language: 'python',
                    code: `import centry

client = centry.Client(api_key="cen_your_api_key")

session = client.checkout.create(
    amount="5000.00",
    currency="NGN",
    reference="ORDER-12345",
    success_url="https://yoursite.com/success",
    cancel_url="https://yoursite.com/cancel",
    webhook_url="https://yoursite.com/webhooks/centry",
)

print(session.checkout_url)`,
                  },
                  {
                    label: 'Node.js',
                    language: 'javascript',
                    code: `const Centry = require('@centry/node');

const centry = new Centry('cen_your_api_key');

const session = await centry.checkout.create({
  amount: '5000.00',
  currency: 'NGN',
  reference: 'ORDER-12345',
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
  webhookUrl: 'https://yoursite.com/webhooks/centry',
});

console.log(session.checkoutUrl);`,
                  },
                  {
                    label: 'PHP',
                    language: 'php',
                    code: `<?php
use Centry\\CentryClient;

$centry = new CentryClient('cen_your_api_key');

$session = $centry->checkout->create([
    'amount' => '5000.00',
    'currency' => 'NGN',
    'reference' => 'ORDER-12345',
    'success_url' => 'https://yoursite.com/success',
    'cancel_url' => 'https://yoursite.com/cancel',
    'webhook_url' => 'https://yoursite.com/webhooks/centry',
]);

echo $session->checkout_url;`,
                  },
                ]}
              />
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">3. Response</h4>
              <CodeBlock
                language="json"
                filename="Response — 201 Created"
                code={`{
  "id": "cs_abc123",
  "session_token": "tok_xyz789",
  "checkout_url": "https://checkout.centry.io/checkout/tok_xyz789",
  "status": "pending",
  "expires_at": "2024-01-15T12:00:00Z"
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
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex gap-3">
              <Shield className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-700 text-sm">Keep your API key secure</h4>
                <p className="text-xs text-amber-600 mt-1">
                  Never expose your API key in client-side code. Use environment variables on your server.
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
    amount: '5000.00',
    currency: 'NGN',
    reference: 'ORDER-' + req.body.orderId,
    successUrl: 'https://yoursite.com/success?order=' + req.body.orderId,
    cancelUrl: 'https://yoursite.com/cart',
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
        amount="5000.00",
        currency="NGN",
        reference=f"ORDER-{request.POST['order_id']}",
        success_url=f"https://yoursite.com/success?order={request.POST['order_id']}",
        cancel_url="https://yoursite.com/cart",
    )
    return redirect(session.checkout_url)`,
              },
            ]}
          />
        </DocsSection>

        {/* Embedded Widget */}
        <DocsSection id="embedded-widget" title="Embedded Widget" description="Embed checkout in your site with our JavaScript SDK">
          <div className="space-y-6">
            <CodeBlock
              language="html"
              filename="index.html"
              code={`<script src="https://checkout.centry.io/widget/centry-checkout.js"></script>

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
        <DocsSection id="sdks" title="SDKs & Libraries" description="Official client libraries">
          <div className="grid sm:grid-cols-3 gap-3 mb-6">
            {[
              { id: 'sdk-python', name: 'Python', install: 'pip install centry', version: '1.0.0' },
              { id: 'sdk-node', name: 'Node.js', install: 'npm install @centry/node', version: '1.0.0' },
              { id: 'sdk-php', name: 'PHP', install: 'composer require centry/centry-php', version: '1.0.0' },
            ].map((sdk) => (
              <div key={sdk.id} id={sdk.id} className="p-4 rounded-xl border border-border bg-card">
                <div className="font-semibold text-foreground text-sm mb-1">{sdk.name}</div>
                <code className="text-xs text-muted-foreground font-mono">{sdk.install}</code>
                <div className="text-[10px] text-muted-foreground/60 mt-2">v{sdk.version}</div>
              </div>
            ))}
          </div>

          <TabbedCodeBlock
            tabs={[
              {
                label: 'Python',
                language: 'python',
                code: `import centry

client = centry.Client(api_key="cen_your_api_key")

# Create a checkout session
session = client.checkout.create(
    amount="5000.00",
    currency="NGN",
    reference="ORDER-12345",
    success_url="https://yoursite.com/success",
    cancel_url="https://yoursite.com/cancel",
)

# Retrieve a session
session = client.checkout.get("cs_abc123")

# List sessions
sessions = client.checkout.list(status="completed")`,
              },
              {
                label: 'Node.js',
                language: 'javascript',
                code: `const Centry = require('@centry/node');
const centry = new Centry('cen_your_api_key');

// Create a checkout session
const session = await centry.checkout.create({
  amount: '5000.00',
  currency: 'NGN',
  reference: 'ORDER-12345',
  successUrl: 'https://yoursite.com/success',
  cancelUrl: 'https://yoursite.com/cancel',
});

// Retrieve a session
const session = await centry.checkout.get('cs_abc123');

// List sessions
const sessions = await centry.checkout.list({ status: 'completed' });`,
              },
              {
                label: 'PHP',
                language: 'php',
                code: `<?php
use Centry\\CentryClient;
$centry = new CentryClient('cen_your_api_key');

// Create a checkout session
$session = $centry->checkout->create([
    'amount' => '5000.00',
    'currency' => 'NGN',
    'reference' => 'ORDER-12345',
    'success_url' => 'https://yoursite.com/success',
    'cancel_url' => 'https://yoursite.com/cancel',
]);

// Retrieve a session
$session = $centry->checkout->get('cs_abc123');

// List sessions
$sessions = $centry->checkout->list(['status' => 'completed']);`,
              },
            ]}
          />
        </DocsSection>

        {/* API Reference */}
        <DocsSection id="api-reference" title="API Reference" description="Complete API documentation">
          <p className="text-muted-foreground text-sm mb-4">
            Base URL: <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">https://api.centry.io</code>
          </p>
        </DocsSection>

        {/* Create Session */}
        <DocsSection id="create-session" title="Create Session" description="Create a new checkout session">
          <div className="space-y-6">
            <Endpoint method="POST" path="/api/v1/checkout/sessions/" description="Create a new checkout session for payment collection" />
            <ParamTable
              params={[
                { name: 'amount', type: 'string', required: true, description: 'Payment amount (e.g., "5000.00")' },
                { name: 'currency', type: 'string', required: true, description: 'ISO 4217 currency code (NGN, KES, ZAR, UGX, GHS, etc.)' },
                { name: 'reference', type: 'string', required: true, description: 'Your unique order/invoice reference' },
                { name: 'success_url', type: 'string', required: true, description: 'Redirect URL after successful payment' },
                { name: 'cancel_url', type: 'string', required: true, description: 'Redirect URL if customer cancels' },
                { name: 'webhook_url', type: 'string', required: false, description: 'URL to receive webhook notifications' },
                { name: 'description', type: 'string', required: false, description: 'Payment description shown to customer' },
                { name: 'customer_email', type: 'string', required: false, description: 'Pre-fill customer email' },
                { name: 'customer_phone', type: 'string', required: false, description: 'Pre-fill customer phone (for mobile money)' },
                { name: 'allowed_countries', type: 'string[]', required: false, description: 'Restrict to specific countries (e.g., ["NG", "GH"])' },
                { name: 'metadata', type: 'object', required: false, description: 'Custom key-value pairs (returned in webhooks)' },
              ]}
            />
          </div>
        </DocsSection>

        {/* Get Session */}
        <DocsSection id="get-session" title="Get Session" description="Retrieve a checkout session">
          <div className="space-y-6">
            <Endpoint method="GET" path="/api/v1/checkout/sessions/{session_id}/" description="Retrieve details of an existing checkout session" />
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
    "provider_reference": "PAY_xyz789"
  },
  "created_at": "2024-01-15T12:00:00Z",
  "completed_at": "2024-01-15T12:05:00Z"
}`}
            />
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
                  { event: 'session.refunded', desc: 'Payment was refunded' },
                ].map((e) => (
                  <div key={e.event} className="p-3 rounded-lg border border-border flex items-center justify-between">
                    <code className="text-sm font-mono text-primary">{e.event}</code>
                    <span className="text-xs text-muted-foreground">{e.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div id="webhook-verification">
              <h4 className="font-semibold text-foreground mb-3">Signature Verification</h4>
              <TabbedCodeBlock
                tabs={[
                  {
                    label: 'Python',
                    language: 'python',
                    code: `import hmac, hashlib

def verify_webhook(payload, signature, secret):
    expected = hmac.new(
        secret.encode(), payload.encode(), hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# In your webhook handler
signature = request.headers.get('X-Centry-Signature')
if not verify_webhook(request.body, signature, WEBHOOK_SECRET):
    return Response(status=401)

event = request.json()
if event['event'] == 'session.completed':
    fulfill_order(event['data']['reference'])`,
                  },
                  {
                    label: 'Node.js',
                    language: 'javascript',
                    code: `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expected), Buffer.from(signature)
  );
}

// Express middleware
app.post('/webhooks/centry', (req, res) => {
  const sig = req.headers['x-centry-signature'];
  if (!verifyWebhook(req.body, sig, WEBHOOK_SECRET)) {
    return res.status(401).send('Invalid signature');
  }

  const { event, data } = req.body;
  if (event === 'session.completed') {
    fulfillOrder(data.reference);
  }
  res.json({ received: true });
});`,
                  },
                ]}
              />
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

          <div className="mt-4">
            <CodeBlock
              language="json"
              filename="Error response format"
              code={`{
  "error": {
    "code": "invalid_request",
    "message": "The 'amount' field is required.",
    "param": "amount"
  }
}`}
            />
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
              Rate limit headers are included in every response:
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-1">X-RateLimit-Remaining</code>,
              <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono ml-1">X-RateLimit-Reset</code>
            </p>
          </div>
        </DocsSection>

        {/* Testing & Sandbox */}
        <DocsSection id="testing" title="Testing & Sandbox" description="Test your integration before going live">
          <div className="space-y-6">
            <p className="text-muted-foreground text-sm">
              Use the sandbox environment to test your integration without processing real payments.
              Sandbox API keys start with <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">cen_test_</code>.
            </p>

            <div className="grid sm:grid-cols-2 gap-3">
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Sandbox</div>
                <code className="text-xs font-mono text-foreground">https://sandbox.centry.io</code>
              </div>
              <div className="p-4 rounded-xl border border-border bg-card">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Production</div>
                <code className="text-xs font-mono text-foreground">https://api.centry.io</code>
              </div>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-3">Test card numbers</h4>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Card</th>
                      <th className="text-left px-4 py-3 font-semibold text-foreground">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-mono text-xs">4084 0840 8408 4081</td><td className="px-4 py-3 text-emerald-600 text-xs font-medium">Successful payment</td></tr>
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-mono text-xs">4084 0840 8408 4099</td><td className="px-4 py-3 text-red-600 text-xs font-medium">Declined</td></tr>
                    <tr className="hover:bg-muted/30"><td className="px-4 py-3 font-mono text-xs">5060 6666 6666 6666 666</td><td className="px-4 py-3 text-emerald-600 text-xs font-medium">Verve card success</td></tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-2">Use any future expiry date and any 3-digit CVV.</p>
            </div>
          </div>
        </DocsSection>

        {/* Countries */}
        <DocsSection id="countries" title="Supported Countries" description="Available countries and payment methods">
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Country</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Currency</th>
                  <th className="text-left px-4 py-3 font-semibold text-foreground">Methods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[
                  { country: 'Nigeria', code: 'NGN', methods: 'Cards, Bank Transfer, USSD' },
                  { country: 'Ghana', code: 'GHS', methods: 'Cards, Mobile Money' },
                  { country: 'South Africa', code: 'ZAR', methods: 'Cards, Instant EFT' },
                  { country: 'Kenya', code: 'KES', methods: 'Cards, M-Pesa' },
                  { country: 'Uganda', code: 'UGX', methods: 'Mobile Money, Bank Transfer' },
                  { country: 'Tanzania', code: 'TZS', methods: 'Mobile Money' },
                  { country: 'Rwanda', code: 'RWF', methods: 'Mobile Money' },
                ].map((c) => (
                  <tr key={c.code} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{c.country}</td>
                    <td className="px-4 py-3"><code className="text-xs font-mono text-muted-foreground">{c.code}</code></td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.methods}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
