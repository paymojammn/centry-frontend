/**
 * Page Container Component
 *
 * Main content wrapper for all dashboard pages.
 * Provides consistent max-width and padding.
 */

'use client';

import { ReactNode } from 'react';

interface PageContainerProps {
  children: ReactNode;
  className?: string;
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6">
      <div className={className}>{children}</div>
    </div>
  );
}
