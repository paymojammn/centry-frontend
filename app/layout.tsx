import { ReactNode, Suspense } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { Metadata } from 'next';
import { ThemeProvider } from 'next-themes';
import { ReactQueryProvider } from '@/components/providers/react-query-provider';
import { HydrationErrorHandler } from '@/components/hydration-error-handler';
import { BRAND, TITLE_TEMPLATE } from '@/config/brand';

import '@/styles/globals.css';

// Geist Sans is the app-wide UI font (Vercel's open type system).
// Geist Mono powers tabular figures in data grids and code.
// `geist/font/sans` ships its own CSS variable `--font-geist-sans`;
// we expose it under our existing `--font-sans` (and keep `--font-inter`
// as an alias so any old utility class that still references it works).

export const metadata: Metadata = {
  title: {
    template: TITLE_TEMPLATE,
    default: BRAND.name, // a default is required when creating a template
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
    <html
      lang="en"
      className={cn('h-full', GeistSans.variable, GeistMono.variable)}
      suppressHydrationWarning
    >
      <body
        className={cn(
          'antialiased flex h-full text-base text-foreground bg-background',
          GeistSans.className,
        )}
        suppressHydrationWarning
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:shadow-lg"
        >
          Skip to content
        </a>
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
