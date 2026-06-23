import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Help Center | Centry',
  description: 'Find answers, guides, and resources to get the most out of Centry.',
};

export default function HelpLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
