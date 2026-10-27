'use client';

import { CheckCircle2, XCircle } from 'lucide-react';
import { summarizeItemResults } from '@/lib/fiscal';
import type { FiscalItemsResponse } from '@/types/fiscal';
import { JsonBlock } from './json-block';

/** Per-item outcome of a goods registration / stock adjustment. */
export function ItemResults({ result }: { result: FiscalItemsResponse }) {
  const { ok, failed } = summarizeItemResults(result);
  const items = result.results ?? [];
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <p className={`flex items-center gap-2 text-sm font-medium ${ok ? 'text-primary' : 'text-destructive'}`}>
        {ok ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
        {ok
          ? 'Accepted by the authority'
          : failed > 0
            ? `${failed} item${failed === 1 ? '' : 's'} failed`
            : 'Rejected by the authority'}
      </p>
      {items.length > 0 && (
        <ul className="divide-y divide-border text-sm">
          {items.map((r, i) => (
            <li key={`${r.good_code}-${i}`} className="flex items-start gap-2 py-1.5">
              {r.ok ? (
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
              ) : (
                <XCircle className="h-4 w-4 mt-0.5 shrink-0 text-destructive" />
              )}
              <span className="font-mono text-foreground">{r.good_code || '—'}</span>
              <span className="text-muted-foreground">{r.message}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="space-y-2">
        <JsonBlock title="Request" data={result.request} />
        <JsonBlock title="Response" data={result.response} />
      </div>
    </div>
  );
}
