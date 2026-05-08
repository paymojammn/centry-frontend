/**
 * API Service for Centry Backend
 * Base URL and authentication configuration
 */

// Use relative URLs — Next.js rewrites proxy /api/* to the backend
const API_BASE_URL = '';

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

  // Determine if we should set Content-Type header
  const isFormData = body instanceof FormData;
  const defaultHeaders: Record<string, string> = {
    ...(token && { Authorization: `Bearer ${token}` }),
  };
  
  // Only set Content-Type for non-FormData requests
  if (!isFormData && fetchOptions.method !== 'GET') {
    defaultHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...fetchOptions,
    body,
    credentials: 'omit', // Using Bearer token auth, no cookies needed
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  });

  if (!response.ok) {
    // Capture the raw body once so we can surface real backend messages even
    // when the response isn't JSON (common when the proxy 404s or Django
    // returns its debug HTML page).
    const rawBody = await response.text().catch(() => '');
    let error: any;
    try {
      error = rawBody ? JSON.parse(rawBody) : {};
    } catch {
      const snippet = rawBody.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 200);
      error = { detail: `HTTP ${response.status} from ${url}${snippet ? ` — ${snippet}` : ''}` };
    }

    // Handle authentication errors — try refresh before logging out
    if (response.status === 401) {
      if (typeof window !== 'undefined') {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          try {
            const refreshResp = await fetch('/api/v1/users/token/refresh/', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ refresh: refreshToken }),
            });
            if (refreshResp.ok) {
              const data = await refreshResp.json();
              localStorage.setItem('auth_token', data.access || data.access_token);
              if (data.refresh || data.refresh_token) {
                localStorage.setItem('refresh_token', data.refresh || data.refresh_token);
              }
              // Retry the original request with the new token
              return apiRequest<T>(endpoint, options);
            }
          } catch {
            // Refresh failed — fall through to logout
          }
        }
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/auth/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    // Handle authorization errors
    if (response.status === 403) {
      throw new Error(error.detail || error.error || error.message || 'Access denied.');
    }

    // Handle payment required - subscription needed
    if (response.status === 402) {
      // Redirect to billing page
      if (typeof window !== 'undefined') {
        const redirect = error.redirect || '/billing/subscribe';
        window.location.href = redirect;
      }
      throw new Error(error.message || 'Subscription required to access this feature.');
    }

    // Special handling for currency conversion prompts (400 with requires_conversion)
    // This is not an error, but a prompt for user action
    if (response.status === 400 && error.requires_conversion) {
      return error as T;
    }

    throw new Error(error.detail || error.error || error.message || 'API request failed');
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
