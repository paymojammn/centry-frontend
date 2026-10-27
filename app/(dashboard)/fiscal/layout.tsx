import { ReactNode } from 'react';
import { FeatureGate } from '@/components/layout/feature-gate';
import { FinanceGuard } from '@/components/layout/finance-guard';

// Fiscalization (EFRIS / ZRA / DGI) is finance-only and feature-flagged per
// organization (lib/features.ts `fiscalization`); the API enforces both too.
export default function FiscalLayout({ children }: { children: ReactNode }) {
  return (
    <FinanceGuard>
      <FeatureGate feature="fiscalization" title="Fiscalization">
        {children}
      </FeatureGate>
    </FinanceGuard>
  );
}
