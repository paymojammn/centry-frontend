import { ReactNode } from 'react';
import { Metadata } from 'next';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: `Help Center | ${BRAND.name}`,
  description: `Find answers, guides, and resources to get the most out of ${BRAND.name}.`,
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
