/**
 * Status Pills + underline tab bar
 *
 * The filter row and tab chrome used on the Bills page, factored out so Pay In
 * and Pay Out read the same way: an underline tab bar under the header, then a
 * ContentCard whose first row is rounded-full status pills with live counts and
 * a search box pushed to the right.
 */

'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PILL_COLORS } from '@/lib/theme';

export interface StatusPill {
  value: string;
  label: string;
  count: number;
  /** Overrides the PILL_COLORS lookup when a status has no shared colour. */
  color?: string;
}

interface StatusPillsProps {
  pills: StatusPill[];
  value: string;
  onChange: (value: string) => void;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
}

/** Filter row: pills on the left, search on the right. Mirrors Bills. */
export function StatusPills({
  pills,
  value,
  onChange,
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
}: StatusPillsProps) {
  return (
    <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
      {pills.map((pill) => {
        const active = pill.value === value;
        // "all" uses the inverted treatment Bills gives it; the rest take
        // their status colour.
        const isAll = pill.value === 'all';
        const background = pill.color || PILL_COLORS[pill.value];

        return (
          <button
            key={pill.value}
            type="button"
            onClick={() => onChange(pill.value)}
            className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
              active
                ? isAll
                  ? 'bg-foreground text-card'
                  : 'text-white'
                : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
            style={active && !isAll && background ? { backgroundColor: background } : undefined}
          >
            {pill.label} ({pill.count})
          </button>
        );
      })}

      {onSearchChange && (
        <div className="ml-auto relative w-56 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder={searchPlaceholder}
            value={search ?? ''}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-card border-border text-sm text-foreground"
          />
        </div>
      )}
    </div>
  );
}

export interface PageTab {
  value: string;
  label: string;
  count?: number;
}

interface PageTabsProps {
  tabs: PageTab[];
  value: string;
  onChange: (value: string) => void;
}

/** Underline tab bar sitting directly under the page header, as on Bills. */
export function PageTabs({ tabs, value, onChange }: PageTabsProps) {
  return (
    <div className="bg-card border-b border-border shadow-sm">
      <div className="px-6">
        <nav className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => onChange(tab.value)}
              className={`py-3.5 text-sm font-medium border-b-2 transition-all ${
                value === tab.value
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              {tab.label}
              {tab.count ? (
                <span className="ml-1.5 text-xs text-muted-foreground">({tab.count})</span>
              ) : null}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

/** Centred empty/loading/error state matching the Bills table body. */
export function TableState({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div className="text-center py-16">
      <Icon className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && <p className="text-sm text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}
