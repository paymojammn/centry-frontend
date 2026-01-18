/**
 * Content Card Component
 *
 * Card wrapper for main content areas like tables and lists.
 */

'use client';

import { ReactNode } from 'react';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function ContentCard({ children, className = '', noPadding = false }: ContentCardProps) {
  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${noPadding ? '' : 'p-4'} ${className}`}>
      {children}
    </div>
  );
}

interface ContentCardHeaderProps {
  children: ReactNode;
  className?: string;
}

export function ContentCardHeader({ children, className = '' }: ContentCardHeaderProps) {
  return (
    <div className={`px-4 py-3 border-b border-gray-100 ${className}`}>
      {children}
    </div>
  );
}
