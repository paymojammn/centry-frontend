/**
 * Per-organization feature flags.
 *
 * Mirrors `erp/features.py` on the backend: an organization's `features`
 * list names the optional product areas enabled for it. Anything not in the
 * catalogue is the core product and is never gated.
 *
 * Pure helpers live here (unit-tested); the React hooks are in
 * `hooks/use-user.ts` and the page guard is `components/layout/feature-gate.tsx`.
 */

import type { MenuConfig } from '@/config/types';

export type OrgFeature =
  | 'mobile_money'
  | 'rails_certification'
  | 'lending'
  | 'expenses'
  | 'wallet'
  | 'fiscalization';

export interface FeatureDefinition {
  key: OrgFeature;
  label: string;
  description: string;
}

/** Display order matches the backend catalogue. */
export const FEATURE_CATALOGUE: FeatureDefinition[] = [
  {
    key: 'mobile_money',
    label: 'Mobile money',
    description: 'Pay In, Pay Out, mobile-money reconciliation and provider accounts.',
  },
  {
    key: 'rails_certification',
    label: 'Rails certification',
    description: 'MTN, Airtel, Ozow and OneGate sign-off tooling.',
  },
  {
    key: 'lending',
    label: 'Lending',
    description: 'Loan book, collections and disbursements.',
  },
  {
    key: 'expenses',
    label: 'Expenses',
    description: 'Expense claims and payment requests.',
  },
  {
    key: 'wallet',
    label: 'Wallet',
    description: 'Organization wallet balances and top-ups.',
  },
  {
    key: 'fiscalization',
    label: 'Fiscalization',
    description: 'EFRIS / ZRA / DGI e-invoicing: fiscal connections, fiscal documents, goods & stock.',
  },
];

export function featureLabel(feature: string): string {
  return FEATURE_CATALOGUE.find((f) => f.key === feature)?.label ?? feature;
}

/** localStorage key the whole app uses for the working organization. */
export const SELECTED_ORGANIZATION_KEY = 'selectedOrganizationId';

export interface FeatureBearer {
  features?: string[] | null;
}

/**
 * Whether `org` has `feature` enabled.
 *
 * Fails open when it cannot tell: no organization (e.g. a superuser viewing
 * an org they are not a member of) or an older API response without a
 * `features` list. A known organization with a list is gated strictly.
 */
export function orgHasFeature(org: FeatureBearer | null | undefined, feature: string): boolean {
  if (!org) return true;
  if (!Array.isArray(org.features)) return true;
  return org.features.includes(feature);
}

/**
 * Drop menu items whose `feature` is off, recursively. A group whose children
 * were all dropped disappears with them; headings are left for the caller.
 */
export function filterMenuByFeatures(
  items: MenuConfig,
  hasFeature: (feature: string) => boolean,
): MenuConfig {
  const out: MenuConfig = [];
  for (const item of items) {
    if (item.feature && !hasFeature(item.feature)) continue;
    if (item.children) {
      const children = filterMenuByFeatures(item.children, hasFeature);
      if (children.length === 0) continue;
      out.push({ ...item, children });
      continue;
    }
    out.push(item);
  }
  return out;
}
