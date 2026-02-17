"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { PaymentChannel } from "@/types/reports";

interface PaymentChannelsChartProps {
  data: PaymentChannel[];
}

const CHANNEL_COLORS: Record<string, string> = {
  "Bank Transfer": "rgb(var(--brand-primary))",
  "Mobile Money": "rgb(var(--warning))",
  Other: "rgb(var(--muted-foreground))",
};

const fallbackColors = [
  "rgb(var(--brand-primary))",
  "rgb(var(--warning))",
  "#6366f1",
  "#06b6d4",
  "#10b981",
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export function PaymentChannelsChart({ data }: PaymentChannelsChartProps) {
  const total = data.reduce((sum, d) => sum + d.amount, 0);

  const chartData = data.map((item, i) => ({
    name: item.channel,
    value: item.amount,
    count: item.count,
    fill: CHANNEL_COLORS[item.channel] || fallbackColors[i % fallbackColors.length],
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[220px] text-sm text-muted-foreground">
        No payment data yet
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <div className="w-[140px] h-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={65}
              paddingAngle={3}
              dataKey="value"
              stroke="none"
            >
              {chartData.map((entry, index) => (
                <Cell key={index} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => [formatCurrency(value)]}
              contentStyle={{
                borderRadius: "8px",
                border: "1px solid rgb(var(--border))",
                backgroundColor: "rgb(var(--card-bg))",
                fontSize: "12px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex-1 space-y-3">
        {chartData.map((item) => {
          const pct = total > 0 ? ((item.value / total) * 100).toFixed(0) : "0";
          return (
            <div key={item.name} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.fill }}
                  />
                  <span className="text-foreground font-medium">{item.name}</span>
                </div>
                <span className="text-foreground font-semibold tabular-nums">
                  {formatCurrency(item.value)}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-[18px]">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: item.fill,
                    }}
                  />
                </div>
                <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                  {pct}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
