/**
 * Empty State Component
 *
 * Consistent empty state display for lists and tables.
 */

'use client';

import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  children?: ReactNode; // For action buttons
}

export function EmptyState({ icon: Icon, title, description, children }: EmptyStateProps) {
  return (
    <div className="py-16 text-center">
      <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      )}
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
