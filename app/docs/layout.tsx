import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Centry Docs',
    default: 'Documentation | Centry',
  },
  description: 'Centry API documentation and developer guides',
};

export default function DocsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
