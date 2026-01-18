'use client';

import { Layout1 } from '@/components/layouts/layout-1';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/lib/api';
import { getApiUrl } from '@/config/api';
import { ScreenLoader } from '@/components/screen-loader';
import { exchangeAuthCode } from '@/lib/billing-api';

export default function DashboardLayout({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuth = async () => {
      // Check for auth_code in URL (new secure OAuth callback)
      const authCode = searchParams?.get('auth_code');
      const subscriptionRequired = searchParams?.get('subscription_required');

      // If auth code in URL, exchange it for tokens
      if (authCode) {
        try {
          const tokenData = await exchangeAuthCode(authCode);

          // Store tokens
          localStorage.setItem('auth_token', tokenData.access_token);
          localStorage.setItem('refresh_token', tokenData.refresh_token);

          // Clean URL
          const cleanUrl = pathname || '/dashboard';
          window.history.replaceState({}, '', cleanUrl);

          // Check if subscription is required
          if (!tokenData.has_active_subscription) {
            router.push('/billing/subscribe');
            return;
          }

          setIsLoading(false);
          return;
        } catch (err) {
          console.error('Failed to exchange auth code:', err);
          // Auth code exchange failed, redirect to login
          router.push('/auth/login?error=auth_failed');
          return;
        }
      }

      // Legacy: Check if tokens are in URL (OAuth callback - keeping for backward compatibility)
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
        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/auth/profile/`, {
          headers: {
            'Accept': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
          setIsLoading(false);
        } else if (response.status === 402) {
          // Subscription required
          router.push('/billing/subscribe');
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
