'use client';

import * as React from 'react';
import Link from 'next/link';
import { RiArrowLeftLine } from '@remixicon/react';
import { BRAND } from '@/config/brand';

export type LegalSection = {
  id: string;
  title: string;
  content: React.ReactNode;
};

export type LegalLink = { href: string; label: string };

/** Shared list style for legal copy — sage markers, comfortable spacing. */
export const legalBullets = 'list-disc space-y-2 pl-5 marker:text-primary/50';

/**
 * Full-width legal page shell: sticky brand header, sticky numbered
 * table-of-contents with active-section highlighting, and a wide content
 * card. Used by Terms, Privacy, etc. so they stay visually consistent.
 */
export function LegalLayout({
  title,
  lastUpdated,
  sections,
  footerLinks,
}: {
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
  footerLinks: LegalLink[];
}) {
  const [active, setActive] = React.useState<string>(sections[0]?.id ?? '');

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: '-96px 0px -70% 0px', threshold: 0 }
    );
    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-6 lg:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <img src={BRAND.logo.mark} alt={BRAND.name} className="size-8" />
            <span className="text-lg font-semibold text-foreground">{BRAND.name}</span>
            <span className="ml-1 hidden rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground sm:inline">
              Legal
            </span>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <RiArrowLeftLine className="size-4" />
            Back to Login
          </Link>
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto max-w-screen-2xl px-6 py-10 lg:px-10 lg:py-14">
        <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-12">
          {/* Table of contents */}
          <aside className="hidden lg:block">
            <nav className="sticky top-24 self-start">
              <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                On this page
              </p>
              <ul className="space-y-0.5 border-l border-border">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className={`-ml-px flex gap-2 border-l-2 py-1.5 pl-3 text-sm transition-colors ${
                        active === s.id
                          ? 'border-primary font-medium text-primary'
                          : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                      }`}
                    >
                      <span className="tabular-nums opacity-50">{i + 1}.</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          {/* Content */}
          <main className="min-w-0">
            <div className="rounded-2xl border border-border bg-card p-6 sm:p-10 lg:p-14">
              <div className="mb-8 border-b border-border pb-8">
                <h1 className="text-3xl font-semibold text-foreground sm:text-4xl">{title}</h1>
                <p className="mt-3 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
              </div>

              {sections.map((s, i) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="scroll-mt-24 border-b border-border py-8 last:border-0"
                >
                  <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold text-foreground">
                    <span className="grid size-7 flex-shrink-0 place-items-center rounded-lg bg-primary/10 text-sm font-bold text-primary">
                      {i + 1}
                    </span>
                    {s.title}
                  </h2>
                  <div className="space-y-4 leading-relaxed text-muted-foreground">{s.content}</div>
                </section>
              ))}
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
                {footerLinks.map((link, i) => (
                  <React.Fragment key={link.href}>
                    {i > 0 && <span className="size-1 rounded-full bg-muted-foreground/40" />}
                    <Link href={link.href} className="hover:text-foreground hover:underline">
                      {link.label}
                    </Link>
                  </React.Fragment>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                &copy; {new Date().getFullYear()} {BRAND.name}. All rights reserved.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
