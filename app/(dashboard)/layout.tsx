'use client';

import { Layout1 } from '@/components/layouts/layout-1';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/lib/api';
import { ScreenLoader } from '@/components/screen-loader';

export default function DashboardLayout({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuth = async () => {
      // Check if tokens are in URL (OAuth callback)
      const urlToken = searchParams?.get('access_token');
      
      // If token in URL, save it
      if (urlToken) {
        localStorage.setItem('auth_token', urlToken);
      }
      
      // Check authentication - either from URL or localStorage
      const token = urlToken || getAuthToken();
      
      // Always verify authentication by calling profile endpoint
      // This works for both JWT tokens and session-based auth (Xero OAuth)
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      try {
        const response = await fetch('http://localhost:8000/api/auth/profile/', {
          credentials: 'include', // Include cookies for session auth
          headers,
        });
        
        if (response.ok) {
          // Valid authentication (token or session)
          setIsLoading(false);
        } else {
          // No valid authentication, redirect to login
          const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
          router.push(`/auth/login${redirectUrl}`);
        }
      } catch (err) {
        // Network error or server down, redirect to login
        const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
        router.push(`/auth/login${redirectUrl}`);
      }
    };
    
    checkAuth();
  }, [router, pathname, searchParams]);

  if (isLoading) {
    return <ScreenLoader />;
  }
  
  return (
    <Layout1>
      {children}
    </Layout1>
  );
}
