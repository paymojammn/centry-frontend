/**
 * Expense Pie Chart Component
 * Shows expense distribution by category
 */

'use client';

import { useMemo } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts';

interface ExpensePieChartProps {
  data: Array<{
    category: string;
    total: string;
    count: number;
    avg_amount?: string;
  }>;
  colors: Record<string, string>;
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

const CustomTooltip = ({ active, payload, currency }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border">
        <p className="font-medium text-gray-900 capitalize">
          {data.name?.replace(/_/g, ' ')}
        </p>
        <p className="text-sm text-gray-600">
          Amount: {formatCurrency(data.value, currency)}
        </p>
        <p className="text-sm text-gray-600">Count: {data.count}</p>
        <p className="text-sm text-gray-600">
          Percentage: {data.percentage?.toFixed(1)}%
        </p>
      </div>
    );
  }
  return null;
};

export default function ExpensePieChart({
  data,
  colors,
  currency,
}: ExpensePieChartProps) {
  const chartData = useMemo(() => {
    const total = data.reduce((sum, item) => sum + parseFloat(item.total), 0);

    return data.map((item) => ({
      name: item.category,
      value: parseFloat(item.total),
      count: item.count,
      percentage: (parseFloat(item.total) / total) * 100,
      color: colors[item.category] || '#607d8b',
    }));
  }, [data, colors]);

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-4">
        {payload.map((entry: any, index: number) => (
          <li key={`legend-${index}`} className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-gray-600 capitalize">
              {entry.value?.replace(/_/g, ' ')}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="45%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip currency={currency} />} />
          <Legend content={renderLegend} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
