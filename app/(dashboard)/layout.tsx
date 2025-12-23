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
      const urlAccessToken = searchParams?.get('access_token');
      const urlRefreshToken = searchParams?.get('refresh_token');

      // If tokens in URL, save them and clean URL (security best practice)
      if (urlAccessToken) {
        localStorage.setItem('auth_token', urlAccessToken);
        if (urlRefreshToken) {
          localStorage.setItem('refresh_token', urlRefreshToken);
        }
        // Clean tokens from URL to prevent exposure in browser history
        const cleanUrl = pathname || '/dashboard';
        window.history.replaceState({}, '', cleanUrl);
      }

      // Check authentication - either from URL or localStorage
      const token = urlAccessToken || getAuthToken();

      if (!token) {
        // No token available, redirect to login
        const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
        router.push(`/auth/login${redirectUrl}`);
        return;
      }

      // Verify token by calling profile endpoint
      try {
        const response = await fetch('http://localhost:8000/api/auth/profile/', {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsLoading(false);
        } else {
          // Token invalid, clear storage and redirect to login
          localStorage.removeItem('auth_token');
          localStorage.removeItem('refresh_token');
          const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
          router.push(`/auth/login${redirectUrl}`);
        }
      } catch (err) {
        // Network error, redirect to login
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
