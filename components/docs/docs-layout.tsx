'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Book,
  Code2,
  CreditCard,
  FileCode,
  Globe,
  Key,
  LayoutDashboard,
  Link as LinkIcon,
  Menu,
  Rocket,
  Server,
  Shield,
  Webhook,
  X,
} from 'lucide-react';

interface NavItem {
  title: string;
  href: string;
  icon?: React.ReactNode;
  items?: { title: string; href: string }[];
}

const navigation: NavItem[] = [
  {
    title: 'Getting Started',
    href: '/docs/checkout',
    icon: <Rocket className="size-4" />,
    items: [
      { title: 'Introduction', href: '/docs/checkout#introduction' },
      { title: 'Quick Start', href: '/docs/checkout#quickstart' },
      { title: 'Authentication', href: '/docs/checkout#authentication' },
    ],
  },
  {
    title: 'Integration',
    href: '/docs/checkout#integration',
    icon: <Code2 className="size-4" />,
    items: [
      { title: 'Hosted Checkout', href: '/docs/checkout#hosted-checkout' },
      { title: 'Embedded Widget', href: '/docs/checkout#embedded-widget' },
      { title: 'Custom Integration', href: '/docs/checkout#custom-integration' },
    ],
  },
  {
    title: 'API Reference',
    href: '/docs/checkout#api-reference',
    icon: <Server className="size-4" />,
    items: [
      { title: 'Create Session', href: '/docs/checkout#create-session' },
      { title: 'Get Session', href: '/docs/checkout#get-session' },
      { title: 'List Sessions', href: '/docs/checkout#list-sessions' },
      { title: 'Cancel Session', href: '/docs/checkout#cancel-session' },
    ],
  },
  {
    title: 'Webhooks',
    href: '/docs/checkout#webhooks',
    icon: <Webhook className="size-4" />,
    items: [
      { title: 'Events', href: '/docs/checkout#webhook-events' },
      { title: 'Verification', href: '/docs/checkout#webhook-verification' },
    ],
  },
  {
    title: 'Payment Methods',
    href: '/docs/checkout#payment-methods',
    icon: <CreditCard className="size-4" />,
    items: [
      { title: 'Cards', href: '/docs/checkout#cards' },
      { title: 'Mobile Money', href: '/docs/checkout#mobile-money' },
      { title: 'Bank Transfer', href: '/docs/checkout#bank-transfer' },
    ],
  },
  {
    title: 'Countries & Currencies',
    href: '/docs/checkout#countries',
    icon: <Globe className="size-4" />,
  },
];

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-card">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-foreground">Centry</span>
              </Link>
              <span className="text-muted-foreground/40">|</span>
              <Link href="/docs/checkout" className="text-sm font-medium text-muted-foreground hover:text-foreground">
                Documentation
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                className="text-sm text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
              <Link href="/docs/checkout" className="text-sm text-muted-foreground hover:text-foreground">
                Checkout API
              </Link>
              <a
                href="https://github.com/centry"
                className="text-sm text-muted-foreground hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-white bg-[rgb(var(--brand-dark))] hover:bg-[rgb(var(--brand-dark))] px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-muted"
            >
              {sidebarOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-8xl mx-auto flex">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border pt-16 transform transition-transform duration-200 md:translate-x-0 md:static md:pt-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-6">
            <div className="space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <Link
                    href={section.href}
                    className="flex items-center gap-2 text-sm font-semibold text-foreground hover:text-primary"
                  >
                    {section.icon}
                    {section.title}
                  </Link>
                  {section.items && (
                    <ul className="mt-3 space-y-2 pl-6 border-l border-border">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block text-sm text-muted-foreground hover:text-primary py-1"
                          >
                            {item.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {/* Backdrop */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/20 md:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </div>
  );
}

interface DocsSectionProps {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export function DocsSection({ id, title, description, children }: DocsSectionProps) {
  return (
    <section id={id} className="scroll-mt-20 py-12 border-b border-border last:border-0">
      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>
      {description && <p className="text-muted-foreground mb-6">{description}</p>}
      {children}
    </section>
  );
}

interface DocsCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  href?: string;
}

export function DocsCard({ icon, title, description, href }: DocsCardProps) {
  const Comp = href ? Link : 'div';
  return (
    <Comp
      href={href || '#'}
      className={cn(
        'block p-6 rounded-xl border border-border bg-card',
        href && 'hover:border-primary/20 hover:shadow-md transition-all'
      )}
    >
      <div className="size-10 rounded-lg bg-primary/5 text-primary flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </Comp>
  );
}

interface EndpointProps {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
}

export function Endpoint({ method, path, description }: EndpointProps) {
  const methodColors = {
    GET: 'bg-primary/10 text-primary',
    POST: 'bg-primary/5 text-primary',
    PUT: 'bg-[rgb(var(--warning))]/10 text-[rgb(var(--warning))]',
    DELETE: 'bg-destructive/5 text-destructive',
    PATCH: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-muted border border-border">
      <span
        className={cn(
          'px-2 py-1 rounded text-xs font-bold uppercase',
          methodColors[method]
        )}
      >
        {method}
      </span>
      <div>
        <code className="text-sm font-mono text-foreground">{path}</code>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}

interface ParamTableProps {
  params: {
    name: string;
    type: string;
    required?: boolean;
    description: string;
  }[];
}

export function ParamTable({ params }: ParamTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Parameter</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {params.map((param) => (
            <tr key={param.name}>
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-foreground">{param.name}</code>
                {param.required && (
                  <span className="ml-2 text-xs text-destructive font-medium">required</span>
                )}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{param.type}</td>
              <td className="px-4 py-3 text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
