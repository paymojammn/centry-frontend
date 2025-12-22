'use client';

import { Layout1 } from '@/components/layouts/layout-1';
import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { getAuthToken } from '@/lib/api';
import { ScreenLoader } from '@/components/screen-loader';

export default function Layout({children}: {children: ReactNode}) {
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Check if tokens are in URL (OAuth callback)
    const urlToken = searchParams?.get('access_token');
    
    // Check authentication - either from URL or localStorage
    const token = urlToken || getAuthToken();
    
    if (!token) {
      // Redirect to login with current path
      const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.push(`/auth/login${redirectUrl}`);
      return;
    }

    // Simulate short loading time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 1000); // 1 second loading time

    return () => clearTimeout(timer);
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
