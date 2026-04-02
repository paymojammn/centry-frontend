import { ReactNode } from 'react';
import { FinanceGuard } from '@/components/layout/finance-guard';
import { PermissionGuard } from '@/components/layout/permission-guard';

export default function BankingLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceGuard>
      <PermissionGuard
        permission="banking.view"
        title="Banking Access Required"
        description="You don't have permission to access banking features. Contact your organization admin to request banking access."
        feature="Banking"
      >
        {children}
      </PermissionGuard>
    </FinanceGuard>
  );
}
