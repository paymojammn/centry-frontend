import { Metadata } from 'next';
import {
  DocsLayout,
  DocsSection,
  DocsCard,
  Endpoint,
  ParamTable,
} from '@/components/docs/docs-layout';
import { CodeBlock } from '@/components/docs/code-block';
import {
  Code2,
  CreditCard,
  Globe,
  Key,
  Rocket,
  Shield,
  Webhook,
  Zap,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Checkout API Documentation',
  description: 'Accept payments across Africa with Centry Checkout',
};

export default function CheckoutDocsPage() {
  return (
    <DocsLayout>
      <div className="px-6 lg:px-12 py-12 max-w-4xl">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-4">
            <Zap className="size-4" />
            Checkout API
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Accept payments across Africa
          </h1>
          <p className="text-xl text-gray-600 leading-relaxed">
            Centry Checkout is a payment orchestration platform that allows you to accept
            payments via multiple providers including Paystack, Netcash, MTN MoMo, and Airtel Money.
            One integration, all payment methods.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          <DocsCard
            icon={<Rocket className="size-5" />}
            title="Quick Start"
            description="Get up and running in 5 minutes"
            href="#quickstart"
          />
          <DocsCard
            icon={<Code2 className="size-5" />}
            title="API Reference"
            description="Explore the full API"
            href="#api-reference"
          />
          <DocsCard
            icon={<Webhook className="size-5" />}
            title="Webhooks"
            description="Handle payment events"
            href="#webhooks"
          />
        </div>

        {/* Introduction */}
        <DocsSection
          id="introduction"
          title="Introduction"
          description="How Centry Checkout works"
        >
          <div className="prose prose-gray max-w-none">
            <p className="text-gray-600 leading-relaxed mb-6">
              Centry Checkout provides a unified API for accepting payments across multiple
              African countries and payment providers. Instead of integrating with each provider
              individually, you integrate once with Centry and we handle the routing.
            </p>

            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-6">
              <h4 className="font-semibold text-gray-900 mb-3">The checkout flow:</h4>
              <ol className="space-y-2 text-gray-700">
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">1</span>
                  <span>Your server creates a checkout session via our API</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">2</span>
                  <span>Redirect your customer to the checkout URL (or embed the widget)</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">3</span>
                  <span>Customer selects their country and payment method</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">4</span>
                  <span>We route the payment to the appropriate provider</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="flex-shrink-0 size-6 rounded-full bg-blue-600 text-white text-sm flex items-center justify-center">5</span>
                  <span>You receive a webhook when the payment completes</span>
                </li>
              </ol>
            </div>
          </div>
        </DocsSection>

        {/* Quick Start */}
        <DocsSection
          id="quickstart"
          title="Quick Start"
          description="Start accepting payments in minutes"
        >
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-gray-900 mb-3">1. Get your API key</h4>
              <p className="text-gray-600 mb-4">
                Create an account and get your API key from the{' '}
                <a href="/dashboard" className="text-blue-600 hover:underline">
                  dashboard
                </a>
                . API keys start with <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">cen_</code>.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">2. Create a checkout session</h4>
              <CodeBlock
                language="bash"
                filename="Terminal"
                code={`curl -X POST https://api.centry.io/api/v1/checkout/sessions/ \\
  -H "Authorization: Api-Key cen_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "5000.00",
    "currency": "NGN",
    "reference": "ORDER-12345",
    "description": "Premium subscription",
    "customer_email": "customer@example.com",
    "success_url": "https://yoursite.com/success",
    "cancel_url": "https://yoursite.com/cancel",
    "webhook_url": "https://yoursite.com/webhooks/centry"
  }'`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">3. Redirect to checkout</h4>
              <p className="text-gray-600 mb-4">
                The response includes a <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">checkout_url</code>.
                Redirect your customer to this URL to complete payment.
              </p>
              <CodeBlock
                language="json"
                filename="Response"
                code={`{
  "id": "cs_abc123",
  "session_token": "tok_xyz789",
  "checkout_url": "https://checkout.centry.io/checkout/tok_xyz789",
  "status": "pending",
  "expires_at": "2024-01-15T12:00:00Z"
}`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">4. Handle the webhook</h4>
              <p className="text-gray-600 mb-4">
                When the payment completes, we&apos;ll send a webhook to your server.
              </p>
              <CodeBlock
                language="json"
                filename="Webhook payload"
                code={`{
  "event": "session.completed",
  "data": {
    "session_id": "cs_abc123",
    "reference": "ORDER-12345",
    "amount": "5000.00",
    "currency": "NGN",
    "status": "completed",
    "payment": {
      "provider": "paystack",
      "method": "card",
      "provider_reference": "PAY_xyz123"
    }
  }
}`}
              />
            </div>
          </div>
        </DocsSection>

        {/* Authentication */}
        <DocsSection
          id="authentication"
          title="Authentication"
          description="Secure your API requests"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              All API requests must include your API key in the Authorization header.
              Keep your API key secret and never expose it in client-side code.
            </p>

            <CodeBlock
              language="bash"
              code={`Authorization: Api-Key cen_your_api_key`}
            />

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <Shield className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-800">Keep your API key secure</h4>
                  <p className="text-sm text-amber-700 mt-1">
                    Never expose your API key in client-side code or public repositories.
                    Use environment variables to store your key securely.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </DocsSection>

        {/* Hosted Checkout */}
        <DocsSection
          id="hosted-checkout"
          title="Hosted Checkout"
          description="Redirect customers to our hosted checkout page"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              The simplest integration method. Create a session and redirect your customer
              to the checkout URL. We handle the entire payment flow.
            </p>

            <CodeBlock
              language="javascript"
              filename="server.js"
              code={`// Create a checkout session
const response = await fetch('https://api.centry.io/api/v1/checkout/sessions/', {
  method: 'POST',
  headers: {
    'Authorization': 'Api-Key ' + process.env.CENTRY_API_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: '5000.00',
    currency: 'NGN',
    reference: 'ORDER-' + orderId,
    success_url: 'https://yoursite.com/success?order=' + orderId,
    cancel_url: 'https://yoursite.com/cart'
  })
});

const { checkout_url } = await response.json();

// Redirect customer to checkout
res.redirect(checkout_url);`}
            />
          </div>
        </DocsSection>

        {/* Embedded Widget */}
        <DocsSection
          id="embedded-widget"
          title="Embedded Widget"
          description="Embed checkout in your site with our JavaScript SDK"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              Keep customers on your site by embedding our checkout widget in a modal.
              The widget handles country selection, payment methods, and the entire payment flow.
            </p>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">1. Include the SDK</h4>
              <CodeBlock
                language="html"
                code={`<script src="https://checkout.centry.io/widget/centry-checkout.js"></script>`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">2. Open the checkout modal</h4>
              <CodeBlock
                language="javascript"
                filename="checkout.js"
                code={`// After creating a session on your server, open the widget
CentryCheckout.open({
  sessionToken: 'tok_xyz789', // From your server
  onSuccess: function(data) {
    console.log('Payment successful!');
    window.location.href = '/success';
  },
  onError: function(error) {
    console.error('Payment failed:', error);
  },
  onClose: function() {
    console.log('Checkout closed');
  }
});`}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-medium text-blue-800 mb-2">Try it out</h4>
              <p className="text-sm text-blue-700">
                See the{' '}
                <a href="/widget/example.html" className="underline" target="_blank">
                  live example
                </a>
                {' '}to test the embedded widget.
              </p>
            </div>
          </div>
        </DocsSection>

        {/* API Reference */}
        <DocsSection
          id="api-reference"
          title="API Reference"
          description="Complete API documentation"
        >
          <p className="text-gray-600 mb-6">
            Base URL: <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">https://api.centry.io</code>
          </p>
        </DocsSection>

        {/* Create Session */}
        <DocsSection
          id="create-session"
          title="Create Session"
          description="Create a new checkout session"
        >
          <div className="space-y-6">
            <Endpoint
              method="POST"
              path="/api/v1/checkout/sessions/"
              description="Create a new checkout session for payment collection"
            />

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Request Parameters</h4>
              <ParamTable
                params={[
                  { name: 'amount', type: 'string', required: true, description: 'Payment amount (e.g., "5000.00")' },
                  { name: 'currency', type: 'string', required: true, description: 'ISO 4217 currency code (e.g., "NGN", "KES", "ZAR")' },
                  { name: 'reference', type: 'string', required: true, description: 'Your unique order/invoice reference' },
                  { name: 'success_url', type: 'string', required: true, description: 'URL to redirect after successful payment' },
                  { name: 'cancel_url', type: 'string', required: true, description: 'URL to redirect if customer cancels' },
                  { name: 'webhook_url', type: 'string', required: false, description: 'URL to receive webhook notifications' },
                  { name: 'description', type: 'string', required: false, description: 'Payment description shown to customer' },
                  { name: 'customer_email', type: 'string', required: false, description: 'Pre-fill customer email' },
                  { name: 'customer_phone', type: 'string', required: false, description: 'Pre-fill customer phone' },
                  { name: 'customer_name', type: 'string', required: false, description: 'Pre-fill customer name' },
                  { name: 'allowed_countries', type: 'array', required: false, description: 'Restrict to specific countries (e.g., ["NG", "GH"])' },
                  { name: 'allowed_providers', type: 'array', required: false, description: 'Restrict to specific providers (e.g., ["paystack"])' },
                  { name: 'metadata', type: 'object', required: false, description: 'Custom metadata (returned in webhooks)' },
                ]}
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Example Request</h4>
              <CodeBlock
                language="javascript"
                code={`const response = await fetch('https://api.centry.io/api/v1/checkout/sessions/', {
  method: 'POST',
  headers: {
    'Authorization': 'Api-Key cen_your_api_key',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    amount: '5000.00',
    currency: 'NGN',
    reference: 'ORDER-12345',
    description: 'Premium subscription - Monthly',
    customer_email: 'john@example.com',
    success_url: 'https://yoursite.com/success',
    cancel_url: 'https://yoursite.com/cancel',
    webhook_url: 'https://yoursite.com/webhooks/centry',
    metadata: {
      order_id: '12345',
      product: 'premium_monthly'
    }
  })
});`}
              />
            </div>

            <div>
              <h4 className="font-semibold text-gray-900 mb-3">Response</h4>
              <CodeBlock
                language="json"
                code={`{
  "id": "cs_1a2b3c4d5e6f",
  "session_token": "tok_9z8y7x6w5v",
  "checkout_url": "https://checkout.centry.io/checkout/tok_9z8y7x6w5v",
  "reference": "ORDER-12345",
  "amount": "5000.00",
  "currency": "NGN",
  "status": "pending",
  "expires_at": "2024-01-15T13:00:00Z",
  "created_at": "2024-01-15T12:00:00Z"
}`}
              />
            </div>
          </div>
        </DocsSection>

        {/* Get Session */}
        <DocsSection
          id="get-session"
          title="Get Session"
          description="Retrieve a checkout session"
        >
          <div className="space-y-6">
            <Endpoint
              method="GET"
              path="/api/v1/checkout/sessions/{session_id}/"
              description="Retrieve details of an existing checkout session"
            />

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
    "id": "pay_abc123",
    "provider": "paystack",
    "method": "card",
    "status": "success",
    "provider_reference": "PAY_xyz789"
  },
  "created_at": "2024-01-15T12:00:00Z",
  "completed_at": "2024-01-15T12:05:00Z"
}`}
            />
          </div>
        </DocsSection>

        {/* Webhooks */}
        <DocsSection
          id="webhooks"
          title="Webhooks"
          description="Receive real-time payment notifications"
        >
          <div className="space-y-6">
            <p className="text-gray-600">
              Webhooks notify your server when payment events occur. Configure your webhook URL
              when creating a session or set a default in your dashboard.
            </p>

            <div id="webhook-events">
              <h4 className="font-semibold text-gray-900 mb-3">Webhook Events</h4>
              <div className="space-y-3">
                <div className="p-4 rounded-lg border border-gray-200">
                  <code className="text-sm font-mono text-blue-600">session.completed</code>
                  <p className="text-sm text-gray-600 mt-1">Payment was successful</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200">
                  <code className="text-sm font-mono text-blue-600">session.failed</code>
                  <p className="text-sm text-gray-600 mt-1">Payment failed</p>
                </div>
                <div className="p-4 rounded-lg border border-gray-200">
                  <code className="text-sm font-mono text-blue-600">session.expired</code>
                  <p className="text-sm text-gray-600 mt-1">Session expired without payment</p>
                </div>
              </div>
            </div>

            <div id="webhook-verification">
              <h4 className="font-semibold text-gray-900 mb-3">Signature Verification</h4>
              <p className="text-gray-600 mb-4">
                Webhooks include an HMAC signature in the <code className="px-1.5 py-0.5 bg-gray-100 rounded text-sm">X-Centry-Signature</code> header.
                Verify this signature to ensure the webhook is authentic.
              </p>
              <CodeBlock
                language="python"
                filename="webhook_handler.py"
                code={`import hmac
import hashlib

def verify_webhook(payload, signature, webhook_secret):
    expected = hmac.new(
        webhook_secret.encode(),
        payload.encode(),
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(expected, signature)

# In your webhook handler
@app.post('/webhooks/centry')
def handle_webhook(request):
    signature = request.headers.get('X-Centry-Signature')
    if not verify_webhook(request.body, signature, WEBHOOK_SECRET):
        return {'error': 'Invalid signature'}, 401

    event = request.json
    if event['event'] == 'session.completed':
        # Handle successful payment
        fulfill_order(event['data']['reference'])

    return {'received': True}`}
              />
            </div>
          </div>
        </DocsSection>

        {/* Countries */}
        <DocsSection
          id="countries"
          title="Supported Countries"
          description="Available countries and payment methods"
        >
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Country</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Currency</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Providers</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-900">Methods</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-4 py-3 font-medium">Nigeria (NG)</td>
                  <td className="px-4 py-3">NGN</td>
                  <td className="px-4 py-3">Paystack</td>
                  <td className="px-4 py-3">Card, Bank Transfer, USSD</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Ghana (GH)</td>
                  <td className="px-4 py-3">GHS</td>
                  <td className="px-4 py-3">Paystack</td>
                  <td className="px-4 py-3">Card, Mobile Money</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">South Africa (ZA)</td>
                  <td className="px-4 py-3">ZAR</td>
                  <td className="px-4 py-3">Paystack, Netcash</td>
                  <td className="px-4 py-3">Card, Instant EFT</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Kenya (KE)</td>
                  <td className="px-4 py-3">KES</td>
                  <td className="px-4 py-3">Airtel, Paystack</td>
                  <td className="px-4 py-3">Mobile Money, Card</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Uganda (UG)</td>
                  <td className="px-4 py-3">UGX</td>
                  <td className="px-4 py-3">MTN, Airtel</td>
                  <td className="px-4 py-3">Mobile Money</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Tanzania (TZ)</td>
                  <td className="px-4 py-3">TZS</td>
                  <td className="px-4 py-3">Airtel</td>
                  <td className="px-4 py-3">Mobile Money</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Rwanda (RW)</td>
                  <td className="px-4 py-3">RWF</td>
                  <td className="px-4 py-3">MTN</td>
                  <td className="px-4 py-3">Mobile Money</td>
                </tr>
              </tbody>
            </table>
          </div>
        </DocsSection>

        {/* Footer */}
        <div className="mt-16 pt-8 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500">
              Need help? Contact{' '}
              <a href="mailto:support@centry.io" className="text-blue-600 hover:underline">
                support@centry.io
              </a>
            </p>
            <div className="flex items-center gap-4">
              <a
                href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                className="text-sm text-gray-500 hover:text-gray-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
              <a
                href="https://github.com/centry"
                className="text-sm text-gray-500 hover:text-gray-700"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <a
                href="/dashboard"
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Dashboard
              </a>
            </div>
          </div>
        </div>
      </div>
    </DocsLayout>
  );
}
