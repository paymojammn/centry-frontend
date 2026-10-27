/**
 * Organization and Membership types matching Django backend
 */

export interface OrganizationSettings {
  theme?: string;
  locale?: string;
  notifications?: boolean;
  [key: string]: unknown;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  currency?: string;
  primary_currency: string;
  supported_currencies: string[];
  country_code?: string | null;
  country_name?: string | null;
  industry?: string;
  company_size?: string;
  timezone: string;
  settings: OrganizationSettings;
  created_at: string;
  updated_at: string;
  members_count?: number;
  connections_count?: number;
  /** Whether this org's subscription currently allows access (per-org billing). */
  billing_active?: boolean;
  billing_status?: string;
  /** Optional product areas enabled for this org (lib/features.ts keys). */
  features?: string[];
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

/**
 * Organization roles (mirrors users.organization_models.OrganizationRole).
 * Approver/Initiator are the maker-checker pair; Manager/Member are legacy
 * roles still present on older memberships.
 */
export type MembershipRole =
  | 'owner'
  | 'admin'
  | 'approver'
  | 'initiator'
  | 'viewer'
  | 'manager'
  | 'member';

export const ROLE_LABELS: Record<MembershipRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  approver: 'Approver',
  initiator: 'Initiator',
  viewer: 'Viewer',
  manager: 'Manager',
  member: 'Member',
};

/** Roles offered when inviting or re-assigning; legacy roles are display-only. */
export const ASSIGNABLE_ROLES: MembershipRole[] = ['owner', 'admin', 'approver', 'initiator', 'viewer'];

export const ROLE_DESCRIPTIONS: Record<MembershipRole, string> = {
  owner: 'Full control, including billing and ownership transfer',
  admin: 'Manage users, settings and all transactions',
  approver: 'Review and approve payments prepared by others',
  initiator: 'Prepare payments and edit records; cannot approve',
  viewer: 'Read-only access',
  manager: 'Legacy: edit, sync and approve',
  member: 'Legacy: view and edit',
};

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as MembershipRole] ?? role.charAt(0).toUpperCase() + role.slice(1);
}

export interface OrganizationMember {
  id: string;
  /** User id (the API returns the primary key, not a nested object). */
  user: string;
  user_email: string;
  user_name: string;
  organization: string;
  organization_name: string;
  role: MembershipRole;
  role_display?: string;
  is_active: boolean;
  is_primary?: boolean;
  permissions: Record<string, unknown>;
  erp_user_role?: string;
  invited_by?: string | null;
  invited_by_name?: string | null;
  invited_at?: string | null;
  joined_at: string;
  updated_at?: string;
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
  role: MembershipRole;
  role_display?: string;
  permissions: Record<string, unknown>;
  invited_by: string;
  invited_by_name: string;
  invited_at: string;
  expires_at: string;
  accepted: boolean;
  accepted_at?: string | null;
  is_expired: boolean;
  status: 'pending' | 'expired' | 'accepted';
  /** Only present on the create/resend response. */
  email_sent?: boolean;
}

/** Public preview returned by GET /api/v1/invitations/lookup/?token= */
export interface InvitationLookup {
  organization_id: string;
  organization_name: string;
  email: string;
  role: MembershipRole;
  role_display: string;
  invited_by_name: string;
  expires_at: string;
  is_expired: boolean;
  accepted: boolean;
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
  settings?: OrganizationSettings;
}

export type OrganizationUpdate = Partial<OrganizationCreate> & {
  /** Superusers only — the API rejects it for everyone else. */
  features?: string[];
};

export interface InviteUserPayload {
  email: string;
  organization: string;
  role: MembershipRole;
  permissions?: Record<string, unknown>;
}
