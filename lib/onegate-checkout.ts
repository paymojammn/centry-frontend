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

/* ------------------------------------------------------------------ *
 * Option B — embed OneGate's hosted checkout page directly.
 *
 * The official widget POSTs the key to OneGate's bare-origin endpoint
 * (`/?checkout=1`), which redirects unrecognised origins to a login page.
 * The hosted URL (`…/pay/hosted?payment_key=…`) instead renders the real
 * checkout, and is iframe-able today. This opens it in an in-page modal so
 * the payer never leaves the app. Completion is reconciled by the webhook;
 * the promise resolves when the modal is closed.
 * ------------------------------------------------------------------ */

const HOSTED_MODAL_STYLE_ID = 'onegate-hosted-modal-styles';

function injectHostedModalCss() {
  if (typeof document === 'undefined' || document.getElementById(HOSTED_MODAL_STYLE_ID)) return;
  const css = `
    .ogh-overlay{position:fixed;inset:0;background:rgba(15,23,42,.55);z-index:2147483647;
      display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s ease;}
    .ogh-overlay.ogh-open{opacity:1;}
    .ogh-modal{position:relative;width:480px;max-width:calc(100vw - 32px);height:680px;
      max-height:calc(100vh - 48px);background:#fff;border-radius:16px;overflow:hidden;
      box-shadow:0 24px 60px rgba(0,0,0,.35);display:flex;flex-direction:column;}
    .ogh-header{display:flex;align-items:center;justify-content:space-between;padding:12px 16px;
      border-bottom:1px solid #eef0f2;font:600 14px system-ui,sans-serif;color:#1c1c1e;}
    .ogh-close{appearance:none;border:none;background:transparent;cursor:pointer;font-size:20px;
      line-height:1;color:#6b6b6f;padding:4px 8px;border-radius:8px;}
    .ogh-close:hover{background:#f4f4f5;color:#1c1c1e;}
    .ogh-body{position:relative;flex:1;}
    .ogh-iframe{width:100%;height:100%;border:0;background:#fff;}
    .ogh-loader{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;}
    .ogh-spin{width:40px;height:40px;border:4px solid #e5e7eb;border-top-color:${BRAND_PRIMARY};
      border-radius:50%;animation:ogh-spin 1s linear infinite;}
    @keyframes ogh-spin{to{transform:rotate(360deg);}}
    body.ogh-open{overflow:hidden!important;}
    @media (max-width:520px){.ogh-modal{width:100vw;height:100vh;max-width:100vw;max-height:100vh;border-radius:0;}}
  `;
  const style = document.createElement('style');
  style.id = HOSTED_MODAL_STYLE_ID;
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);
}

export interface OpenHostedModalParams {
  /** The hosted checkout URL — `payment_link` from the backend (…/pay/hosted?payment_key=…). */
  checkoutUrl: string;
  /** Modal heading. */
  title?: string;
}

/**
 * Open OneGate's hosted checkout in an in-page modal iframe. Resolves when the
 * user closes the modal (the webhook is the source of truth for the outcome).
 */
export function openOneGateHostedModal(params: OpenHostedModalParams): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Hosted checkout can only open in the browser'));
      return;
    }
    if (!params.checkoutUrl) {
      reject(new Error('checkoutUrl is required'));
      return;
    }

    injectHostedModalCss();

    const overlay = document.createElement('div');
    overlay.className = 'ogh-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const modal = document.createElement('div');
    modal.className = 'ogh-modal';

    const header = document.createElement('div');
    header.className = 'ogh-header';
    const titleEl = document.createElement('span');
    titleEl.textContent = params.title || 'Complete payment';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'ogh-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    header.appendChild(titleEl);
    header.appendChild(closeBtn);

    const body = document.createElement('div');
    body.className = 'ogh-body';
    const loader = document.createElement('div');
    loader.className = 'ogh-loader';
    const spin = document.createElement('div');
    spin.className = 'ogh-spin';
    loader.appendChild(spin);

    const iframe = document.createElement('iframe');
    iframe.className = 'ogh-iframe';
    iframe.setAttribute('allow', 'payment https://payments.onegate.co.za https://pay.google.com');
    iframe.addEventListener('load', () => {
      if (loader.parentNode) loader.parentNode.removeChild(loader);
    });
    iframe.src = params.checkoutUrl;

    body.appendChild(loader);
    body.appendChild(iframe);
    modal.appendChild(header);
    modal.appendChild(body);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
    document.body.classList.add('ogh-open');
    window.requestAnimationFrame(() => overlay.classList.add('ogh-open'));

    let settled = false;
    const cleanup = () => {
      if (settled) return;
      settled = true;
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.body.classList.remove('ogh-open');
      resolve();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') cleanup();
    };

    closeBtn.addEventListener('click', cleanup);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) cleanup();
    });
    document.addEventListener('keydown', onKey);
  });
}
