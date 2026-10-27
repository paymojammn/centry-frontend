import { describe, expect, it } from 'vitest';
import { FEATURE_CATALOGUE, filterMenuByFeatures, orgHasFeature } from '@/lib/features';
import { MENU_SIDEBAR } from '@/config/layout-1.config';
import type { MenuConfig } from '@/config/types';

describe('orgHasFeature', () => {
  it('gates strictly when the org carries a features list', () => {
    expect(orgHasFeature({ features: ['lending'] }, 'lending')).toBe(true);
    expect(orgHasFeature({ features: ['lending'] }, 'wallet')).toBe(false);
    expect(orgHasFeature({ features: [] }, 'lending')).toBe(false);
  });

  it('fails open when it cannot tell', () => {
    expect(orgHasFeature(undefined, 'lending')).toBe(true);
    expect(orgHasFeature(null, 'lending')).toBe(true);
    expect(orgHasFeature({}, 'lending')).toBe(true);
  });
});

describe('filterMenuByFeatures', () => {
  const menu: MenuConfig = [
    { title: 'Dashboard', path: '/dashboard' },
    { title: 'Expenses', path: '/expenses', feature: 'expenses' },
    {
      title: 'Rails',
      feature: 'mobile_money',
      children: [
        { title: 'MTN', children: [{ title: 'Sign-off', path: '/mtn', feature: 'rails_certification' }] },
      ],
    },
  ];

  it('drops gated leaves and groups left empty', () => {
    const on = new Set(['mobile_money']);
    const out = filterMenuByFeatures(menu, (f) => on.has(f));
    expect(out.map((i) => i.title)).toEqual(['Dashboard']);
  });

  it('keeps nested entries when every level is on', () => {
    const on = new Set(['mobile_money', 'rails_certification', 'expenses']);
    const out = filterMenuByFeatures(menu, (f) => on.has(f));
    expect(out.map((i) => i.title)).toEqual(['Dashboard', 'Expenses', 'Rails']);
    expect(out[2]?.children?.[0]?.children?.[0]?.path).toBe('/mtn');
  });

  it('does not mutate the source menu', () => {
    const before = JSON.stringify(menu);
    filterMenuByFeatures(menu, () => false);
    expect(JSON.stringify(menu)).toBe(before);
  });
});

describe('MENU_SIDEBAR feature keys', () => {
  const known = new Set<string>(FEATURE_CATALOGUE.map((f) => f.key));
  const collect = (items: MenuConfig, acc: string[] = []): string[] => {
    for (const item of items) {
      if (item.feature) acc.push(item.feature);
      if (item.children) collect(item.children, acc);
    }
    return acc;
  };

  it('only uses catalogue keys', () => {
    for (const key of collect(MENU_SIDEBAR)) expect(known.has(key)).toBe(true);
  });

  it('hides Payments, Rails and Lending on the core feature set', () => {
    const titles = filterMenuByFeatures(MENU_SIDEBAR, () => false)
      .filter((i) => !i.heading)
      .map((i) => i.title);
    expect(titles).toEqual(['Dashboard', 'ERP', 'Banking', 'Reports']);
  });

  it('no longer lists Provider Accounts', () => {
    expect(JSON.stringify(MENU_SIDEBAR)).not.toContain('/banking/provider-accounts');
  });
});
