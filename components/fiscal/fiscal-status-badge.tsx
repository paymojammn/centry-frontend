import { StatusBadge } from '@/components/ui/status-badge';
import { fiscalStatusBadge } from '@/lib/fiscal';

export function FiscalStatusBadge({
  status,
  label,
  size,
}: {
  status: string;
  label?: string;
  size?: 'sm' | 'md';
}) {
  const mapped = fiscalStatusBadge(status, label);
  return <StatusBadge status={mapped.badge} label={mapped.label} size={size} />;
}
