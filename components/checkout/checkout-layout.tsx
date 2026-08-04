'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Lock, ShieldCheck } from 'lucide-react';
import { BRAND } from '@/config/brand';

interface CheckoutLayoutProps {
  children: React.ReactNode;
  merchantName?: string;
  merchantLogo?: string | null;
}

export function CheckoutLayout({ children, merchantName, merchantLogo }: CheckoutLayoutProps) {
  return (
    <div className="fixed inset-0 flex">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex w-[45%] bg-[rgb(var(--brand-dark))] relative overflow-hidden">
        {/* Decorative waves */}
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 600" preserveAspectRatio="none">
          <path d="M0,200 Q200,150 400,200 T800,180" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="1" />
          <path d="M0,220 Q200,170 400,220 T800,200" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.8" />
          <path d="M0,240 Q200,190 400,240 T800,220" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.6" />
          <path d="M0,400 Q200,350 400,400 T800,380" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="1" />
          <path d="M0,420 Q200,370 400,420 T800,400" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.8" />
          <path d="M0,440 Q200,390 400,440 T800,420" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.6" />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-12">
          {/* Merchant branding */}
          {merchantLogo ? (
            <img src={merchantLogo} alt={merchantName || 'Merchant'} className="h-16 w-auto object-contain mb-6" />
          ) : merchantName ? (
            <div className="size-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/10">
              <span className="text-3xl font-bold text-white">{merchantName.charAt(0).toUpperCase()}</span>
            </div>
          ) : null}

          <h1 className="text-3xl xl:text-4xl font-bold text-white tracking-wide text-center">
            Checkout
          </h1>
          <p className="text-white/40 mt-3 text-sm text-center">
            Secure payment powered by {BRAND.name}
          </p>

          {/* Trust indicators */}
          <div className="mt-12 space-y-3">
            {[
              { icon: <ShieldCheck className="size-4" />, text: '256-bit SSL encryption' },
              { icon: <Lock className="size-4" />, text: 'PCI DSS compliant' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2.5 text-white/30">
                {item.icon}
                <span className="text-xs">{item.text}</span>
              </div>
            ))}
          </div>

          {/* Brand mark at bottom */}
          <div className="absolute bottom-8 flex items-center gap-2">
            <img src={BRAND.logo.markDark} alt={BRAND.name} className="h-5 w-5 opacity-40" />
            <span className="text-xs text-white/30">Powered by {BRAND.name}</span>
          </div>
        </div>
      </div>

      {/* Right — Checkout Form */}
      <div className="w-full lg:w-[55%] flex flex-col bg-card overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {merchantLogo ? (
              <img src={merchantLogo} alt={merchantName || ''} className="h-7 w-auto" />
            ) : (
              <div className="size-8 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <span className="text-sm font-bold text-white">{merchantName?.charAt(0)?.toUpperCase() || 'C'}</span>
              </div>
            )}
            <span className="text-sm font-semibold text-foreground">{merchantName || 'Checkout'}</span>
          </div>
        </div>

        {/* Content — scrollable, vertically centered */}
        <div className="flex-1 overflow-y-auto">
          <div className="min-h-full flex items-center justify-center px-6 py-8 lg:px-12 xl:px-16">
            <div className="w-full max-w-md">
              {children}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border shrink-0 lg:hidden">
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" />
            <span>Secured by</span>
            <span className="font-semibold text-foreground">{BRAND.name}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface CheckoutCardProps {
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCard({ children, className }: CheckoutCardProps) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-border shadow-xl shadow-slate-200/40 overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

interface CheckoutCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCardHeader({ children, className }: CheckoutCardHeaderProps) {
  return (
    <div className={cn('px-6 py-4 border-b border-slate-100', className)}>{children}</div>
  );
}

interface CheckoutCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCardContent({ children, className }: CheckoutCardContentProps) {
  return <div className={cn('px-6 py-5', className)}>{children}</div>;
}
