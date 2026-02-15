/**
 * Content Card Component
 *
 * Card wrapper for main content areas like tables and lists.
 * Features subtle shadows and smooth hover transitions.
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContentCardProps {
  children: ReactNode;
  className?: string;
  noPadding?: boolean;
  hover?: boolean; // Enable hover elevation effect
  variant?: 'default' | 'elevated' | 'outlined';
}

export function ContentCard({
  children,
  className = '',
  noPadding = false,
  hover = false,
  variant = 'default',
}: ContentCardProps) {
  const variants = {
    default: 'bg-card rounded-xl border border-border shadow-sm',
    elevated: 'bg-card rounded-xl border border-border/50 shadow-md',
    outlined: 'bg-card rounded-xl border border-border',
  };

  return (
    <div
      className={cn(
        variants[variant],
        'transition-all duration-200',
        hover && 'hover:shadow-md hover:border-border hover:-translate-y-0.5',
        noPadding ? '' : 'p-6',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ContentCardHeaderProps {
  children: ReactNode;
  className?: string;
  withBorder?: boolean;
}

export function ContentCardHeader({
  children,
  className = '',
  withBorder = true,
}: ContentCardHeaderProps) {
  return (
    <div
      className={cn(
        'px-6 py-5',
        withBorder && 'border-b border-border/50',
        className
      )}
    >
      {children}
    </div>
  );
}

interface ContentCardBodyProps {
  children: ReactNode;
  className?: string;
}

export function ContentCardBody({ children, className = '' }: ContentCardBodyProps) {
  return <div className={cn('p-6', className)}>{children}</div>;
}

interface ContentCardFooterProps {
  children: ReactNode;
  className?: string;
}

export function ContentCardFooter({ children, className = '' }: ContentCardFooterProps) {
  return (
    <div className={cn('px-5 py-4 border-t border-border/50 bg-muted/50 rounded-b-xl', className)}>
      {children}
    </div>
  );
}
