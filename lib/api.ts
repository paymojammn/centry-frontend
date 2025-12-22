/**
 * API Service for Centry Backend
 * Base URL and authentication configuration
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean>;
  responseType?: 'json' | 'blob';
}

/**
 * Get CSRF token from cookies
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const name = 'csrftoken';
  const cookies = document.cookie.split(';');
  for (let cookie of cookies) {
    const [key, value] = cookie.trim().split('=');
    if (key === name) return value;
  }
  return null;
}

/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { params, headers, body, responseType = 'json', ...fetchOptions } = options;

  // Build URL with query parameters
  let url = `${API_BASE_URL}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      searchParams.append(key, String(value));
    });
    url += `?${searchParams.toString()}`;
  }

  // Get token from localStorage or cookies
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('auth_token') 
    : null;

  // Get CSRF token for non-GET requests
  const csrfToken = getCsrfToken();

  // Determine if we should set Content-Type header
  const isFormData = body instanceof FormData;
  const defaultHeaders: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
    ...(csrfToken && fetchOptions.method !== 'GET' && { 'X-CSRFToken': csrfToken }),
  };
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData && fetchOptions.method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    body,
    credentials: 'include', // Include cookies for session auth (Xero OAuth, etc.)
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      detail: 'An error occurred',
    }));

    // Handle authentication/authorization errors - redirect to login
    if (response.status === 401 || response.status === 403) {
      // Clear auth token and redirect to login
      if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        // Redirect to login page
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired or access denied. Please log in again.');
    }

    // Special handling for currency conversion prompts (400 with requires_conversion)
    // This is not an error, but a prompt for user action
    if (response.status === 400 && error.requires_conversion) {
      return error as T;
    }

    throw new Error(error.detail || error.message || 'API request failed');
  }

  // Return the appropriate response type
  if (responseType === 'blob') {
    return response.blob() as Promise<T>;
  }
  
  return response.json();
}

/**
 * GET request
 */
export function get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'GET' });
}

/**
 * POST request
 */
export function post<T>(
  endpoint: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'POST',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * PUT request
 */
export function put<T>(
  endpoint: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PUT',
    body: data instanceof FormData ? data : JSON.stringify(data),
  });
}

/**
 * PATCH request
 */
export function patch<T>(
  endpoint: string,
  data?: any,
  options?: RequestOptions
): Promise<T> {
  return apiRequest<T>(endpoint, {
    ...options,
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE request
 */
export function del<T>(endpoint: string, options?: RequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: 'DELETE' });
}

/**
 * Set authentication token
 */
export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
  }
}

/**
 * Remove authentication token and clear server session
 */
export async function clearAuthToken() {
  try {
    // Call backend logout to clear Django session
    await post('/api/auth/logout/', {});
  } catch (error) {
    // Continue with client-side cleanup even if backend call fails
    console.error('Logout endpoint error:', error);
  } finally {
    // Always clear client-side tokens
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

/**
 * Get current auth token
 */
export function getAuthToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

export const api = {
  get,
  post,
  put,
  patch,
  del,
  setAuthToken,
  clearAuthToken,
  getAuthToken,
};

export default api;
