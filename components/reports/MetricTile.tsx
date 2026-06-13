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

// Single source of truth for card visuals across the app. The 4-px left
// stripe is the "cute" accent the rest of the UI matches (StatCard wraps
// this component to inherit the same look).
const TONE_STYLES: Record<
  Tone,
  { accent: string; spark: string; iconBg: string; iconColor: string }
> = {
  default: {
    accent: "border-l-4 border-l-muted-foreground/25",
    spark: "rgb(var(--muted-foreground))",
    iconBg: "bg-muted/60",
    iconColor: "text-muted-foreground",
  },
  accent: {
    accent: "border-l-4 border-l-primary",
    spark: "rgb(var(--brand-primary))",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  success: {
    accent: "border-l-4 border-l-emerald-500",
    spark: "#10b981",
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
  },
  warning: {
    accent: "border-l-4 border-l-amber-500",
    spark: "#f59e0b",
    iconBg: "bg-amber-500/10",
    iconColor: "text-amber-600",
  },
  danger: {
    accent: "border-l-4 border-l-red-500",
    spark: "#ef4444",
    iconBg: "bg-red-500/10",
    iconColor: "text-red-600",
  },
  info: {
    accent: "border-l-4 border-l-blue-500",
    spark: "#3b82f6",
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600",
  },
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
        "transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5",
        onClick && "cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        styles.accent,
        className
      )}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          {Icon && (
            <div
              className={cn(
                "p-1.5 rounded-lg shrink-0",
                styles.iconBg,
                styles.iconColor
              )}
            >
              <Icon className="h-4 w-4" />
            </div>
          )}
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
                  ? "bg-emerald-500/10 text-emerald-700"
                  : "bg-red-500/10 text-red-700"
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
