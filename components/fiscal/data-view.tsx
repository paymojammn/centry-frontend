'use client';

import { formatCell, humanize, tabulate } from '@/lib/fiscal';

/**
 * Render authority output (goods inquiry, lookups) as a table when it is a
 * list of rows, key/value pairs when it is an object, else raw JSON.
 */
export function DataView({ data, maxColumns = 10 }: { data: unknown; maxColumns?: number }) {
  const shaped = tabulate(data);

  if (shaped.kind === 'table') {
    const columns = shaped.columns.slice(0, maxColumns);
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-professional">
          <thead>
            <tr>
              {columns.map((c) => (
                <th key={c}>{humanize(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {shaped.rows.map((row, i) => (
              <tr key={i}>
                {columns.map((c) => (
                  <td key={c} className="max-w-[240px] truncate" title={formatCell(row[c])}>
                    {formatCell(row[c])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (shaped.kind === 'pairs') {
    return (
      <div className="overflow-x-auto">
        <table className="w-full table-professional">
          <tbody className="divide-y divide-border">
            {shaped.rows.map(([k, v]) => (
              <tr key={k}>
                <td className="cell-muted w-1/3">{humanize(k)}</td>
                <td className="break-all">
                  {v !== null && typeof v === 'object' ? (
                    <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(v, null, 2)}</pre>
                  ) : (
                    formatCell(v)
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs text-foreground">
      {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
    </pre>
  );
}
