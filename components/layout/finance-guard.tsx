'use client';

import { useMemo, ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/use-user';
import { NoAccess } from '@/components/layout/no-access';
import { ScreenLoader } from '@/components/screen-loader';

interface FinanceGuardProps {
  children: ReactNode;
}

export function FinanceGuard({ children }: FinanceGuardProps) {
  const { data: user, isLoading } = useCurrentUser();

  const isFinanceOrAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === 'finance') return true;
    return user.organizations?.some(
      (o) => o.membership_role === 'owner' || o.membership_role === 'admin',
    );
  }, [user]);

  if (isLoading) {
    return <ScreenLoader />;
  }

  if (!isFinanceOrAdmin) {
    return (
      <NoAccess
        title="Finance Access Required"
        description="This section is restricted to finance team members. Only users with the finance role can access bills, payments, and banking features."
        feature="Finance"
      />
    );
  }

  return <>{children}</>;
}
