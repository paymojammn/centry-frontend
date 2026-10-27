'use client';

/**
 * The working organization for the Fiscalization pages: the app-wide
 * selected organization (so the feature gate and the page agree), with the
 * selectable organizations for the PageHeader switcher.
 */

import { useSelectableOrganizations } from '@/hooks/use-organization';
import { setSelectedOrganizationId, useSelectedOrganizationId } from '@/hooks/use-user';

export function useFiscalOrganization() {
  const { organizations, isLoading } = useSelectableOrganizations();
  const saved = useSelectedOrganizationId();
  const organizationId =
    saved && organizations.some((o) => o.id === saved) ? saved : (organizations[0]?.id ?? null);

  return {
    organizations,
    organizationId,
    setOrganizationId: setSelectedOrganizationId,
    isLoadingOrgs: isLoading,
  };
}
