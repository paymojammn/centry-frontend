/**
 * Organization API Service
 * Handles all organization-related API calls
 */

import { get, post, patch, del } from './api';
import type {
  Organization,
  OrganizationDetail,
  OrganizationMember,
  OrganizationStats,
  OrganizationInvitation,
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
 * Get all memberships for the current user
 */
export async function getMemberships(): Promise<PaginatedResponse<OrganizationMember>> {
  return get<PaginatedResponse<OrganizationMember>>('/api/v1/erp/memberships/');
}

/**
 * Get a specific membership
 */
export async function getMembership(id: string): Promise<OrganizationMember> {
  return get<OrganizationMember>(`/api/v1/erp/memberships/${id}/`);
}

/**
 * Update a membership
 */
export async function updateMembership(
  id: string,
  data: Partial<Pick<OrganizationMember, 'role' | 'permissions'>>
): Promise<OrganizationMember> {
  return patch<OrganizationMember>(`/api/v1/erp/memberships/${id}/`, data);
}

/**
 * Activate a membership
 */
export async function activateMembership(id: string): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(`/api/v1/erp/memberships/${id}/activate/`);
}

/**
 * Deactivate a membership
 */
export async function deactivateMembership(
  id: string
): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>(`/api/v1/erp/memberships/${id}/deactivate/`);
}

/**
 * Get invitations for organizations the user manages
 */
export async function getInvitations(): Promise<PaginatedResponse<OrganizationInvitation>> {
  return get<PaginatedResponse<OrganizationInvitation>>('/api/v1/erp/invitations/');
}

/**
 * Send an invitation
 */
export async function sendInvitation(
  data: InviteUserPayload
): Promise<OrganizationInvitation> {
  return post<OrganizationInvitation>('/api/v1/erp/invitations/', data);
}

/**
 * Resend an invitation
 */
export async function resendInvitation(
  id: string
): Promise<{ status: string; message: string; email: string }> {
  return post<{ status: string; message: string; email: string }>(
    `/api/v1/erp/invitations/${id}/resend/`
  );
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(id: string): Promise<void> {
  return del<void>(`/api/v1/erp/invitations/${id}/`);
}

/**
 * Accept an invitation
 */
export async function acceptInvitation(token: string): Promise<{ status: string; message: string }> {
  return post<{ status: string; message: string }>('/api/v1/erp/invitations/accept/', { token });
}

export default {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationMembers,
  getOrganizationStats,
  getMemberships,
  getMembership,
  updateMembership,
  activateMembership,
  deactivateMembership,
  getInvitations,
  sendInvitation,
  resendInvitation,
  cancelInvitation,
  acceptInvitation,
};
