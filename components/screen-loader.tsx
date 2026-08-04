'use client';

import { toAbsoluteUrl } from '@/lib/helpers';
import { BRAND } from '@/config/brand';

export function ScreenLoader() {
  return (
    <div className="flex flex-col items-center gap-4 justify-center fixed inset-0 z-50 bg-[rgb(var(--brand-dark))] transition-opacity duration-700 ease-in-out">
      <img
        className="h-24 w-24"
        src={toAbsoluteUrl(BRAND.logo.markDark)}
        alt={BRAND.name}
      />
      <div className="text-2xl font-bold text-white tracking-wide">
        {BRAND.name}
      </div>
      <div className="text-white/60 font-medium text-sm">
        Loading...
      </div>
    </div>
  );
}
