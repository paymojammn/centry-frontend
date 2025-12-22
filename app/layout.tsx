import { ReactNode, Suspense } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { HydrationErrorHandler } from '@/components/hydration-error-handler';

import '@/styles/globals.css';

// Metronic uses Inter font as the primary font
const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | Centry',
    default: 'Centry', // a default is required when creating a template
  },
  icons: {
    icon: '/favicon.svg',
  },
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className={cn('h-full', inter.variable)} suppressHydrationWarning>
      <body
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background font-inter',
          inter.className,
        )}
        suppressHydrationWarning
      >
        <HydrationErrorHandler />
        <ReactQueryProvider>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            storageKey="nextjs-theme"
            enableSystem
            disableTransitionOnChange
            enableColorScheme
          >
            <TooltipProvider delayDuration={0}>
              <Suspense>{children}</Suspense>
              <Toaster />
            </TooltipProvider>
          </ThemeProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
