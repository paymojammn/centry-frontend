/**
 * OneGate EFTsecure Checkout V4 — self-hosted embed.
 *
 * Wraps OneGate's promise-based `EftSecureCheckout` widget so payments
 * happen in-page (PCI-descoped) instead of redirecting to the hosted page.
 * Driven entirely by the payment-key coordinates our backend already mints:
 *   - `serviceUrl`  ← the `origin` returned by the payment-key API
 *   - `paymentKey`  ← the `key` returned by the payment-key API
 *
 * The widget script is loaded lazily (once per origin) the first time a
 * checkout is launched. White-labelled domains are supported by deriving
 * the script origin from `serviceUrl`.
 *
 * Docs: Checkout Widget V4 — class-based, no jQuery, `.then()/.catch()`.
 */

// Our own self-hosted copy of the OneGate EFTsecure V4 widget, served
// same-origin from public/onegate-widget/checkout-v4.js. Self-hosting avoids
// the CDN's missing CORS headers entirely and keeps the widget under our
// control. (basePath-aware so it also works behind the nginx prefix in prod.)
const SCRIPT_SRC = `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/onegate-widget/checkout-v4.js`;
const BRAND_PRIMARY = '#5C8A65'; // --brand-primary (muted sage green)

/** Result object the widget resolves with on a completed transaction. */
export interface OneGateCheckoutResult {
  status?: string;
  successful?: number | boolean;
  merchant_reference?: string;
  transaction_id?: string | number;
  gateway_reference?: string;
  amount?: string;
  [key: string]: unknown;
}

/** Error object the widget rejects with on failure / cancel / timeout. */
export interface OneGateCheckoutError {
  cancelled?: boolean;
  error?: string;
  [key: string]: unknown;
}

interface EftSecureCheckoutConfig {
  serviceUrl: string;
  paymentKey: string;
  paymentType?: string;
  walletPayment?: string;
  identificationType?: 'SAID' | 'PASSPORT';
  identification?: string;
  firstName?: string;
  lastName?: string;
  theme?: string;
  primaryColor?: string;
  secondaryColor?: string;
  checkoutRedirect?: boolean;
  cardOptions?: { rememberCard?: boolean; rememberCardDefaultValue?: boolean };
  timeout?: number;
  onLoad?: () => void;
  onComplete?: (data: OneGateCheckoutResult) => void;
  onError?: (error: OneGateCheckoutError) => void;
  onHide?: () => void;
}

interface EftSecureCheckoutInstance {
  init: () => Promise<OneGateCheckoutResult>;
}

declare global {
  interface Window {
    EftSecureCheckout?: new (config: EftSecureCheckoutConfig) => EftSecureCheckoutInstance;
  }
}

/** Single loader promise — the script loads at most once per page. */
let scriptLoader: Promise<void> | null = null;

function loadCheckoutScript(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('OneGate checkout can only load in the browser'));
  }
  if (window.EftSecureCheckout) return Promise.resolve();
  if (scriptLoader) return scriptLoader;

  scriptLoader = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC; // same-origin proxy → no CORS / SRI concerns
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      scriptLoader = null; // allow a retry on the next launch
      reject(new Error('Failed to load OneGate checkout script'));
    };
    document.head.appendChild(script);
  });
  return scriptLoader;
}

export interface LaunchOneGateCheckoutParams {
  /** `origin` from the payment-key API response. */
  serviceUrl: string;
  /** `key` from the payment-key API response. */
  paymentKey: string;
  /** Force a payment type, e.g. 'eft' | 'credit_card'. Omit to let the user choose. */
  paymentType?: string;
  /** Pre-fill customer name on the checkout form. */
  firstName?: string;
  lastName?: string;
  /** Fired once the checkout iframe has loaded (e.g. re-enable the pay button). */
  onLoad?: () => void;
  /** Fired when the modal is closed/hidden. */
  onHide?: () => void;
  /** Transaction timeout in ms (widget default 300000). */
  timeout?: number;
}

/**
 * Launch the V4 checkout widget and resolve with the transaction result.
 *
 * Rejects with an {@link OneGateCheckoutError} on failure, cancellation, or
 * timeout — check `error.cancelled` to distinguish a user cancel from a
 * genuine failure. `checkoutRedirect` is forced off so control returns here
 * rather than navigating away.
 */
export async function launchOneGateCheckout(
  params: LaunchOneGateCheckoutParams,
): Promise<OneGateCheckoutResult> {
  const { serviceUrl, paymentKey } = params;
  if (!serviceUrl || !paymentKey) {
    throw new Error('serviceUrl and paymentKey are required to launch checkout');
  }

  await loadCheckoutScript();
  const Checkout = window.EftSecureCheckout;
  if (!Checkout) {
    throw new Error('OneGate checkout script loaded but EftSecureCheckout is unavailable');
  }

  // Only include defined keys. The widget deep-merges these over its own
  // defaults (onLoad/onHide → no-ops, timeout → 300000, paymentType → 'all'),
  // so passing `undefined` would clobber those defaults — e.g. an undefined
  // onLoad becomes `this.settings.onLoad()` → "onLoad is not a function".
  const config: EftSecureCheckoutConfig = {
    serviceUrl,
    paymentKey,
    primaryColor: BRAND_PRIMARY,
    checkoutRedirect: false,
  };
  if (params.paymentType) config.paymentType = params.paymentType;
  if (params.firstName) config.firstName = params.firstName;
  if (params.lastName) config.lastName = params.lastName;
  if (params.timeout != null) config.timeout = params.timeout;
  if (params.onLoad) config.onLoad = params.onLoad;
  if (params.onHide) config.onHide = params.onHide;

  const checkout = new Checkout(config);

  return checkout.init();
}
