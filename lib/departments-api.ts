/**
 * Departments API Client
 *
 * Handles department CRUD operations
 */

import api from './api';
import type {
  Department,
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  DepartmentFilters,
} from '@/types/department';

const BASE_URL = '/api/v1/erp/departments';

export const departmentsApi = {
  /**
   * Get all departments with filters
   */
  async getDepartments(
    filters?: DepartmentFilters
  ): Promise<Department[]> {
    const params = new URLSearchParams();
    if (filters?.organization_id) params.append('organization_id', filters.organization_id);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));
    if (filters?.parent) params.append('parent', filters.parent);
    if (filters?.search) params.append('search', filters.search);

    const queryString = params.toString();
    const url = queryString ? `${BASE_URL}/?${queryString}` : `${BASE_URL}/`;

    const response = await api.get(url);
    // Handle paginated response
    if (response && typeof response === 'object' && 'results' in response) {
      return (response as { results: Department[] }).results;
    }
    return response as Department[];
  },

  /**
   * Get a single department
   */
  async getDepartment(departmentId: string): Promise<Department> {
    return api.get(`${BASE_URL}/${departmentId}/`);
  },

  /**
   * Create a new department
   */
  async createDepartment(payload: CreateDepartmentPayload): Promise<Department> {
    return api.post(`${BASE_URL}/`, payload);
  },

  /**
   * Update a department
   */
  async updateDepartment(
    departmentId: string,
    payload: UpdateDepartmentPayload
  ): Promise<Department> {
    return api.patch(`${BASE_URL}/${departmentId}/`, payload);
  },

  /**
   * Delete a department
   */
  async deleteDepartment(departmentId: string): Promise<void> {
    return api.del(`${BASE_URL}/${departmentId}/`);
  },
};
