'use client';

/**
 * The one organization switcher.
 *
 * Every place that lets the user pick their working organization renders
 * this component — PageHeader, the wallet page, the provider-account
 * picker. Keeping a single implementation is what guarantees the per-org
 * billing rule ("only offer orgs the user can actually work in") applies
 * everywhere at once instead of being re-implemented per page.
 *
 * Self-contained by default: fetches the user's organizations (React Query
 * dedupes with any page-level fetch) and filters to billing-active orgs.
 * Pass `organizations` to supply the list yourself — it is still filtered,
 * so a caller can never accidentally offer an expired org.
 */

import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useSelectableOrganizations } from '@/hooks/use-organization';

export interface OrganizationOption {
  id: string;
  name: string;
  /** Whether this org's subscription currently allows access (per-org billing). */
  billing_active?: boolean;
}

interface OrganizationSelectProps {
  value?: string | null;
  onValueChange: (id: string) => void;
  /** Optional list override; billing-inactive orgs are filtered out regardless. */
  organizations?: OrganizationOption[];
  disabled?: boolean;
  /** Extra classes for the trigger (e.g. a width like `w-[180px]` or `w-64`). */
  className?: string;
  placeholder?: string;
  showIcon?: boolean;
}

export function OrganizationSelect({
  value,
  onValueChange,
  organizations,
  disabled,
  className,
  placeholder = 'Select organization',
  showIcon = true,
}: OrganizationSelectProps) {
  const { organizations: fetched, isLoading } = useSelectableOrganizations();
  // billing_active === undefined means an older API response — treat as
  // selectable rather than hiding everything.
  const options = (organizations ?? fetched).filter((org) => org.billing_active !== false);
  const loading = !organizations && isLoading;

  return (
    <Select
      value={value ?? ''}
      onValueChange={onValueChange}
      disabled={disabled || loading || options.length === 0}
    >
      <SelectTrigger
        className={cn(
          'w-[200px] h-9 bg-card border-border text-sm hover:border-muted-foreground/50 transition-colors',
          className
        )}
      >
        {showIcon && <Building2 className="h-4 w-4 text-muted-foreground mr-2" />}
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            {org.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
