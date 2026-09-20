'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Prev/next pager for the registry's server-paginated lists (50 per page). */
export function RegistryPager({
  page,
  count,
  pageSize = 50,
  hasNext,
  onPageChange,
  noun,
  plural = `${noun}s`,
}: {
  page: number;
  count: number;
  pageSize?: number;
  hasNext: boolean;
  onPageChange: (page: number) => void;
  noun: string;
  plural?: string;
}) {
  if (count <= pageSize && page === 1) {
    return (
      <p className="text-xs text-muted-foreground">
        {count.toLocaleString()} {count === 1 ? noun : plural}
      </p>
    );
  }
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, count);
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs text-muted-foreground">
        {from.toLocaleString()}–{to.toLocaleString()} of {count.toLocaleString()} {plural}
      </p>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={!hasNext}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
