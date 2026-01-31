import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Complete your payment securely',
};

export default function CheckoutAppLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
