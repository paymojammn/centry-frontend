/**
 * Runtime API Configuration
 * 
 * This file provides a way to configure the API URL at runtime,
 * allowing different environments to use different API endpoints
 * without requiring a rebuild.
 */

export function getApiUrl(): string {
  // Check if we're in the browser
  if (typeof window !== 'undefined') {
    // Try to get from window.__ENV__ (can be injected at runtime)
    const windowEnv = (window as any).__ENV__;
    if (windowEnv?.NEXT_PUBLIC_API_URL) {
      return windowEnv.NEXT_PUBLIC_API_URL;
    }
  }

  // Fall back to environment variable (build-time)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  // Default
  return 'http://localhost:8000';
}

export function getEnvironment(): string {
  if (typeof window !== 'undefined') {
    const windowEnv = (window as any).__ENV__;
    if (windowEnv?.NEXT_PUBLIC_ENVIRONMENT) {
      return windowEnv.NEXT_PUBLIC_ENVIRONMENT;
    }
  }

  return process.env.NEXT_PUBLIC_ENVIRONMENT || 'development';
}
