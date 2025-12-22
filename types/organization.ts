/**
 * Organization and Membership types matching Django backend
 */

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  primary_currency: string;
  supported_currencies: string[];
  industry?: string;
  company_size?: string;
  timezone: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
  members_count?: number;
  connections_count?: number;
}

export interface OrganizationDetail extends Organization {
  preferred_providers: AccountingProvider[];
}

export interface AccountingProvider {
  id: string;
  code: string;
  name: string;
  description?: string;
  is_active: boolean;
}

export interface OrganizationMember {
  id: string;
  user: {
    id: string;
    email: string;
    username: string;
    first_name: string;
    last_name: string;
    full_name: string;
  };
  user_email: string;
  user_name: string;
  organization: string;
  organization_name: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  is_active: boolean;
  permissions: Record<string, any>;
  invited_by?: string;
  joined_at: string;
  created_at: string;
  synced_from_erp: boolean;
  erp_connection?: string;
}

export interface OrganizationStats {
  total_members: number;
  total_connections: number;
  total_bank_imports: number;
  total_transactions: number;
}

export interface OrganizationInvitation {
  id: string;
  organization: string;
  organization_name: string;
  email: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions: Record<string, any>;
  invited_by: string;
  invited_by_name: string;
  invited_at: string;
  expires_at: string;
  accepted: boolean;
  accepted_at?: string;
  accepted_by?: string;
  token: string;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

// Form types for creating/updating
export interface OrganizationCreate {
  name: string;
  slug?: string;
  primary_currency?: string;
  supported_currencies?: string[];
  industry?: string;
  company_size?: string;
  timezone?: string;
  settings?: Record<string, any>;
}

export interface OrganizationUpdate extends Partial<OrganizationCreate> {}

export interface InviteUserPayload {
  email: string;
  organization: string;
  role: 'owner' | 'admin' | 'manager' | 'member' | 'viewer';
  permissions?: Record<string, any>;
}
