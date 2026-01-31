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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="size-8 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
                  <span className="text-white font-bold text-sm">C</span>
                </div>
                <span className="font-semibold text-gray-900">Centry</span>
              </Link>
              <span className="text-gray-300">|</span>
              <Link href="/docs/checkout" className="text-sm font-medium text-gray-600 hover:text-gray-900">
                Documentation
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <a
                href={process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}
                className="text-sm text-gray-600 hover:text-gray-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                Website
              </a>
              <Link href="/docs/checkout" className="text-sm text-gray-600 hover:text-gray-900">
                Checkout API
              </Link>
              <a
                href="https://github.com/centry"
                className="text-sm text-gray-600 hover:text-gray-900"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
              </a>
              <Link
                href="/auth/login"
                className="text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 px-4 py-2 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
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
            'fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-gray-200 pt-16 transform transition-transform duration-200 md:translate-x-0 md:static md:pt-0',
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <nav className="sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto py-8 px-6">
            <div className="space-y-8">
              {navigation.map((section) => (
                <div key={section.title}>
                  <Link
                    href={section.href}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-900 hover:text-blue-600"
                  >
                    {section.icon}
                    {section.title}
                  </Link>
                  {section.items && (
                    <ul className="mt-3 space-y-2 pl-6 border-l border-gray-200">
                      {section.items.map((item) => (
                        <li key={item.href}>
                          <Link
                            href={item.href}
                            className="block text-sm text-gray-600 hover:text-blue-600 py-1"
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
    <section id={id} className="scroll-mt-20 py-12 border-b border-gray-100 last:border-0">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
      {description && <p className="text-gray-600 mb-6">{description}</p>}
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
        'block p-6 rounded-xl border border-gray-200 bg-white',
        href && 'hover:border-blue-300 hover:shadow-md transition-all'
      )}
    >
      <div className="size-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-600">{description}</p>
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
    GET: 'bg-green-100 text-green-700',
    POST: 'bg-blue-100 text-blue-700',
    PUT: 'bg-amber-100 text-amber-700',
    DELETE: 'bg-red-100 text-red-700',
    PATCH: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-lg bg-gray-50 border border-gray-200">
      <span
        className={cn(
          'px-2 py-1 rounded text-xs font-bold uppercase',
          methodColors[method]
        )}
      >
        {method}
      </span>
      <div>
        <code className="text-sm font-mono text-gray-900">{path}</code>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
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
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 font-semibold text-gray-900">Parameter</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-900">Type</th>
            <th className="text-left px-4 py-3 font-semibold text-gray-900">Description</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {params.map((param) => (
            <tr key={param.name}>
              <td className="px-4 py-3">
                <code className="text-sm font-mono text-gray-900">{param.name}</code>
                {param.required && (
                  <span className="ml-2 text-xs text-red-500 font-medium">required</span>
                )}
              </td>
              <td className="px-4 py-3 text-gray-600">{param.type}</td>
              <td className="px-4 py-3 text-gray-600">{param.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
