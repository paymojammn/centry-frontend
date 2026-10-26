"use client";

import { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  ResponsiveContainer,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "default" | "accent" | "success" | "warning" | "danger" | "info";

interface MetricTileProps {
  label: string;
  value: string | number;
  /** Secondary text under the value. */
  hint?: string;
  /** Lucide icon shown top-right. */
  icon?: LucideIcon;
  /** Trend pill, e.g. { value: 12.3, positiveIsGood: true } → green +12.3% */
  trend?: { value: number; positiveIsGood?: boolean; label?: string };
  /** Tiny sparkline drawn at the bottom of the tile. */
  sparkline?: number[];
  sparklineKind?: "area" | "line";
  tone?: Tone;
  className?: string;
  footer?: ReactNode;
  /** Optional click handler — turns the tile into an interactive button. */
  onClick?: () => void;
}

// Single source of truth for summary-card visuals across the app (StatCard
// wraps this component, so ~37 pages inherit it). Minimal by design: a quiet
// paper card, and the tone shows only as a 6px dot beside the label and the
// sparkline colour — no stripes, no tinted icon chips.
const TONE_STYLES: Record<Tone, { dot: string; spark: string }> = {
  default: { dot: "bg-neutral-300", spark: "var(--muted-foreground)" },
  accent: { dot: "bg-primary", spark: "var(--primary)" },
  success: { dot: "bg-success", spark: "var(--color-success)" },
  warning: { dot: "bg-warning", spark: "var(--color-warning)" },
  danger: { dot: "bg-danger", spark: "var(--color-danger)" },
  info: { dot: "bg-info", spark: "var(--color-info)" },
};

export function MetricTile({
  label,
  value,
  hint,
  icon: Icon,
  trend,
  sparkline,
  sparklineKind = "area",
  tone = "default",
  className,
  footer,
  onClick,
}: MetricTileProps) {
  const styles = TONE_STYLES[tone];

  const showTrend = trend !== undefined && !Number.isNaN(trend.value);
  const trendUp = showTrend && trend!.value >= 0;
  const positiveIsGood = trend?.positiveIsGood ?? true;
  const trendGood = positiveIsGood ? trendUp : !trendUp;

  const sparkData = (sparkline || []).map((y, x) => ({ x, y }));
  const sparkColor = styles.spark;
  const gradId = `mt-spark-${label.replace(/[^a-z0-9]/gi, "-")}`;

  const Wrapper: any = onClick ? "button" : "div";

  return (
    <Wrapper
      {...(onClick ? { type: "button", onClick } : {})}
      className={cn(
        "group relative rounded-xl border border-border bg-card overflow-hidden text-left w-full",
        "transition-colors duration-200",
        onClick &&
          "cursor-pointer hover:border-forest/25 hover:bg-background focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        className
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {tone !== "default" && (
              <span aria-hidden className={cn("h-1.5 w-1.5 rounded-full shrink-0", styles.dot)} />
            )}
            {label}
          </p>
          {Icon && <Icon className="h-4 w-4 shrink-0 text-muted-foreground/50" />}
        </div>
        <div className="mt-2.5 flex items-baseline gap-2">
          <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight">
            {value}
          </p>
          {showTrend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 text-xs font-medium rounded-full px-1.5 py-0.5",
                trendGood
                  ? "bg-success-500/10 text-success-700"
                  : "bg-danger-500/10 text-danger-700"
              )}
            >
              {trendUp ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend!.value).toFixed(1)}%
            </span>
          )}
        </div>
        {hint && (
          <p className="text-xs text-muted-foreground mt-1.5 truncate">
            {hint}
          </p>
        )}
        {footer}
      </div>
      {sparkline && sparkline.length >= 2 && (
        <div className="h-12 -mt-2 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            {sparklineKind === "area" ? (
              <AreaChart data={sparkData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={sparkColor} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={sparkColor} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <Area
                  type="monotone"
                  dataKey="y"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  fill={`url(#${gradId})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            ) : (
              <LineChart data={sparkData} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
                <Line
                  type="monotone"
                  dataKey="y"
                  stroke={sparkColor}
                  strokeWidth={1.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </Wrapper>
  );
}
