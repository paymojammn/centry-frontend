"use client";

/**
 * The report chart kit — three shapes, one look.
 *
 * Every report chart goes through these so axes, grid, tooltip, legend,
 * colours and the empty state are identical across pages (and in dark mode,
 * because everything resolves through chart-theme tokens).
 */

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AXIS_STYLE,
  ChartTooltip,
  EmptyState,
  GRID_STYLE,
  formatCurrencyCompact,
  pickColor,
} from "@/components/reports/chart-theme";
import { BarChart3 } from "lucide-react";

export interface ChartSeries {
  /** Key in each data row. */
  key: string;
  /** Legend / tooltip label. */
  label: string;
  /** Any CSS colour; defaults to the categorical palette by position. */
  color?: string;
  /** Bars: stack series that share an id. */
  stackId?: string;
}

interface BaseProps {
  data: Record<string, unknown>[];
  /** Key for the x axis (category / date label). */
  xKey: string;
  series: ChartSeries[];
  height?: number;
  valueFormatter?: (v: number) => string;
  /** Shown instead of the chart when `data` is empty. */
  emptyTitle?: string;
  emptyHint?: string;
  /** Legend is on when more than one series unless forced. */
  legend?: boolean;
}

const LEGEND_STYLE = { fontSize: 11, paddingTop: 8 } as const;

function Empty({ title, hint, height }: { title?: string; hint?: string; height: number }) {
  return (
    <div style={{ height }} className="flex items-center justify-center">
      <EmptyState icon={<BarChart3 className="h-5 w-5" />} title={title ?? "Nothing to chart yet"} hint={hint} />
    </div>
  );
}

export function ReportAreaChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormatter = (v) => formatCurrencyCompact(v),
  emptyTitle,
  emptyHint,
  legend,
}: BaseProps) {
  if (!data.length) return <Empty title={emptyTitle} hint={emptyHint} height={height} />;
  const showLegend = legend ?? series.length > 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          {series.map((s, i) => {
            const c = s.color || pickColor(i);
            return (
              <linearGradient key={s.key} id={`rc-area-${s.key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={c} stopOpacity={0.28} />
                <stop offset="100%" stopColor={c} stopOpacity={0.02} />
              </linearGradient>
            );
          })}
        </defs>
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} width={56} tickFormatter={(v) => valueFormatter(Number(v))} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ stroke: "var(--border)" }} />
        {showLegend && <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />}
        {series.map((s, i) => {
          const c = s.color || pickColor(i);
          return (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stroke={c}
              strokeWidth={1.75}
              fill={`url(#rc-area-${s.key})`}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          );
        })}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ReportBarChart({
  data,
  xKey,
  series,
  height = 280,
  valueFormatter = (v) => formatCurrencyCompact(v),
  emptyTitle,
  emptyHint,
  legend,
}: BaseProps) {
  if (!data.length) return <Empty title={emptyTitle} hint={emptyHint} height={height} />;
  const showLegend = legend ?? series.length > 1;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="28%">
        <CartesianGrid {...GRID_STYLE} />
        <XAxis dataKey={xKey} {...AXIS_STYLE} />
        <YAxis {...AXIS_STYLE} width={56} tickFormatter={(v) => valueFormatter(Number(v))} />
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} cursor={{ fill: "var(--hover-row)" }} />
        {showLegend && <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color || pickColor(i)}
            stackId={s.stackId}
            radius={s.stackId ? 0 : [4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PieProps {
  data: { name: string; value: number; color?: string }[];
  height?: number;
  valueFormatter?: (v: number) => string;
  emptyTitle?: string;
  emptyHint?: string;
  /** Donut by default; 0 for a full pie. */
  innerRadius?: number;
}

export function ReportPieChart({
  data,
  height = 260,
  valueFormatter = (v) => formatCurrencyCompact(v),
  emptyTitle,
  emptyHint,
  innerRadius = 58,
}: PieProps) {
  const rows = data.filter((d) => d.value > 0);
  if (!rows.length) return <Empty title={emptyTitle} hint={emptyHint} height={height} />;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={rows}
          dataKey="value"
          nameKey="name"
          innerRadius={innerRadius}
          outerRadius={Math.min(height / 2 - 12, 110)}
          paddingAngle={2}
          stroke="var(--card)"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {rows.map((d, i) => (
            <Cell key={d.name} fill={d.color || pickColor(i)} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip valueFormatter={valueFormatter} />} />
        <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
