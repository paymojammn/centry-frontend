/**
 * Authentication utilities
 * Middleware for protecting routes and handling auth redirects
 */

'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken } from '@/lib/api';

/**
 * Hook to check if user is authenticated
 */
export function useAuth() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const token = getAuthToken();
    
    // If no token and not on login page, redirect to login
    if (!token && !pathname?.startsWith('/auth/login')) {
      const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.push(`/auth/login${redirectUrl}`);
    }
  }, [router, pathname]);

  return {
    isAuthenticated: !!getAuthToken(),
  };
}

/**
 * Check if user is authenticated (for server-side checks)
 */
export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getAuthToken();
}
