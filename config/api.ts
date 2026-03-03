/**
 * Centralized API Configuration for Centry Frontend
 * All API endpoints and configuration should be defined here
 */

interface WindowEnv {
  NEXT_PUBLIC_API_URL?: string;
  NEXT_PUBLIC_ENVIRONMENT?: string;
}

declare global {
  interface Window {
    __ENV__?: WindowEnv;
  }
}

// Runtime API URL getter — returns the real backend URL
// Used for direct browser redirects (e.g., Xero OAuth), NOT for fetch calls
export function getApiUrl(): string {
  if (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_API_URL) {
    return window.__ENV__.NEXT_PUBLIC_API_URL;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
}

export function getEnvironment(): string {
  if (typeof window !== 'undefined' && window.__ENV__?.NEXT_PUBLIC_ENVIRONMENT) {
    return window.__ENV__.NEXT_PUBLIC_ENVIRONMENT;
  }
  return process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
}

// Static API base URL for build-time usage
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// API Configuration
export const API_CONFIG = {
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000,
} as const;

// API Endpoints - organized by domain
export const API_ENDPOINTS = {
  // Authentication
  auth: {
    login: '/api/v1/users/login/',
    logout: '/api/v1/users/logout/',
    refresh: '/api/v1/users/token/refresh/',
    register: '/api/v1/users/register/',
    profile: '/api/v1/users/profile/',
  },

  // Organizations
  organizations: {
    list: '/api/v1/users/organizations/',
    detail: (id: string) => `/api/v1/users/organizations/${id}/`,
    members: (id: string) => `/api/v1/users/organizations/${id}/members/`,
  },

  // Banking
  banking: {
    base: '/api/v1/banking',
    accounts: '/api/v1/banking/accounts/',
    providers: '/api/v1/banking/providers/',
    imports: '/api/v1/banking/imports/',
    transactions: '/api/v1/banking/transactions/',
    reconciliation: '/api/v1/banking/reconciliation/',
  },

  // Xero / ERP Integration
  xero: {
    base: '/api/v1/xero',
    bills: '/api/v1/xero/bills/',
    billsStats: '/api/v1/xero/bills/stats/',
    contacts: '/api/v1/xero/contacts/',
    invoices: '/api/v1/xero/invoices/',
    connections: '/api/v1/xero/connections/',
    currencies: '/api/v1/xero/currencies/',
  },

  // Expenses
  expenses: {
    base: '/api/v1/expenses',
    list: '/api/v1/expenses/',
    detail: (id: string) => `/api/v1/expenses/${id}/`,
    submit: (id: string) => `/api/v1/expenses/${id}/submit/`,
    approve: (id: string) => `/api/v1/expenses/${id}/approve/`,
    reject: (id: string) => `/api/v1/expenses/${id}/reject/`,
  },

  // Payments
  payments: {
    base: '/api/payments',
    currency: '/api/payments/currency/',
    mobileMoney: '/api/payments/mobile-money/',
    bankTransfer: '/api/payments/bank-transfer/',
    sources: '/api/payments/sources/',
  },

  // Wallet
  wallet: {
    base: '/api/wallet',
    balance: '/api/wallet/balance/',
    transactions: '/api/wallet/transactions/',
    deposit: '/api/wallet/deposit/',
    withdraw: '/api/wallet/withdraw/',
  },

  // Security
  security: {
    auditLogs: '/api/v1/security/audit-logs/',
    auditStats: '/api/v1/security/audit-logs/stats/',
  },

  // Purchases
  purchases: {
    base: '/api/v1/purchases',
    payables: '/api/v1/purchases/payables/',
    vendors: '/api/v1/purchases/vendors/',
  },
} as const;

// HTTP Status Codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Error Messages
export const API_ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  UNAUTHORIZED: 'Session expired. Please log in again.',
  FORBIDDEN: 'You do not have permission to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  UNKNOWN_ERROR: 'An unexpected error occurred.',
} as const;

// Helper to build full URL
export function buildApiUrl(endpoint: string): string {
  if (endpoint.startsWith('http')) {
    return endpoint;
  }
  const base = getApiUrl();
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${normalizedBase}${normalizedPath}`;
}

// Helper to build full media URL (for receipts, attachments, etc.)
export function buildMediaUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http')) {
    return path;
  }
  const base = getApiUrl();
  const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
}
