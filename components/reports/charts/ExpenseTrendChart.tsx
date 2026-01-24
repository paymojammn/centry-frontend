/**
 * Expense Trend Chart Component
 * Shows expense amounts over time
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
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface ExpenseTrendChartProps {
  data: Array<{
    day: string;
    total: string;
    count: number;
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
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border">
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className="font-medium text-purple-600">
          {formatCurrency(payload[0].value, currency)}
        </p>
        <p className="text-xs text-gray-500">
          {payload[0].payload.count} expense{payload[0].payload.count !== 1 ? 's' : ''}
        </p>
      </div>
    );
  }
  return null;
};

export default function ExpenseTrendChart({
  data,
  currency,
}: ExpenseTrendChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.day,
      dateFormatted: format(parseISO(item.day), 'MMM d'),
      amount: parseFloat(item.total),
      count: item.count,
    }));
  }, [data]);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#9b59b6" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#9b59b6" stopOpacity={0} />
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
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#9b59b6"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorExpense)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
