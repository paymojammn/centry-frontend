import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hex } from '@/lib/colors';

/**
 * `hex` exists only for output that leaves the browser (exported HTML, the
 * checkout widget). It must mirror the `@theme` tokens in globals.css, which
 * are the single source of truth for the brand — this test fails on drift.
 */
describe('lib/colors hex mirror', () => {
  const css = readFileSync(join(process.cwd(), 'styles/globals.css'), 'utf8');
  const tokens = new Map<string, string>();
  for (const m of css.matchAll(/--color-([a-z0-9-]+):\s*(#[0-9A-Fa-f]{6})\s*;/g)) {
    const camel = m[1]!.replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    tokens.set(camel, m[2]!.toUpperCase());
  }

  it('every hex entry matches its @theme token', () => {
    const drift: string[] = [];
    for (const [key, value] of Object.entries(hex)) {
      if (key === 'white') continue; // Tailwind's own --color-white
      const expected = tokens.get(key);
      if (!expected) drift.push(`${key}: no --color-${key} token in globals.css`);
      else if (expected !== value.toUpperCase()) drift.push(`${key}: hex ${value} ≠ css ${expected}`);
    }
    expect(drift).toEqual([]);
  });
});
