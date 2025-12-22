// Authentication types matching Django backend
export interface User {
  id: string;
  email: string;
  name: string;
  organization?: {
    id: string;
    name: string;
  };
  xero?: {
    tenant_id: string;
    tenant_name: string;
  };
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface XeroAuthResponse {
  success: boolean;
  message?: string;
  redirect_url?: string;
  user?: User;
}

// Django ERP Connection response
export interface ERPConnection {
  id: string;
  name: string;
  provider: {
    id: string;
    code: string;
    name: string;
  };
  organization: {
    id: string;
    name: string;
  };
  status: string;
  is_active: boolean;
  context_id?: string;
  auth_data?: {
    tenant_id?: string;
    tenants?: Array<{
      tenantId: string;
      tenantName: string;
      tenantType: string;
    }>;
  };
}
