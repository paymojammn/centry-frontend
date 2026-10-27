/**
 * Hook for fetching current user profile data
 * Shared across topbar, profile page, and other components
 */

'use client';

import { useCallback, useSyncExternalStore } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SELECTED_ORGANIZATION_KEY, orgHasFeature } from '@/lib/features';

export interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  membership_role: string;
  permissions: Record<string, Record<string, boolean>>;
  /** Optional product areas enabled for the org (lib/features.ts keys). */
  features?: string[];
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  phone_number: string;
  profile_image: string;
  is_organization_user: boolean;
  is_superuser?: boolean;
  erp_provider: string;
  /** ERP the current session signed in with; scopes which orgs are visible. */
  login_provider: string | null;
  organizations_count: number;
  date_joined: string;
  organizations: UserOrganization[];
  primary_organization: {
    id: string;
    name: string;
    slug: string;
    membership_role: string | null;
    permissions: Record<string, Record<string, boolean>>;
    features?: string[];
  } | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.get<UserProfile>('/api/v1/users/me/'),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Default actions each organization role grants when a membership carries no
 * explicit permission for the app. Mirrors ROLE_DEFAULT_ACTIONS in the
 * backend (users/organization_models.py) — keep the two in step.
 */
export const ROLE_DEFAULT_ACTIONS: Record<string, string[]> = {
  owner: ['view', 'edit', 'delete', 'sync', 'approve', 'manage', 'create', 'export'],
  admin: ['view', 'edit', 'delete', 'sync', 'approve', 'create', 'export'],
  manager: ['view', 'edit', 'sync', 'approve'],
  member: ['view', 'edit'],
  viewer: ['view'],
  approver: ['view', 'approve', 'sync'],
  initiator: ['view', 'create', 'edit'],
};

/**
 * Whether a membership (role + explicit permissions) grants `app.action`.
 * Owners and admins have everything; an explicit per-app grant wins over the
 * role default, exactly like OrganizationMembership.has_permission.
 */
export function membershipHasPermission(
  role: string | null | undefined,
  permissions: Record<string, Record<string, boolean>> | undefined,
  permissionCode: string,
): boolean {
  if (role === 'owner' || role === 'admin') return true;
  const [app = '', action = ''] = permissionCode.split('.');
  if (!app || !action) return false;
  const explicit = permissions?.[app];
  if (explicit && action in explicit) return explicit[action] === true;
  return (ROLE_DEFAULT_ACTIONS[role ?? ''] ?? []).includes(action);
}

/**
 * Check if the current user has a specific permission (e.g., 'payments.approve')
 * in any of their organizations. Owners and admins automatically have all
 * permissions; other roles fall back to their role defaults.
 */
export function useHasPermission(permissionCode: string): boolean {
  const { data: user } = useCurrentUser();
  if (!user) return false;

  return (
    user.organizations?.some((org) =>
      membershipHasPermission(org.membership_role, org.permissions, permissionCode),
    ) ?? false
  );
}

// ---------------------------------------------------------------------------
// Selected organization + per-organization features
// ---------------------------------------------------------------------------

const SELECTED_ORGANIZATION_EVENT = 'centry:selected-organization';

function readSelectedOrganizationId(): string | null {
  try {
    return window.localStorage.getItem(SELECTED_ORGANIZATION_KEY);
  } catch {
    return null;
  }
}

function subscribeSelectedOrganization(onChange: () => void): () => void {
  window.addEventListener('storage', onChange);
  window.addEventListener(SELECTED_ORGANIZATION_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(SELECTED_ORGANIZATION_EVENT, onChange);
  };
}

/** Persist the working organization and notify same-tab subscribers. */
export function setSelectedOrganizationId(id: string): void {
  try {
    window.localStorage.setItem(SELECTED_ORGANIZATION_KEY, id);
  } catch {
    // per-viewer convenience only
  }
  window.dispatchEvent(new Event(SELECTED_ORGANIZATION_EVENT));
}

/**
 * The organization the app is currently working in — the shared
 * `selectedOrganizationId` localStorage key that login, the dashboard layout
 * and the org switchers write. `null` on the server and when nothing is set.
 */
export function useSelectedOrganizationId(): string | null {
  return useSyncExternalStore(
    subscribeSelectedOrganization,
    readSelectedOrganizationId,
    () => null,
  );
}

/**
 * Feature flags of one organization, read from `/users/me` organizations[].
 *
 * Resolves `organizationId`, else the selected organization, else the user's
 * first organization. `hasFeature` fails open when the org is unknown (see
 * lib/features.ts) so a superuser outside their memberships is never locked
 * out client-side; the API still enforces.
 */
export function useOrgFeatures(organizationId?: string | null) {
  const { data: user, isLoading } = useCurrentUser();
  const selectedId = useSelectedOrganizationId();
  const wantedId = organizationId ?? selectedId;
  const organizations = user?.organizations;
  const organization = wantedId
    ? organizations?.find((o) => o.id === wantedId)
    : organizations?.[0];

  const hasFeature = useCallback(
    (feature: string) => orgHasFeature(organization, feature),
    [organization],
  );

  return {
    organization,
    features: organization?.features ?? null,
    hasFeature,
    isLoading,
  };
}

/** Convenience: does the selected (or given) organization have `feature`? */
export function useHasFeature(feature: string, organizationId?: string | null): boolean {
  return useOrgFeatures(organizationId).hasFeature(feature);
}

/**
 * Whether the current user may manage users of `organizationId`
 * (owner/admin of that org, or a platform superuser).
 */
export function useCanManageOrganization(organizationId?: string | null): boolean {
  const { data: user } = useCurrentUser();
  if (!user || !organizationId) return false;
  if (user.is_superuser) return true;
  const org = user.organizations?.find((o) => o.id === organizationId);
  return org?.membership_role === 'owner' || org?.membership_role === 'admin';
}
