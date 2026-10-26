/**
 * Colour references for code that needs a colour as a *string* — Recharts
 * props, inline styles, SVG attributes, canvas. Everything resolves to the
 * design tokens declared in `styles/globals.css` (`@theme`), so the brand is
 * edited in exactly one place.
 *
 * Rules of thumb:
 *   • In JSX, prefer the Tailwind classes (`text-success`, `bg-info/10`,
 *     `border-warning-500/20`) — they already read the same tokens.
 *   • Reach for `color.*` / `shade()` / `tint()` only when a prop or style
 *     needs a plain string.
 *   • `hex` is for output that leaves the page (exported HTML, the checkout
 *     widget injected into merchant sites) where CSS variables don't exist.
 *     `lib/__tests__/colors.test.ts` keeps it in step with globals.css.
 *   • Never write a `#rrggbb` anywhere else.
 */

export type Token =
  | 'forest' | 'forest-light' | 'sage' | 'cream' | 'cream-deep' | 'gold' | 'lime' | 'ink'
  | 'success' | 'warning' | 'danger' | 'info' | 'ochre' | 'heather' | 'reconcile' | 'olive'
  | 'neutral' | 'white';

const v = (name: string) => `var(--color-${name})`;

/** Base token colours as CSS variable references. */
export const color = {
  forest: v('forest'),
  forestLight: v('forest-light'),
  sage: v('sage'),
  cream: v('cream'),
  creamDeep: v('cream-deep'),
  gold: v('gold'),
  lime: v('lime'),
  ink: v('ink'),
  success: v('success'),
  warning: v('warning'),
  danger: v('danger'),
  info: v('info'),
  ochre: v('ochre'),
  heather: v('heather'),
  reconcile: v('reconcile'),
  olive: v('olive'),
  neutral: v('neutral-500'),
  white: v('white'),
  // semantic surfaces/text — follow light/dark mode automatically
  background: 'var(--background)',
  card: 'var(--card)',
  muted: 'var(--muted)',
  border: 'var(--border)',
  foreground: 'var(--foreground)',
  mutedForeground: 'var(--muted-foreground)',
  primary: 'var(--primary)',
} as const;

/** A scale stop, e.g. shade('success', 700) → var(--color-success-700). */
export const shade = (token: Token, stop: 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950) =>
  v(`${token}-${stop}`);

/** A translucent tint of a token for backgrounds/halos, e.g. tint('info', 10). */
export const tint = (token: Token, percent: number) =>
  `color-mix(in srgb, ${v(token)} ${percent}%, transparent)`;

/** Ordered categorical series for charts: distinct, brand-harmonised. */
export const chartSeries = [
  color.forest, color.sage, color.info, color.gold, shade('info', 600),
  color.ochre, color.olive, color.heather, color.danger, color.neutral,
] as const;

/**
 * Raw values for output that leaves the browser. Mirrors `@theme` in
 * styles/globals.css — the unit test fails if the two drift.
 */
export const hex = {
  forest: '#1E3528', forestLight: '#2C4A38', sage: '#8FA377', cream: '#F2F0E6',
  gold: '#B8900E', lime: '#E2FF60', ink: '#26302A', white: '#FFFFFF',
  success: '#3E8A55', success50: '#EEF5EF', success300: '#8CBE98', success400: '#5E9E6F',
  success600: '#2F7245', success800: '#1F4A2F',
  warning: '#C8921F', warning50: '#FBF5E6', warning300: '#E3BF5F', warning400: '#D9A83A',
  warning600: '#A97718', warning800: '#6B4A13', warning900: '#533A11',
  ochre: '#C77A2E', ochre50: '#FBF0E4', ochre700: '#9A5A1E',
  danger: '#BF4B3E', danger50: '#FBEEEC', danger300: '#DF8E84', danger600: '#A63D32',
  danger700: '#87322A', danger900: '#55231F',
  info: '#638C80', info50: '#EEF4F2', info600: '#4F7569', info700: '#405E55', info800: '#344B44',
  reconcile: '#2A7E78', reconcile50: '#E3F1EF',
  heather: '#7A6FA3', heather50: '#F1EFF6', heather700: '#4B4370',
  neutral50: '#F7F5EF', neutral100: '#EFEDE6', neutral200: '#E3E1D8', neutral300: '#C9CBC2',
  neutral400: '#9DA39C', neutral500: '#68716B',
} satisfies Record<string, string>;

/**
 * Third-party identity colours (ERP vendors' own brands). These are data about
 * other companies, not our palette, and are the one sanctioned place for a
 * literal outside globals.css.
 */
export const vendorBrand: Record<string, { color: string; icon: string }> = {
  xero: { color: '#13B5EA', icon: 'X' },
  qbo: { color: '#2CA01C', icon: 'QB' },
  erpnext: { color: '#0089FF', icon: 'EN' },
  sage: { color: '#00DC00', icon: 'S' },
  freshbooks: { color: '#0075DD', icon: 'FB' },
  zoho: { color: '#E42527', icon: 'Z' },
  wave: { color: '#2A3B4C', icon: 'W' },
  netsuite: { color: '#1B3A56', icon: 'NS' },
  dynamics: { color: '#002050', icon: 'D' },
  myob: { color: '#6100A5', icon: 'M' },
  odoo: { color: '#714B67', icon: 'O' },
};
export const vendorBrandDefault = { color: color.neutral, icon: '?' };
