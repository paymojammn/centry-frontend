/**
 * Custom hooks for organization data management
 * Uses React Query for efficient data fetching and caching
 */

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  Organization,
  OrganizationDetail,
  OrganizationMember,
  OrganizationStats,
  OrganizationCreate,
  OrganizationUpdate,
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
 * Hook to fetch current user's memberships
 */
export function useMemberships() {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: organizationApi.getMemberships,
  });
}

/**
 * Hook to fetch invitations
 */
export function useInvitations() {
  return useQuery({
    queryKey: ['invitations'],
    queryFn: organizationApi.getInvitations,
  });
}

/**
 * Hook to send an invitation
 */
export function useSendInvitation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: organizationApi.sendInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] });
    },
  });
}

/**
 * Hook to activate/deactivate membership
 */
export function useToggleMembership() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
      activate
        ? organizationApi.activateMembership(id)
        : organizationApi.deactivateMembership(id),
    onSuccess: (_, variables) => {
      // Invalidate memberships
      queryClient.invalidateQueries({ queryKey: ['memberships'] });
      queryClient.invalidateQueries({ 
        queryKey: ['organization', variables.id, 'members'] 
      });
    },
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
  useToggleMembership,
};
