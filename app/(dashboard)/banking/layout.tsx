import { ReactNode } from 'react';
import { FinanceGuard } from '@/components/layout/finance-guard';

export default function BankingLayout({ children }: { children: ReactNode }) {
  return <FinanceGuard>{children}</FinanceGuard>;
}
