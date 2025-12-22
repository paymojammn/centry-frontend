'use client';

/**
 * Protected Layout Wrapper
 * Ensures user is authenticated before accessing protected routes
 */

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getAuthToken } from '@/lib/api';
import { Loader2 } from 'lucide-react';

export default function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const token = getAuthToken();

  useEffect(() => {
    // Check authentication on mount and path changes
    if (!token) {
      const redirectUrl = pathname ? `?redirect=${encodeURIComponent(pathname)}` : '';
      router.push(`/auth/login${redirectUrl}`);
    }
  }, [token, router, pathname]);

  // Show loading while checking auth
  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
