'use client';

/**
 * Users — manage who has access to an organization and with which role.
 * Header carries the org switcher; the panel does the rest.
 */

import { useEffect, useState } from 'react';
import { PageHeader } from '@/components/layout/page-header';
import { MembersPanel } from '@/components/organizations/members-panel';
import { useSelectableOrganizations } from '@/hooks/use-organization';

const STORAGE_KEY = 'selectedOrganizationId';

export default function UsersPage() {
  const { organizations, isLoading } = useSelectableOrganizations();
  const [organizationId, setOrganizationId] = useState<string | null>(null);

  // Default to the org the rest of the app is working in, else the first one.
  useEffect(() => {
    if (organizationId || organizations.length === 0) return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(STORAGE_KEY);
    } catch {
      remembered = null;
    }
    const match = organizations.find((o) => o.id === remembered) ?? organizations[0];
    if (match) setOrganizationId(match.id);
  }, [organizations, organizationId]);

  const handleChange = (id: string) => {
    setOrganizationId(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // per-viewer convenience only
    }
  };

  const current = organizations.find((o) => o.id === organizationId);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Users"
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={handleChange}
        isLoadingOrgs={isLoading}
      />
      <div className="px-6 py-6">
        <MembersPanel organizationId={organizationId} organizationName={current?.name} />
      </div>
    </div>
  );
}
