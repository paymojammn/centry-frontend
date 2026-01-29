"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExpensePieChartProps {
  data: Array<{
    status?: string;
    vendor__name?: string;
    total: number;
    count: number;
  }>;
  dataKey?: "status" | "vendor";
  title?: string;
}

const COLORS = [
  "#8b5cf6", // violet-500
  "#06b6d4", // cyan-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#ef4444", // red-500
  "#6366f1", // indigo-500
  "#ec4899", // pink-500
  "#84cc16", // lime-500
];

export function ExpensePieChart({
  data,
  dataKey = "status",
  title = "Expenses by Status",
}: ExpensePieChartProps) {
  const chartData = data.map((item, index) => ({
    name: dataKey === "status" ? item.status : item.vendor__name || "Unknown",
    value: item.total || 0,
    count: item.count,
    fill: COLORS[index % COLORS.length],
  }));

  const formatCurrency = (value: number) => {
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
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name,
                ]}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
            No data available
          </div>
        )}
      </CardContent>
    </Card>
  );
}
