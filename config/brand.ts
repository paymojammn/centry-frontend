/**
 * Brand configuration — Centry.
 *
 * Single source of truth for every user-visible brand token: product name,
 * legal entity, logo paths, domains and contact addresses. Components and
 * pages read from here instead of hard-coding the brand, so re-skinning the
 * app for a different deployment means editing this file and dropping new
 * SVGs into `public/media/app/`. The `paymoja` branch carries the same file
 * with these values swapped to Paymoja.
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
  name: 'Centry',
  /** Registered entity used in legal copy and copyright lines. */
  legalName: 'Centry Inc.',
  /** Short positioning line under the logo on the login screen. */
  tagline: 'Business payments, simplified.',

  logo: {
    /** Square mark, dark ink — for light backgrounds. */
    mark: '/media/app/centry-logo.svg',
    /** Square mark, white ink — for dark backgrounds. */
    markDark: '/media/app/centry-logo-dark.svg',
    /** Collapsed-sidebar glyph, dark ink. */
    mini: '/media/app/centry-mini-logo.svg',
    /** Collapsed-sidebar glyph, white ink. */
    miniDark: '/media/app/centry-mini-logo-dark.svg',
    /** Full horizontal lockup (mark + wordmark), dark ink. */
    wordmark: '/media/app/centry-logo-large.svg',
    /** Full horizontal lockup, light ink. */
    wordmarkDark: '/media/app/centry-logo-large-dark.svg',
  },

  urls: {
    marketing: 'https://getcentry.io',
    app: 'https://getcentry.app',
    docs: 'https://getcentry.app/docs/checkout',
    /** Production API base advertised in the developer docs. */
    api: 'https://api.getcentry.io',
    /** Sandbox API base advertised in the developer docs. */
    apiSandbox: 'https://staging-api.getcentry.io',
    /** Host that serves the hosted checkout page and the widget script. */
    checkout: 'https://checkout.getcentry.io',
    github: 'https://github.com/centry',
  },

  email: {
    support: 'support@getcentry.com',
    privacy: 'privacy@getcentry.com',
    sales: 'sales@getcentry.app',
  },
} as const;

/** `%s | Centry` — the Next.js metadata title template. */
export const TITLE_TEMPLATE = `%s | ${BRAND.name}`;
