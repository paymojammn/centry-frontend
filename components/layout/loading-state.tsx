/**
 * Loading State Component
 *
 * Consistent loading spinner for pages and sections.
 */

'use client';

import { Loader2 } from 'lucide-react';

interface LoadingStateProps {
  fullPage?: boolean;
}

export function LoadingState({ fullPage = false }: LoadingStateProps) {
  if (fullPage) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}
