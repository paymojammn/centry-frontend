/**
 * Page Header Component
 *
 * Consistent header for all dashboard pages.
 * Features: title, optional organization selector, and action buttons.
 */

'use client';

import { ReactNode } from 'react';
import { Building2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Organization {
  id: string;
  name: string;
}

interface PageHeaderProps {
  title: string;
  organizations?: Organization[];
  selectedOrganizationId?: string | null;
  onOrganizationChange?: (id: string) => void;
  isLoadingOrgs?: boolean;
  children?: ReactNode; // For action buttons
}

export function PageHeader({
  title,
  organizations,
  selectedOrganizationId,
  onOrganizationChange,
  isLoadingOrgs,
  children,
}: PageHeaderProps) {
  const showOrgSelector = organizations && onOrganizationChange;

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
          <div className="flex items-center gap-3">
            {showOrgSelector && (
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={onOrganizationChange}
                disabled={isLoadingOrgs || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-white border-gray-200 text-sm">
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
