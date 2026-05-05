import api from './api';

const BASE_URL = '/api/v1/approvals';

export interface ApprovalWorkflow {
  id: number | string;
  organization: string;
  organization_name: string;
  name: string;
  content_type: number;
  content_type_display: string;
  action: string;
  min_amount: string | null;
  max_amount: string | null;
  required_approvals: number;
  required_permission: string;
  allow_self_approval: boolean;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export type ApprovalWorkflowInput = Partial<
  Pick<
    ApprovalWorkflow,
    | 'name'
    | 'action'
    | 'min_amount'
    | 'max_amount'
    | 'required_approvals'
    | 'required_permission'
    | 'allow_self_approval'
    | 'is_active'
    | 'priority'
  >
> & {
  organization: string;
  content_type: number;
};

function listUrl(organizationId?: string, includeInactive?: boolean): string {
  const params = new URLSearchParams();
  if (organizationId) params.append('organization', organizationId);
  if (includeInactive) params.append('include_inactive', 'true');
  const qs = params.toString();
  return `${BASE_URL}/workflows/${qs ? `?${qs}` : ''}`;
}

export const approvalsApi = {
  async listWorkflows(organizationId?: string, includeInactive = true): Promise<ApprovalWorkflow[]> {
    const res = await api.get<{ results: ApprovalWorkflow[] } | ApprovalWorkflow[]>(
      listUrl(organizationId, includeInactive),
    );
    return Array.isArray(res) ? res : (res as any).results ?? [];
  },

  async createWorkflow(payload: ApprovalWorkflowInput): Promise<ApprovalWorkflow> {
    return api.post<ApprovalWorkflow>(`${BASE_URL}/workflows/`, payload);
  },

  async updateWorkflow(
    id: number | string,
    patch: Partial<ApprovalWorkflowInput>,
  ): Promise<ApprovalWorkflow> {
    return api.patch<ApprovalWorkflow>(`${BASE_URL}/workflows/${id}/`, patch);
  },

  async deleteWorkflow(id: number | string): Promise<void> {
    await api.del<void>(`${BASE_URL}/workflows/${id}/`);
  },

  async seedDefaults(organizationId: string): Promise<{ success: boolean; workflows: ApprovalWorkflow[] }> {
    return api.post(`${BASE_URL}/workflows/seed-defaults/`, { organization: organizationId });
  },
};
