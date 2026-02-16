/**
 * Financial Trend Chart Component
 * Shows income vs expenses over time
 */

'use client';

import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface FinancialTrendChartProps {
  data: Array<{
    date: string;
    inflow: string;
    outflow: string;
  }>;
  currency: string;
}

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatCompactCurrency(amount: number): string {
  if (amount >= 1000000) {
    return `${(amount / 1000000).toFixed(1)}M`;
  }
  if (amount >= 1000) {
    return `${(amount / 1000).toFixed(0)}K`;
  }
  return amount.toString();
}

const CustomTooltip = ({ active, payload, label, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const net = data.inflow - data.outflow;
    return (
      <div className="bg-card shadow-lg rounded-lg p-3 border">
        <p className="text-sm font-medium text-foreground mb-2">{data.dateFormatted}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
            <span className="text-sm text-muted-foreground">Income:</span>
            <span className="text-sm font-medium text-primary">
              {formatCurrency(data.inflow, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
            <span className="text-sm text-muted-foreground">Expenses:</span>
            <span className="text-sm font-medium text-destructive">
              {formatCurrency(data.outflow, currency)}
            </span>
          </div>
          <div className="pt-1 border-t mt-2">
            <span className="text-sm text-muted-foreground">Net: </span>
            <span
              className={`text-sm font-medium ${
                net >= 0 ? 'text-primary' : 'text-destructive'
              }`}
            >
              {formatCurrency(net, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function FinancialTrendChart({
  data,
  currency,
}: FinancialTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.date,
      dateFormatted: item.date ? format(parseISO(item.date), 'MMM d') : '',
      inflow: parseFloat(item.inflow || '0'),
      outflow: parseFloat(item.outflow || '0'),
    }));
  }, [data]);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="dateFormatted"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={{ stroke: '#e5e7eb' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatCompactCurrency}
          />
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend
            wrapperStyle={{ paddingTop: '20px' }}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />
          <Area
            type="monotone"
            dataKey="inflow"
            name="Income"
            stroke="#22c55e"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorInflow)"
          />
          <Area
            type="monotone"
            dataKey="outflow"
            name="Expenses"
            stroke="#ef4444"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorOutflow)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
