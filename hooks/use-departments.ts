/**
 * Departments React Query Hooks
 *
 * Hooks for department CRUD operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { departmentsApi } from '@/lib/departments-api';
import type {
  CreateDepartmentPayload,
  UpdateDepartmentPayload,
  DepartmentFilters,
} from '@/types/department';
import { toast } from 'sonner';

// Query keys
export const departmentKeys = {
  all: ['departments'] as const,
  lists: () => [...departmentKeys.all, 'list'] as const,
  list: (filters?: DepartmentFilters) => [...departmentKeys.lists(), filters] as const,
  details: () => [...departmentKeys.all, 'detail'] as const,
  detail: (id: string) => [...departmentKeys.details(), id] as const,
};

/**
 * Get departments with filters
 */
export function useDepartments(filters?: DepartmentFilters) {
  return useQuery({
    queryKey: departmentKeys.list(filters),
    queryFn: () => departmentsApi.getDepartments(filters),
    enabled: !!filters?.organization_id,
  });
}

/**
 * Get a single department
 */
export function useDepartment(departmentId: string) {
  return useQuery({
    queryKey: departmentKeys.detail(departmentId),
    queryFn: () => departmentsApi.getDepartment(departmentId),
    enabled: !!departmentId,
  });
}

/**
 * Create a new department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateDepartmentPayload) =>
      departmentsApi.createDepartment(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success('Department created');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to create department');
    },
  });
}

/**
 * Update a department
 */
export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      departmentId,
      payload,
    }: {
      departmentId: string;
      payload: UpdateDepartmentPayload;
    }) => departmentsApi.updateDepartment(departmentId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.detail(variables.departmentId) });
      queryClient.invalidateQueries({ queryKey: departmentKeys.lists() });
      toast.success('Department updated');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to update department');
    },
  });
}

/**
 * Delete a department
 */
export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (departmentId: string) => departmentsApi.deleteDepartment(departmentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: departmentKeys.all });
      toast.success('Department deleted');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete department');
    },
  });
}
