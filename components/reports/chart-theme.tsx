"use client";

/**
 * Shared chart theme for /reports.
 *
 * Centralises colors, tooltip rendering, axis + grid styling, and SVG
 * gradient defs so every chart on the dashboard reads as one design.
 *
 * Direction: clean fintech (Stripe / Linear / Vercel) — restrained
 * palette, generous whitespace, tabular numerals, soft grids, smooth
 * curves with gradient fills, branded tooltip card.
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------
// Palette
// ---------------------------------------------------------------------

export const CHART_COLORS = {
  primary: "rgb(var(--brand-primary))",
  success: "#16a34a",
  warning: "#d97706",
  danger: "#dc2626",
  info: "#0891b2",
  neutral: "rgb(var(--muted-foreground))",
  axis: "rgb(var(--muted-foreground) / 0.5)",
  grid: "rgb(var(--border) / 0.5)",
} as const;

// Categorical sequence — picked to be distinct, accessible, and to
// degrade gracefully through tints. Used by the channels pie and any
// other "N slices" chart so adjacent slices never collide visually.
export const CATEGORICAL_PALETTE = [
  "rgb(var(--brand-primary))",
  "#6366f1", // indigo
  "#0891b2", // cyan
  "#16a34a", // green
  "#d97706", // amber
  "#db2777", // pink
  "#7c3aed", // violet
  "#0ea5e9", // sky
  "#f59e0b", // gold
  "#475569", // slate
];

export function pickColor(i: number, custom?: string[]): string {
  const palette = custom || CATEGORICAL_PALETTE;
  return palette[i % palette.length] || CATEGORICAL_PALETTE[0]!;
}

// ---------------------------------------------------------------------
// Number formatters
// ---------------------------------------------------------------------

export const formatCurrencyCompact = (value: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);

export const formatCurrencyFull = (value: number, currency = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

export const formatNumber = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    notation: value >= 100_000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value);

// ---------------------------------------------------------------------
// SVG gradient defs
//
// Render this ONCE per page (e.g. just below <PageHeader>) as a hidden
// SVG. The gradient IDs are document-global, so any chart on the page
// can reference them via fill="url(#gradient-primary)" etc.
//
// We previously rendered <defs> as a Recharts child but that confused
// Recharts 2.15's child-discovery and broke the chart context for
// XAxis/YAxis — hence the standalone hidden-SVG approach.
// ---------------------------------------------------------------------

export function ChartGradients() {
  return (
    <svg
      width="0"
      height="0"
      style={{ position: "absolute" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="gradient-primary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--brand-primary))" stopOpacity={0.45} />
          <stop offset="95%" stopColor="rgb(var(--brand-primary))" stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="gradient-success" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.success} stopOpacity={0.4} />
          <stop offset="95%" stopColor={CHART_COLORS.success} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="gradient-warning" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.warning} stopOpacity={0.4} />
          <stop offset="95%" stopColor={CHART_COLORS.warning} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="gradient-danger" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.danger} stopOpacity={0.4} />
          <stop offset="95%" stopColor={CHART_COLORS.danger} stopOpacity={0.02} />
        </linearGradient>
        <linearGradient id="gradient-info" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.info} stopOpacity={0.45} />
          <stop offset="95%" stopColor={CHART_COLORS.info} stopOpacity={0.02} />
        </linearGradient>
        {/* Vertical bar gradient — top brighter, bottom dimmer */}
        <linearGradient id="bar-primary" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgb(var(--brand-primary))" stopOpacity={0.95} />
          <stop offset="100%" stopColor="rgb(var(--brand-primary))" stopOpacity={0.65} />
        </linearGradient>
        <linearGradient id="bar-info" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={CHART_COLORS.info} stopOpacity={0.95} />
          <stop offset="100%" stopColor={CHART_COLORS.info} stopOpacity={0.65} />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ---------------------------------------------------------------------
// Custom branded tooltip (works with Recharts)
// ---------------------------------------------------------------------

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, any>;
  dataKey?: string;
}

interface ChartTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
  /** Override how each value is formatted. Defaults to compact currency. */
  valueFormatter?: (value: number) => string;
  /** Display a different title above the rows. Defaults to `label`. */
  titleFormatter?: (label: string) => string;
}

export function ChartTooltip({
  active,
  label,
  payload,
  valueFormatter = (v) => formatCurrencyCompact(v),
  titleFormatter,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const title = label && titleFormatter ? titleFormatter(label) : label;
  return (
    <div className="rounded-lg border border-border bg-popover/95 backdrop-blur-sm shadow-lg px-3 py-2 text-xs min-w-[140px]">
      {title && (
        <div className="font-medium text-foreground mb-1.5 pb-1.5 border-b border-border/60">
          {title}
        </div>
      )}
      <ul className="space-y-1">
        {payload.map((item, i) => {
          const v =
            typeof item.value === "number"
              ? valueFormatter(item.value)
              : item.value;
          return (
            <li key={i} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-muted-foreground">
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span>{item.name}</span>
              </div>
              <span className="font-medium text-foreground tabular-nums">
                {v}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------
// Shared axis + grid styling props (spread into <XAxis>, <YAxis>, <CartesianGrid>)
// ---------------------------------------------------------------------

export const AXIS_STYLE = {
  fontSize: 11,
  stroke: CHART_COLORS.axis,
  tickLine: false,
  axisLine: false,
  tick: { fill: CHART_COLORS.neutral, fontSize: 11 },
} as const;

export const GRID_STYLE = {
  stroke: CHART_COLORS.grid,
  strokeDasharray: "4 4",
  vertical: false,
} as const;

// ---------------------------------------------------------------------
// Card chrome — section header + body, used by chart cards
// ---------------------------------------------------------------------

interface SectionTitleProps {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}

export function SectionTitle({
  icon,
  title,
  subtitle,
  right,
  className,
}: SectionTitleProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-2.5">
        {icon && (
          <div className="p-1.5 rounded-lg bg-primary/10 text-primary mt-0.5 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h3>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

// ---------------------------------------------------------------------
// Empty state — used inside chart cards when there's no data yet
// ---------------------------------------------------------------------

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  hint?: string;
  className?: string;
}

export function EmptyState({ icon, title, hint, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center py-10 px-4",
        className
      )}
    >
      {icon && (
        <div className="mb-3 p-3 rounded-full bg-muted/60 text-muted-foreground">
          {icon}
        </div>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {hint && (
        <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
          {hint}
        </p>
      )}
    </div>
  );
}
