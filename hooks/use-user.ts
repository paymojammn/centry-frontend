/**
 * Hook for fetching current user profile data
 * Shared across topbar, profile page, and other components
 */

'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';

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
  erp_provider: string;
  organizations_count: number;
  date_joined: string;
  organizations: Array<{
    id: string;
    name: string;
    slug: string;
    membership_role: string;
    permissions: Record<string, Record<string, boolean>>;
  }>;
  primary_organization: {
    id: string;
    name: string;
    slug: string;
    membership_role: string | null;
    permissions: Record<string, Record<string, boolean>>;
  } | null;
}

export function useCurrentUser() {
  return useQuery({
    queryKey: ['user-profile'],
    queryFn: () => api.get<UserProfile>('/api/v1/users/me/'),
    staleTime: 5 * 60 * 1000,
  });
}
