"use client";

/**
 * CashFlowCard — one card per currency, charting realized monthly inflow
 * (collections, IN) vs outflow (disbursements, OUT). Source:
 * pipeline-overview.cash_flow_series, which reads XeroPaymentEvent so both
 * directions sit on the same axis. No FX mixing — each currency renders in
 * its own card.
 */

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  ContentCard,
  ContentCardHeader,
} from "@/components/layout/content-card";
import {
  AXIS_STYLE,
  CHART_COLORS,
  ChartTooltip,
  EmptyState,
  GRID_STYLE,
  SectionTitle,
  formatCurrencyCompact,
} from "@/components/reports/chart-theme";
import type { CashFlowSeries } from "@/types/reports";

interface CashFlowCardProps {
  data: CashFlowSeries;
}

const INFLOW_COLOR = CHART_COLORS.success;
const OUTFLOW_COLOR = CHART_COLORS.danger;

export function CashFlowCard({ data }: CashFlowCardProps) {
  const { currency, series, total_inflow, total_outflow } = data;
  const net = total_inflow - total_outflow;
  const hasData = series.some((p) => p.inflow > 0 || p.outflow > 0);

  const chartData = series.map((p) => ({
    ...p,
    label: format(parseISO(p.month), "MMM"),
  }));

  const gradIn = `cf-in-${currency}`;
  const gradOut = `cf-out-${currency}`;

  return (
    <ContentCard noPadding>
      <ContentCardHeader className="px-6">
        <SectionTitle
          icon={<ArrowDownLeft className="h-4 w-4" />}
          title={`Cash flow · ${currency}`}
          subtitle="Realized inflow vs outflow"
          right={
            <div className="text-right">
              <p
                className={`text-sm font-semibold tabular-nums ${
                  net >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {net >= 0 ? "+" : "−"}
                {formatCurrencyCompact(Math.abs(net), currency)}
              </p>
              <p className="text-[11px] text-muted-foreground">net</p>
            </div>
          }
        />
      </ContentCardHeader>

      <div className="px-3 pb-4">
        {!hasData ? (
          <EmptyState
            icon={<ArrowUpRight className="h-5 w-5" />}
            title={`No ${currency} cash flow yet`}
            hint="Realized collections and disbursements will chart here."
          />
        ) : (
          <>
            <div className="flex items-center gap-4 px-3 pt-3 pb-1">
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-emerald-600">
                  <ArrowDownLeft className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrencyCompact(total_inflow, currency)}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">in</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-1 text-red-600">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold tabular-nums">
                    {formatCurrencyCompact(total_outflow, currency)}
                  </span>
                </span>
                <span className="text-[11px] text-muted-foreground">out</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart
                data={chartData}
                margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
              >
                <defs>
                  <linearGradient id={gradIn} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={INFLOW_COLOR} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={INFLOW_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                  <linearGradient id={gradOut} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={OUTFLOW_COLOR} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={OUTFLOW_COLOR} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...GRID_STYLE} />
                <XAxis dataKey="label" {...AXIS_STYLE} />
                <YAxis
                  {...AXIS_STYLE}
                  width={48}
                  tickFormatter={(v: number) => formatCurrencyCompact(v, currency)}
                />
                <Tooltip
                  content={
                    <ChartTooltip
                      valueFormatter={(v) => formatCurrencyCompact(v, currency)}
                    />
                  }
                />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  name="Inflow"
                  stroke={INFLOW_COLOR}
                  strokeWidth={2}
                  fill={`url(#${gradIn})`}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  name="Outflow"
                  stroke={OUTFLOW_COLOR}
                  strokeWidth={2}
                  fill={`url(#${gradOut})`}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </>
        )}
      </div>
    </ContentCard>
  );
}
