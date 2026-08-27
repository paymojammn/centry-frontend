/**
 * Brand configuration — Paymoja.
 *
 * Single source of truth for every user-visible brand token: product name,
 * legal entity, logo paths, domains and contact addresses. Components and
 * pages read from here instead of hard-coding the brand, so re-skinning the
 * app for a different deployment means editing this file and dropping new
 * SVGs into `public/media/app/`.
 *
 * Deliberately NOT covered here (they are wire-protocol identifiers, not
 * branding, and changing them breaks live integrations):
 *   - the `X-Centry-*` webhook headers
 *   - the `CentryCheckout` widget global and `centry:checkout:*` postMessage
 *     event names
 *   - `CENTRY_API_KEY` / `CENTRY_WEBHOOK_SECRET` env var names
 *   - `cen_` API-key and reference prefixes
 */

export const BRAND = {
  /** Product name as shown to users. */
  name: 'Paymoja',
  /** Registered entity used in legal copy and copyright lines. */
  legalName: 'Paymoja Ltd',
  legal: {
    /** Governing law named in the Terms of Service. Interim value pending
     *  counsel confirmation of the entity's jurisdiction of incorporation —
     *  operations are Uganda-centred, so Uganda applies for now. */
    governingLaw: 'the Republic of Uganda',
  },
  /** Short positioning line under the logo on the login screen. */
  tagline: 'Business payments, simplified.',

  logo: {
    /** Square mark, dark ink — for light backgrounds. */
    mark: '/media/app/paymoja-logo.svg',
    /** Square mark, white ink — for dark backgrounds. */
    markDark: '/media/app/paymoja-logo-dark.svg',
    /** Collapsed-sidebar glyph, dark ink. */
    mini: '/media/app/paymoja-mini-logo.svg',
    /** Collapsed-sidebar glyph, white ink. */
    miniDark: '/media/app/paymoja-mini-logo-dark.svg',
    /** Full horizontal lockup (mark + wordmark), dark ink. */
    wordmark: '/media/app/paymoja-logo-large.svg',
    /** Full horizontal lockup, light ink. */
    wordmarkDark: '/media/app/paymoja-logo-large-dark.svg',
  },

  urls: {
    marketing: 'https://paymoja.io',
    app: 'https://paymoja.io',
    docs: 'https://paymoja.io/docs/checkout',
    /** Production API base advertised in the developer docs. */
    api: 'https://api.paymoja.io',
    /** Sandbox API base advertised in the developer docs. */
    apiSandbox: 'https://staging-api.paymoja.io',
    /** Host that serves the hosted checkout page and the widget script. */
    checkout: 'https://paymoja.io',
    github: 'https://github.com/paymojammn',
  },

  email: {
    // paymoja.io resolves for web but publishes no MX records — mail sent
    // there silently bounces. paymoja.com has Google MX and receives mail.
    // Mirrors the same fix already applied to BRAND_SUPPORT_EMAIL on the
    // backend (centry-backend baihu/settings.py, commit 6b572a2).
    support: 'support@paymoja.com',
    privacy: 'privacy@paymoja.com',
    sales: 'sales@paymoja.com',
  },
} as const;

/** `%s | Paymoja` — the Next.js metadata title template. */
export const TITLE_TEMPLATE = `%s | ${BRAND.name}`;

/**
 * Canonical copyright line for footers, legal pages and generated documents,
 * e.g. `© 2026 Centry Business Concepts Limited. All rights reserved.`
 *
 * Always attributes the registered legal entity (`BRAND.legalName`), never
 * the product name — the entity is what holds the copyright. Pass a year to
 * pin it (snapshots, generated PDFs); defaults to the current year so
 * rendered footers never go stale. Mirrors `common/branding.py` on the
 * backend — keep the wording in sync.
 */
export function copyrightLine(year: number = new Date().getFullYear()): string {
  return `© ${year} ${BRAND.legalName.replace(/\.+$/, '')}. All rights reserved.`;
}
