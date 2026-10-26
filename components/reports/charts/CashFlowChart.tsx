"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from "date-fns";

interface CashFlowChartProps {
  data: Array<{
    period: string;
    credits: number;
    debits: number;
    net: number;
  }>;
  title?: string;
}

export function CashFlowChart({
  data,
  title = "Cash Flow",
}: CashFlowChartProps) {
  const chartData = data.map((item) => ({
    ...item,
    month: format(parseISO(item.period), "MMM yyyy"),
  }));

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + "M";
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(0) + "K";
    }
    return value.toString();
  };

  const formatTooltipValue = (value: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorCredits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorDebits" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="month"
                className="text-xs"
                tick={{ fill: "currentColor" }}
              />
              <YAxis
                className="text-xs"
                tick={{ fill: "currentColor" }}
                tickFormatter={formatCurrency}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatTooltipValue(value),
                  name === "credits" ? "Inflows" : name === "debits" ? "Outflows" : "Net",
                ]}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="credits"
                name="Inflows"
                stroke="var(--color-success)"
                fillOpacity={1}
                fill="url(#colorCredits)"
              />
              <Area
                type="monotone"
                dataKey="debits"
                name="Outflows"
                stroke="var(--color-danger)"
                fillOpacity={1}
                fill="url(#colorDebits)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
