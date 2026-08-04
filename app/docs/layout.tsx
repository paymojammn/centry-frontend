import { ReactNode } from 'react';
import { Metadata } from 'next';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: {
    template: `%s | ${BRAND.name} Docs`,
    default: `Documentation | ${BRAND.name}`,
  },
  description: `${BRAND.name} API documentation and developer guides`,
};

export default function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
