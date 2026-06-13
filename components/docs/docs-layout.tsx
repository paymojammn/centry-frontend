'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import {
  Book,
  Banknote,
  Code2,
  CreditCard,
  Globe,
  Key,
  Menu,
  Rocket,
  Server,
  Shield,
  Terminal,
  Webhook,
  X,
  AlertTriangle,
  Gauge,
  TestTube,
  Package,
  ChevronRight,
  ExternalLink,
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
    href: '/docs/checkout#hosted-checkout',
    icon: <Code2 className="size-4" />,
    items: [
      { title: 'Hosted Checkout', href: '/docs/checkout#hosted-checkout' },
      { title: 'Headless / Embedded', href: '/docs/checkout#headless' },
      { title: 'Embedded Widget', href: '/docs/checkout#embedded-widget' },
      { title: 'SDKs & Libraries', href: '/docs/checkout#sdks' },
    ],
  },
  {
    title: 'API Reference',
    href: '/docs/checkout#api-reference',
    icon: <Server className="size-4" />,
    items: [
      { title: 'Create Session', href: '/docs/checkout#create-session' },
      { title: 'Get Session', href: '/docs/checkout#get-session' },
      { title: 'Payment Methods', href: '/docs/checkout#payment-methods' },
      { title: 'Initiate Payment', href: '/docs/checkout#initiate-payment' },
      { title: 'Check Status', href: '/docs/checkout#check-status' },
      { title: 'OpenAPI / Swagger', href: '/docs/checkout#openapi' },
    ],
  },
  {
    title: 'Providers & Countries',
    href: '/docs/checkout#providers',
    icon: <Globe className="size-4" />,
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
    title: 'Payouts API',
    href: '/docs/checkout#payouts',
    icon: <Banknote className="size-4" />,
  },
  {
    title: 'Error Codes',
    href: '/docs/checkout#errors',
    icon: <AlertTriangle className="size-4" />,
  },
  {
    title: 'Rate Limits',
    href: '/docs/checkout#rate-limits',
    icon: <Gauge className="size-4" />,
  },
  {
    title: 'Testing & Sandbox',
    href: '/docs/checkout#testing',
    icon: <TestTube className="size-4" />,
  },
];

interface DocsLayoutProps {
  children: React.ReactNode;
}

export function DocsLayout({ children }: DocsLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [activeHash, setActiveHash] = React.useState('');

  React.useEffect(() => {
    const onHashChange = () => setActiveHash(window.location.hash);
    window.addEventListener('hashchange', onHashChange);
    setActiveHash(window.location.hash);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[rgb(var(--brand-dark))] text-white">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2.5">
                <img src="/media/app/centry-logo-dark.svg" alt="Centry" className="h-7 w-7" />
                <span className="font-semibold text-white">Centry</span>
              </Link>
              <span className="text-white/20">|</span>
              <Link href="/docs/checkout" className="text-sm font-medium text-white/70 hover:text-white transition-colors">
                Docs
              </Link>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <a
                href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
              <Link href="/docs/checkout#api-reference" className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all">
                API Reference
              </Link>
              <a
                href="https://github.com/paymojammn"
                className="text-sm text-white/60 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/10 transition-all flex items-center gap-1"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <ExternalLink className="size-3" />
              </a>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-[rgb(var(--brand-dark))] bg-white hover:bg-white/90 px-4 py-1.5 rounded-lg transition-colors ml-2"
              >
                Dashboard
              </Link>
            </div>

            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-white/10"
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
            'fixed inset-y-0 left-0 z-40 w-72 bg-card border-r border-border pt-14 transform transition-transform duration-200 md:translate-x-0 md:static md:pt-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="sticky top-14 h-[calc(100vh-3.5rem)] overflow-y-auto py-6 px-4">
            <div className="space-y-1">
              {navigation.map((section) => (
                <div key={section.title} className="mb-4">
                  <Link
                    href={section.href}
                    className={cn(
                      'flex items-center gap-2 text-sm font-semibold py-1.5 px-2 rounded-lg transition-colors',
                      activeHash === section.href.split('#')[1] ? 'text-primary bg-primary/5' : 'text-foreground hover:bg-muted'
                    )}
                  >
                    <span className="text-muted-foreground">{section.icon}</span>
                    {section.title}
                  </Link>
                  {section.items && (
                    <ul className="mt-1 space-y-0.5 ml-4 pl-4 border-l border-border">
                      {section.items.map((item) => {
                        const itemHash = '#' + (item.href.split('#')[1] || '');
                        return (
                          <li key={item.href}>
                            <Link
                              href={item.href}
                              className={cn(
                                'block text-[13px] py-1 px-2 rounded transition-colors',
                                activeHash === itemHash
                                  ? 'text-primary font-medium'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {item.title}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </nav>
        </aside>

        {sidebarOpen && (
          <div className="fixed inset-0 z-30 bg-black/20 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}

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
    <section id={id} className="scroll-mt-20 py-10 border-b border-border last:border-0">
      <h2 className="text-2xl font-bold text-foreground mb-1">{title}</h2>
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
        'group block p-5 rounded-xl border border-border bg-card',
        href && 'hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all'
      )}
    >
      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
        {icon}
      </div>
      <h3 className="font-semibold text-foreground mb-1 flex items-center gap-1">
        {title}
        {href && <ChevronRight className="size-3.5 text-muted-foreground/50 group-hover:text-primary transition-colors" />}
      </h3>
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
    GET: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    POST: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    PUT: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    DELETE: 'bg-red-500/10 text-red-600 border-red-500/20',
    PATCH: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border border-border">
      <span className={cn('px-2.5 py-1 rounded-md text-xs font-bold uppercase border', methodColors[method])}>
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
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm table-professional">
        <thead className="bg-muted/50 border-b border-border">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Parameter</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-foreground">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {params.map((param) => (
            <tr key={param.name} className="hover:bg-muted/30">
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-foreground">{param.name}</code>
                {param.required && (
                  <span className="ml-2 text-[10px] text-destructive font-bold uppercase tracking-wider">required</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className="text-xs font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{param.type}</span>
              </td>
              <td className="px-4 py-3 text-muted-foreground">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
