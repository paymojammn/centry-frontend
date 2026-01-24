/**
 * Expense Analytics Page
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganizations } from '@/hooks/use-organization';
import {
  useExpenseAnalytics,
  useExpensesByDepartment,
  useExportReport,
} from '@/hooks/use-reports';
import {
  Receipt,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ExpensePieChart from '@/components/reports/charts/ExpensePieChart';
import ExpenseTrendChart from '@/components/reports/charts/ExpenseTrendChart';

function formatCurrency(amount: string | number, currency: string = 'UGX'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const CATEGORY_COLORS: Record<string, string> = {
  transport: '#4E97D1',
  meals: '#9b59b6',
  accommodation: '#49a034',
  office_supplies: '#f39c12',
  communication: '#e74c3c',
  utilities: '#1abc9c',
  entertainment: '#e91e63',
  training: '#3f51b5',
  medical: '#00bcd4',
  marketing: '#ff5722',
  maintenance: '#795548',
  other: '#607d8b',
};

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'This year', value: '365' },
];

export default function ExpenseAnalyticsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [dateRangeDays, setDateRangeDays] = useState('30');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const currentOrganization = organizations?.find(
    (org: any) => org.id === selectedOrganizationId
  );
  const organizationCurrency =
    currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const dateFilters = useMemo(() => {
    const days = parseInt(dateRangeDays);
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return {
      start_date: start.toISOString(),
      end_date: end.toISOString(),
    };
  }, [dateRangeDays]);

  const {
    data: analytics,
    isLoading,
    refetch,
  } = useExpenseAnalytics(selectedOrganizationId || undefined, dateFilters);

  const { data: departmentData } = useExpensesByDepartment(
    selectedOrganizationId || undefined,
    dateFilters
  );

  const exportMutation = useExportReport();

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selectedOrganizationId) return;
    exportMutation.mutate({
      organization_id: selectedOrganizationId,
      report_type: 'expenses',
      format,
      filters: dateFilters,
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!analytics?.by_category) return { total: 0, count: 0 };
    return {
      total: analytics.by_category.reduce(
        (sum, cat) => sum + parseFloat(cat.total || '0'),
        0
      ),
      count: analytics.by_category.reduce((sum, cat) => sum + (cat.count || 0), 0),
    };
  }, [analytics]);

  if (orgsLoading) {
    return (
      <PageContainer>
        <LoadingState message="Loading expense analytics..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Expense Analytics"
        description="Detailed breakdown of expenses by category, status, and employee"
        action={
          <div className="flex items-center gap-3">
            <Select value={dateRangeDays} onValueChange={setDateRangeDays}>
              <SelectTrigger className="w-[150px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_RANGES.map((range) => (
                  <SelectItem key={range.value} value={range.value}>
                    {range.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('excel')}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export as Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  <FileText className="h-4 w-4 mr-2" />
                  Export as PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* Organization Selector */}
      {organizations.length > 1 && (
        <div className="mb-6">
          <select
            value={selectedOrganizationId || ''}
            onChange={(e) => setSelectedOrganizationId(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg bg-white text-sm"
          >
            {organizations.map((org: any) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Expenses</span>
              <Receipt className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {formatCurrency(totals.total, organizationCurrency)}
            </div>
            <span className="text-sm text-gray-500">{totals.count} expenses</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Categories</span>
              <Filter className="h-5 w-5 text-blue-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {analytics?.by_category?.length || 0}
            </div>
            <span className="text-sm text-gray-500">Active categories</span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Top Category</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900 capitalize">
              {analytics?.by_category?.[0]?.category?.replace(/_/g, ' ') || '-'}
            </div>
            <span className="text-sm text-gray-500">
              {analytics?.by_category?.[0]
                ? formatCurrency(analytics.by_category[0].total, organizationCurrency)
                : '-'}
            </span>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Employees</span>
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">
              {analytics?.by_employee?.length || 0}
            </div>
            <span className="text-sm text-gray-500">With expenses</span>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Category Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses by Category</CardTitle>
            <CardDescription>Distribution across expense categories</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingState message="Loading chart..." />
              </div>
            ) : analytics?.by_category && analytics.by_category.length > 0 ? (
              <ExpensePieChart
                data={analytics.by_category}
                colors={CATEGORY_COLORS}
                currency={organizationCurrency}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No expense data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Daily Trend</CardTitle>
            <CardDescription>Expense amounts over time</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-64 flex items-center justify-center">
                <LoadingState message="Loading chart..." />
              </div>
            ) : analytics?.daily_trend && analytics.daily_trend.length > 0 ? (
              <ExpenseTrendChart
                data={analytics.daily_trend}
                currency={organizationCurrency}
              />
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No trend data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
              </div>
            ) : analytics?.by_category && analytics.by_category.length > 0 ? (
              <div className="space-y-3">
                {analytics.by_category.map((cat, idx) => {
                  const percentage =
                    totals.total > 0
                      ? ((parseFloat(cat.total) / totals.total) * 100).toFixed(1)
                      : '0';
                  return (
                    <div key={idx}>
                      <div className="flex justify-between mb-1">
                        <span className="text-sm text-gray-700 capitalize">
                          {cat.category?.replace(/_/g, ' ')}
                        </span>
                        <span className="text-sm font-medium">
                          {formatCurrency(cat.total, organizationCurrency)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: CATEGORY_COLORS[cat.category] || '#607d8b',
                            }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12 text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No category data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* By Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
              </div>
            ) : analytics?.by_status && analytics.by_status.length > 0 ? (
              <div className="space-y-3">
                {analytics.by_status.map((status, idx) => (
                  <div key={idx} className="flex justify-between py-2 border-b last:border-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-700 capitalize">
                        {status.status?.replace(/_/g, ' ')}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                        {status.count}
                      </span>
                    </div>
                    <span className="text-sm font-medium">
                      {formatCurrency(status.total, organizationCurrency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No status data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Employees */}
      {analytics?.by_employee && analytics.by_employee.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Top Employees by Expense</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Employee
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Expenses
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Total Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.by_employee.map((emp, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3">
                        <div>
                          <div className="font-medium text-gray-900">
                            {emp.employee_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">{emp.employee_email}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 text-gray-600">{emp.count}</td>
                      <td className="text-right py-3 font-medium">
                        {formatCurrency(emp.total, organizationCurrency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Department Breakdown */}
      {departmentData?.departments && departmentData.departments.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-base">Department Breakdown</CardTitle>
            <CardDescription>Spending by department wallet</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Department
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Budget
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Spent
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Utilization
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {departmentData.departments.map((dept, idx) => (
                    <tr key={idx} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">{dept.department}</td>
                      <td className="text-right py-3 text-gray-600">
                        {dept.monthly_budget
                          ? formatCurrency(dept.monthly_budget, organizationCurrency)
                          : '-'}
                      </td>
                      <td className="text-right py-3">
                        {formatCurrency(dept.total_spent, organizationCurrency)}
                      </td>
                      <td className="text-right py-3">
                        {dept.budget_utilization !== null ? (
                          <span
                            className={`font-medium ${
                              dept.budget_utilization > 100
                                ? 'text-red-600'
                                : dept.budget_utilization > 80
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {dept.budget_utilization.toFixed(1)}%
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
