/**
 * Cash Flow Chart Component
 * Shows daily inflow vs outflow comparison
 */

'use client';

import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

interface CashFlowChartProps {
  data: Array<{
    date: string;
    deposits: string;
    withdrawals: string;
    transfers_in: string;
    transfers_out: string;
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
    return (
      <div className="bg-white shadow-lg rounded-lg p-3 border">
        <p className="text-sm font-medium text-gray-900 mb-2">{data.dateFormatted}</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-green-500" />
            <span className="text-sm text-gray-600">Inflow:</span>
            <span className="text-sm font-medium text-green-600">
              {formatCurrency(data.inflow, currency)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-red-500" />
            <span className="text-sm text-gray-600">Outflow:</span>
            <span className="text-sm font-medium text-red-600">
              {formatCurrency(data.outflow, currency)}
            </span>
          </div>
          <div className="pt-1 border-t mt-2">
            <span className="text-sm text-gray-600">Net: </span>
            <span
              className={`text-sm font-medium ${
                data.inflow - data.outflow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(data.inflow - data.outflow, currency)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export default function CashFlowChart({ data, currency }: CashFlowChartProps) {
  const chartData = useMemo(() => {
    return data.map((item) => ({
      date: item.date,
      dateFormatted: item.date ? format(parseISO(item.date), 'MMM d') : '',
      inflow: parseFloat(item.deposits || '0') + parseFloat(item.transfers_in || '0'),
      outflow: parseFloat(item.withdrawals || '0') + parseFloat(item.transfers_out || '0'),
    }));
  }, [data]);

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
        >
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
              <span className="text-xs text-gray-600">{value}</span>
            )}
          />
          <Bar
            dataKey="inflow"
            name="Inflow"
            fill="#22c55e"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="outflow"
            name="Outflow"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
