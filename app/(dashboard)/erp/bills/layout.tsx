import { ReactNode } from 'react';
import { FinanceGuard } from '@/components/layout/finance-guard';

export default function BillsLayout({ children }: { children: ReactNode }) {
  return <FinanceGuard>{children}</FinanceGuard>;
}
