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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          {merchantLogo ? (
            <img
              src={merchantLogo}
              alt={merchantName || 'Merchant'}
              className="h-8 w-auto object-contain"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-sm font-semibold text-gray-600">
                {merchantName?.charAt(0)?.toUpperCase() || 'M'}
              </span>
            </div>
          )}
          {merchantName && (
            <span className="text-sm font-medium text-gray-900">{merchantName}</span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4">
        <div className="max-w-lg mx-auto">{children}</div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 text-center">
        <p className="text-xs text-gray-500">
          Secured by{' '}
          <span className="font-medium text-gray-700">Centry</span>
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
        'bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden',
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
    <div className={cn('px-6 py-4 border-b border-gray-100', className)}>{children}</div>
  );
}

interface CheckoutCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function CheckoutCardContent({ children, className }: CheckoutCardContentProps) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}
