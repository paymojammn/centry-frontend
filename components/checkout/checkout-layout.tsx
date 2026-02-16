'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface CheckoutLayoutProps {
  children: React.ReactNode;
  merchantName?: string;
  merchantLogo?: string | null;
}

export function CheckoutLayout({ children, merchantName, merchantLogo }: CheckoutLayoutProps) {
  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {merchantLogo ? (
            <img
              src={merchantLogo}
              alt={merchantName || 'Merchant'}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
              <span className="text-sm font-semibold text-muted-foreground">
                {merchantName?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
          )}
          {merchantName && (
            <span className="text-sm font-medium text-foreground">{merchantName}</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="max-w-lg mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Secured by{' '}
          <span className="font-medium text-foreground">Centry</span>
        </p>
      </footer>
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
        'bg-card rounded-xl border border-border shadow-sm overflow-hidden',
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
    <div className={cn('px-6 py-4 border-b border-border', className)}>{children}</div>
  );
}

interface CheckoutCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCardContent({ children, className }: CheckoutCardContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}
