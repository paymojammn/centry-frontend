/**
 * Page Header Component
 *
 * Consistent header for all dashboard pages.
 * Features: title, subtitle, optional organization selector, and action buttons.
 */

'use client';

import { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { OrganizationSelect } from '@/components/layout/organization-select';
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

  return (
    <div
      className={cn(
        'bg-background/95 backdrop-blur-sm border-b border-border',
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
        {/* One line: title left, org switcher + actions right. The subtitle
            prop is accepted for compatibility but intentionally not rendered —
            page headers carry a heading only. */}
        <div
          className={cn(
            'flex items-center justify-between gap-4',
            breadcrumbs ? 'h-12' : 'h-14'
          )}
        >
          <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          <div className="flex items-center gap-3">
            {showOrgSelector && (
              <OrganizationSelect
                value={selectedOrganizationId}
                onValueChange={onOrganizationChange}
                organizations={organizations}
                disabled={isLoadingOrgs}
              />
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
    <div className="bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="px-4 sm:px-6">
        <div className="flex items-center justify-between gap-4 h-14">
          <div className="flex items-center gap-3">
            {backHref && (
              <a
                href={backHref}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-muted transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-muted-foreground rotate-180" />
              </a>
            )}
            <h1 className="truncate text-lg font-semibold tracking-tight text-foreground">{title}</h1>
          </div>
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
