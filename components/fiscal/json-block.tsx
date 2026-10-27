'use client';

import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

/** Collapsible, pretty-printed JSON (request / response envelopes). */
export function JsonBlock({ title, data, defaultOpen = false }: { title: string; data: unknown; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const empty =
    data === null ||
    data === undefined ||
    (typeof data === 'object' && Object.keys(data as object).length === 0);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-2 px-3 py-2 text-sm font-medium text-foreground hover:bg-muted rounded-lg">
        <span>{title}</span>
        {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
      </CollapsibleTrigger>
      <CollapsibleContent>
        {empty ? (
          <p className="px-3 pb-3 text-xs text-muted-foreground">No data.</p>
        ) : (
          <pre className="mx-3 mb-3 max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
            {JSON.stringify(data, null, 2)}
          </pre>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
