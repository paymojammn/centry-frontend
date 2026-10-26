/**
 * Organization API Service
 * Handles all organization-related API calls
 */

import { get, post, patch, del } from './api';
import { getApiUrl } from '@/config/api';
import type {
  Organization,
  OrganizationDetail,
  OrganizationMember,
  OrganizationStats,
  OrganizationInvitation,
  InvitationLookup,
  MembershipRole,
  PaginatedResponse,
  OrganizationCreate,
  OrganizationUpdate,
  InviteUserPayload,
} from '@/types/organization';

/**
 * Get all organizations for the current user
 */
export async function getOrganizations(): Promise<PaginatedResponse<Organization>> {
  return get<PaginatedResponse<Organization>>('/api/v1/erp/organizations/');
}

/**
 * Get a specific organization by ID
 */
export async function getOrganization(id: string): Promise<OrganizationDetail> {
  return get<OrganizationDetail>(`/api/v1/erp/organizations/${id}/`);
}

/**
 * Create a new organization
 */
export async function createOrganization(
  data: OrganizationCreate
): Promise<Organization> {
  return post<Organization>('/api/v1/erp/organizations/', data);
}

/**
 * Update an organization
 */
export async function updateOrganization(
  id: string,
  data: OrganizationUpdate
): Promise<Organization> {
  return patch<Organization>(`/api/v1/erp/organizations/${id}/`, data);
}

/**
 * Delete an organization
 */
export async function deleteOrganization(id: string): Promise<void> {
  return del<void>(`/api/v1/erp/organizations/${id}/`);
}

/**
 * Clear selected data categories for an organization
 */
export async function clearOrganizationData(
  id: string,
  categories: string[]
): Promise<{ cleared: Record<string, number> }> {
  return post<{ cleared: Record<string, number> }>(
    `/api/v1/erp/organizations/${id}/clear_data/`,
    { categories }
  );
}

/**
 * Queued organization re-sync. The work runs in a Celery task; poll the
 * sync-logs endpoint (see `useSyncLogs`) for the per-connection results.
 */
export interface ResyncOrganizationResponse {
  status: 'queued' | string;
  task_id: string;
  organization_id: string;
  connection_ids: string[];
  message: string;
}

/**
 * Re-sync organization data from connected ERP systems (202, background)
 */
export async function resyncOrganizationData(id: string): Promise<ResyncOrganizationResponse> {
  return post<ResyncOrganizationResponse>(`/api/v1/erp/organizations/${id}/resync/`);
}

/**
 * Get organization members
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  return get<OrganizationMember[]>(`/api/v1/erp/organizations/${organizationId}/members/`);
}

/**
 * Get organization statistics
 */
export async function getOrganizationStats(
  organizationId: string
): Promise<OrganizationStats> {
  return get<OrganizationStats>(`/api/v1/erp/organizations/${organizationId}/stats/`);
}

/**
 * Memberships visible to the current user (every org they belong to), or
 * those of one organization when `organizationId` is given.
 */
export async function getMemberships(
  organizationId?: string
): Promise<PaginatedResponse<OrganizationMember>> {
  return get<PaginatedResponse<OrganizationMember>>('/api/v1/memberships/', {
    params: organizationId ? { organization: organizationId, page_size: 500 } : { page_size: 500 },
  });
}

/**
 * Add an existing user to an organization with a role
 */
export async function createMembership(data: {
  user: string;
  organization: string;
  role: MembershipRole;
  permissions?: Record<string, unknown>;
}): Promise<OrganizationMember> {
  return post<OrganizationMember>('/api/v1/memberships/', data);
}

/**
 * Remove a membership from an organization
 */
export async function removeMembership(id: string): Promise<void> {
  return del<void>(`/api/v1/memberships/${id}/`);
}

/**
 * Get a specific membership
 */
export async function getMembership(id: string): Promise<OrganizationMember> {
  return get<OrganizationMember>(`/api/v1/memberships/${id}/`);
}

/**
 * Update a membership
 */
export async function updateMembership(
  id: string,
  data: Partial<Pick<OrganizationMember, 'role' | 'permissions'>>
): Promise<OrganizationMember> {
  return patch<OrganizationMember>(`/api/v1/memberships/${id}/`, data);
}

/**
 * Activate a membership
 */
export async function activateMembership(id: string): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(`/api/v1/memberships/${id}/activate/`);
}

/**
 * Deactivate a membership
 */
export async function deactivateMembership(
  id: string
): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(`/api/v1/memberships/${id}/deactivate/`);
}

/**
 * Invitations for organizations the user belongs to, optionally one org only
 */
export async function getInvitations(
  organizationId?: string
): Promise<PaginatedResponse<OrganizationInvitation>> {
  return get<PaginatedResponse<OrganizationInvitation>>('/api/v1/invitations/', {
    params: organizationId ? { organization: organizationId, page_size: 500 } : { page_size: 500 },
  });
}

/**
 * Send an invitation
 */
export async function sendInvitation(
  data: InviteUserPayload
): Promise<OrganizationInvitation> {
  return post<OrganizationInvitation>('/api/v1/invitations/', data);
}

/**
 * Resend an invitation
 */
export async function resendInvitation(
  id: string
): Promise<{ status: string; message: string; email: string }> {
  return post<{ status: string; message: string; email: string }>(
    `/api/v1/invitations/${id}/resend/`
  );
}

/**
 * Cancel a pending invitation
 */
export async function cancelInvitation(id: string): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(`/api/v1/invitations/${id}/cancel/`);
}

/**
 * Public preview of an invitation (no auth) so the accept page can render
 * before the invitee signs in. Uses a bare fetch: the shared client would
 * attach a stale Bearer token and bounce to login on 401.
 */
export async function lookupInvitation(token: string): Promise<InvitationLookup> {
  const base = (getApiUrl() || '').replace(/\/$/, '');
  const res = await fetch(
    `${base}/api/v1/invitations/lookup/?token=${encodeURIComponent(token)}`,
    { credentials: 'omit' }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || body?.detail || 'This invitation link is not valid.');
  }
  return body as InvitationLookup;
}

/**
 * Accept an invitation as the signed-in user
 */
export async function acceptInvitation(
  token: string
): Promise<{ status: string; message: string; organization_id: string; membership: OrganizationMember }> {
  return post('/api/v1/invitations/accept/', { token });
}

export default {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  clearOrganizationData,
  resyncOrganizationData,
  getOrganizationMembers,
  getOrganizationStats,
  getMemberships,
  getMembership,
  createMembership,
  updateMembership,
  removeMembership,
  activateMembership,
  deactivateMembership,
  getInvitations,
  sendInvitation,
  resendInvitation,
  cancelInvitation,
  lookupInvitation,
  acceptInvitation,
};
