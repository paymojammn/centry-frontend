/**
 * Custom hooks for organization data management
 * Uses React Query for efficient data fetching and caching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  OrganizationMember,
  OrganizationCreate,
  OrganizationUpdate,
  InviteUserPayload,
} from '@/types/organization';
import * as organizationApi from '@/lib/organization-api';

/**
 * Hook to fetch all organizations
 */
export function useOrganizations() {
  return useQuery({
    queryKey: ['organizations'],
    queryFn: organizationApi.getOrganizations,
  });
}

/**
 * Organizations the user can actually work in (per-org billing).
 *
 * Filters out orgs whose subscription no longer allows access —
 * billing_active === undefined (older API) is treated as selectable.
 * This is the list every org switcher must offer; use useOrganizations
 * only where inactive orgs should be visible (e.g. the management page).
 */
export function useSelectableOrganizations() {
  const query = useOrganizations();
  const organizations = (query.data?.results ?? []).filter(
    (org) => org.billing_active !== false
  );
  return { ...query, organizations };
}

/**
 * Hook to fetch a single organization
 */
export function useOrganization(id: string) {
  return useQuery({
    queryKey: ['organization', id],
    queryFn: () => organizationApi.getOrganization(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch organization members
 */
export function useOrganizationMembers(organizationId: string) {
  return useQuery({
    queryKey: ['organization', organizationId, 'members'],
    queryFn: () => organizationApi.getOrganizationMembers(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Hook to fetch organization stats
 */
export function useOrganizationStats(organizationId: string) {
  return useQuery({
    queryKey: ['organization', organizationId, 'stats'],
    queryFn: () => organizationApi.getOrganizationStats(organizationId),
    enabled: !!organizationId,
  });
}

/**
 * Hook to create an organization
 */
export function useCreateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: OrganizationCreate) => organizationApi.createOrganization(data),
    onSuccess: () => {
      // Invalidate and refetch organizations list
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

/**
 * Hook to update an organization
 */
export function useUpdateOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: OrganizationUpdate }) =>
      organizationApi.updateOrganization(id, data),
    onSuccess: (_, variables) => {
      // Invalidate specific organization and list
      queryClient.invalidateQueries({ queryKey: ['organization', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

/**
 * Hook to delete an organization
 */
export function useDeleteOrganization() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => organizationApi.deleteOrganization(id),
    onSuccess: () => {
      // Invalidate organizations list
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

/**
 * Memberships the current user may see — every org they belong to, or one
 * organization's when `organizationId` is given.
 */
export function useMemberships(organizationId?: string | null) {
  return useQuery({
    queryKey: ['memberships', organizationId ?? 'all'],
    queryFn: () => organizationApi.getMemberships(organizationId ?? undefined),
  });
}

/**
 * Invitations for one organization (or all the user's orgs)
 */
export function useInvitations(organizationId?: string | null) {
  return useQuery({
    queryKey: ['invitations', organizationId ?? 'all'],
    queryFn: () => organizationApi.getInvitations(organizationId ?? undefined),
  });
}

function useInvalidateUserManagement() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['memberships'] });
    queryClient.invalidateQueries({ queryKey: ['invitations'] });
    queryClient.invalidateQueries({ queryKey: ['organization'] });
    queryClient.invalidateQueries({ queryKey: ['user-profile'] });
  };
}

/**
 * Hook to send an invitation
 */
export function useSendInvitation() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: (data: InviteUserPayload) => organizationApi.sendInvitation(data),
    onSuccess: invalidate,
  });
}

export function useResendInvitation() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: (id: string) => organizationApi.resendInvitation(id),
    onSuccess: invalidate,
  });
}

export function useCancelInvitation() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: (id: string) => organizationApi.cancelInvitation(id),
    onSuccess: invalidate,
  });
}

export function useAcceptInvitation() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: (token: string) => organizationApi.acceptInvitation(token),
    onSuccess: invalidate,
  });
}

/**
 * Change a member's role (and/or custom permissions)
 */
export function useUpdateMembership() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<Pick<OrganizationMember, 'role' | 'permissions'>>;
    }) => organizationApi.updateMembership(id, data),
    onSuccess: invalidate,
  });
}

export function useRemoveMembership() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: (id: string) => organizationApi.removeMembership(id),
    onSuccess: invalidate,
  });
}

/**
 * Hook to activate/deactivate membership
 */
export function useToggleMembership() {
  const invalidate = useInvalidateUserManagement();
  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate
        ? organizationApi.activateMembership(id)
        : organizationApi.deactivateMembership(id),
    onSuccess: invalidate,
  });
}

export default {
  useOrganizations,
  useOrganization,
  useOrganizationMembers,
  useOrganizationStats,
  useCreateOrganization,
  useUpdateOrganization,
  useDeleteOrganization,
  useMemberships,
  useInvitations,
  useSendInvitation,
  useResendInvitation,
  useCancelInvitation,
  useAcceptInvitation,
  useUpdateMembership,
  useRemoveMembership,
  useToggleMembership,
};
