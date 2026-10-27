'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { FiscalConnection } from '@/types/fiscal';

export function connectionOptionLabel(c: FiscalConnection): string {
  const name = c.business_name || c.legal_name;
  return `${c.country_code} · TIN ${c.tin}${name ? ` · ${name}` : ''}`;
}

export function FiscalConnectionSelect({
  connections,
  value,
  onChange,
  placeholder = 'Select a fiscal connection',
  allowAll,
  id,
  className,
}: {
  connections: FiscalConnection[];
  value: string;
  onChange: (id: string) => void;
  placeholder?: string;
  /** Adds an "All connections" option with value "all". */
  allowAll?: boolean;
  id?: string;
  className?: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger id={id} className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="all">All connections</SelectItem>}
        {connections.map((c) => (
          <SelectItem key={c.id} value={c.id}>
            {connectionOptionLabel(c)}
            {!c.is_active ? ' (inactive)' : ''}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
