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
        'bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm',
        sticky && 'sticky top-0 z-10'
      )}
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Breadcrumbs */}
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 pt-3 text-xs text-gray-500">
            {breadcrumbs.map((crumb, index) => (
              <span key={index} className="flex items-center gap-1.5">
                {index > 0 && <ChevronRight className="h-3 w-3" />}
                {crumb.href ? (
                  <a
                    href={crumb.href}
                    className="hover:text-gray-900 transition-colors"
                  >
                    {crumb.label}
                  </a>
                ) : (
                  <span className="text-gray-900 font-medium">{crumb.label}</span>
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
            <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            {showOrgSelector && (
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={onOrganizationChange}
                disabled={isLoadingOrgs || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-white border-gray-200 text-sm hover:border-gray-300 transition-colors">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org) => (
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
    <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-sm">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            {backHref && (
              <a
                href={backHref}
                className="p-1.5 -ml-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <ChevronRight className="h-5 w-5 text-gray-400 rotate-180" />
              </a>
            )}
            <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          </div>
          {children && <div className="flex items-center gap-3">{children}</div>}
        </div>
      </div>
    </div>
  );
}
