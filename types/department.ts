/**
 * Department Types
 *
 * TypeScript definitions for organizational departments
 */

export interface Department {
  id: string;
  organization_id: string;
  organization_name: string;
  name: string;
  code: string;
  description: string;
  parent: string | null;
  parent_name: string | null;
  manager: string | null;
  manager_name: string | null;
  manager_email: string | null;
  monthly_budget: string | null;
  currency: string;
  is_active: boolean;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface CreateDepartmentPayload {
  organization_id: string;
  name: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
  manager_id?: string | null;
  monthly_budget?: number | null;
  currency?: string;
  is_active?: boolean;
}

export interface UpdateDepartmentPayload {
  name?: string;
  code?: string;
  description?: string;
  parent_id?: string | null;
  manager_id?: string | null;
  monthly_budget?: number | null;
  currency?: string;
  is_active?: boolean;
}

export interface DepartmentFilters {
  organization_id?: string;
  is_active?: boolean;
  parent?: string;
  search?: string;
}
