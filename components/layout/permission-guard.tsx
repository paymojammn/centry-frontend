'use client';

import { ReactNode } from 'react';
import { useHasPermission } from '@/hooks/use-user';
import { useCurrentUser } from '@/hooks/use-user';
import { NoAccess } from '@/components/layout/no-access';
import { ScreenLoader } from '@/components/screen-loader';

interface PermissionGuardProps {
  children: ReactNode;
  permission: string;
  title?: string;
  description?: string;
  feature?: string;
}

export function PermissionGuard({
  children,
  permission,
  title = 'Access Restricted',
  description = 'You don\'t have the required permission to view this page.',
  feature,
}: PermissionGuardProps) {
  const { isLoading } = useCurrentUser();
  const hasPermission = useHasPermission(permission);

  if (isLoading) {
    return <ScreenLoader />;
  }

  if (!hasPermission) {
    return (
      <NoAccess
        title={title}
        description={description}
        feature={feature}
      />
    );
  }

  return <>{children}</>;
}
