/**
 * Page Header Component
 *
 * Consistent header for all dashboard pages.
 * Features: title, subtitle, optional organization selector, and action buttons.
 */

'use client';

import { ReactNode } from 'react';
import { Building2, ChevronRight } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  billing_active?: boolean;
}

interface Breadcrumb {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: Breadcrumb[];
  organizations?: Organization[];
  selectedOrganizationId?: string | null;
  onOrganizationChange?: (id: string) => void;
  isLoadingOrgs?: boolean;
  children?: ReactNode; // For action buttons
  sticky?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  breadcrumbs,
  organizations,
  selectedOrganizationId,
  onOrganizationChange,
  isLoadingOrgs,
  children,
  sticky = false,
}: PageHeaderProps) {
  const showOrgSelector = organizations && onOrganizationChange;
  // Per-org billing: only offer orgs the user can actually work in. An
  // expired/suspended org is reachable only through the paywall flow, so it
  // has no place in the switcher. (billing_active === undefined means an
  // older API response — treat as selectable.)
  const selectableOrgs = organizations?.filter((org) => org.billing_active !== false);

  return (
    <div
      className={cn(
        'bg-card/95 backdrop-blur-sm border-b border-border shadow-sm',
        sticky && 'sticky top-0 z-10'
      )}
    >
      <div className="px-4 sm:px-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 pt-3 text-xs text-muted-foreground">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-foreground transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-foreground font-medium">{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* Main header content */}
        <div
          className={cn(
            'flex items-center justify-between',
            breadcrumbs ? 'h-14' : 'h-16'
          )}
        >
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showOrgSelector && (
              <Select
                value={selectedOrganizationId ?? ""}
                onValueChange={onOrganizationChange}
                disabled={isLoadingOrgs || !selectableOrgs?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-card border-border text-sm hover:border-muted-foreground/50 transition-colors">
                  <Building2 className="h-4 w-4 text-muted-foreground mr-2" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {selectableOrgs?.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

// Compact header variant for detail pages
interface CompactHeaderProps {
  title: string;
  backHref?: string;
  children?: ReactNode;
}

export function CompactHeader({ title, backHref, children }: CompactHeaderProps) {
  return (
    <div className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {backHref && (
              <a
                href={backHref}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180" />
              </a>
            )}
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
