'use client';

import { toAbsoluteUrl } from '@/lib/helpers';

export function ScreenLoader() {
  return (
    <div className="flex flex-col items-center gap-4 justify-center fixed inset-0 z-50 bg-[rgb(var(--brand-dark))] transition-opacity duration-700 ease-in-out">
      <div className="w-20 h-20 bg-white/10 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20">
        <img
          className="h-12 w-12"
          src={toAbsoluteUrl('/media/app/centry-mini-logo.svg')}
          alt="Centry"
        />
      </div>
      <div className="text-2xl font-bold text-white tracking-wide">
        CENTRY
      </div>
      <div className="text-white/60 font-medium text-sm">
        Loading...
      </div>
    </div>
  );
}
