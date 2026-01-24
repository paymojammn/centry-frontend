/**
 * Financial Overview Page
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganizations } from '@/hooks/use-organization';
import {
  useFinancialOverview,
  useFinancialTrends,
  usePredictions,
  useExportReport,
} from '@/hooks/use-reports';
import {
  Wallet,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  LineChart,
  Target,
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
import FinancialTrendChart from '@/components/reports/charts/FinancialTrendChart';

function formatCurrency(amount: string | number, currency: string = 'UGX'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

const DATE_RANGES = [
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'This year', value: '365' },
];

export default function FinancialOverviewPage() {
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
    data: financial,
    isLoading,
    refetch,
  } = useFinancialOverview(selectedOrganizationId || undefined, dateFilters);

  const { data: trendsData } = useFinancialTrends(
    selectedOrganizationId || undefined,
    dateFilters
  );

  const { data: predictions } = usePredictions(selectedOrganizationId || undefined);

  const exportMutation = useExportReport();

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selectedOrganizationId) return;
    exportMutation.mutate({
      organization_id: selectedOrganizationId,
      report_type: 'financial',
      format,
      filters: dateFilters,
    });
  };

  // Calculate key metrics
  const netPosition = useMemo(() => {
    if (!financial?.summary) return 0;
    return parseFloat(financial.summary.net_position || '0');
  }, [financial]);

  if (orgsLoading) {
    return (
      <PageContainer>
        <LoadingState message="Loading financial overview..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Financial Overview"
        description="Income vs expenses, balance trends, and wallet health"
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
              <span className="text-sm text-gray-500">Total Income</span>
              <TrendingUp className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-semibold text-green-600">
              {formatCurrency(financial?.summary?.total_income || '0', organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Expenses</span>
              <TrendingDown className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-semibold text-red-600">
              {formatCurrency(financial?.summary?.total_expenses || '0', organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Expense Claims</span>
              <DollarSign className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-semibold text-purple-600">
              {formatCurrency(financial?.summary?.expense_claims || '0', organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Net Position</span>
              {netPosition >= 0 ? (
                <TrendingUp className="h-5 w-5 text-green-500" />
              ) : (
                <TrendingDown className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div
              className={`text-2xl font-semibold ${
                netPosition >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(netPosition, organizationCurrency)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Trend Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Income vs Expenses Trend</CardTitle>
          <CardDescription>Daily inflow and outflow over time</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-72 flex items-center justify-center">
              <LoadingState message="Loading chart..." />
            </div>
          ) : trendsData?.trends && trendsData.trends.length > 0 ? (
            <FinancialTrendChart data={trendsData.trends} currency={organizationCurrency} />
          ) : (
            <div className="h-72 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Wallet Balances & Predictions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Wallet Balances */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet Balances</CardTitle>
            <CardDescription>Current balance by wallet</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(4)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                  ))}
              </div>
            ) : financial?.wallet_balances && financial.wallet_balances.length > 0 ? (
              <div className="space-y-4">
                {financial.wallet_balances.map((wallet, idx) => {
                  const balance = parseFloat(wallet.balance);
                  const budget = wallet.monthly_budget
                    ? parseFloat(wallet.monthly_budget)
                    : null;
                  const utilization =
                    budget && budget > 0 ? (balance / budget) * 100 : null;

                  return (
                    <div key={idx} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between mb-1">
                        <div>
                          <span className="font-medium text-gray-900">{wallet.name}</span>
                          <span className="text-xs text-gray-500 ml-2 capitalize">
                            {wallet.wallet_type}
                          </span>
                        </div>
                        <span className="font-semibold">
                          {formatCurrency(balance, wallet.currency || organizationCurrency)}
                        </span>
                      </div>
                      {budget && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-gray-500 mb-1">
                            <span>Monthly Budget</span>
                            <span>
                              {formatCurrency(budget, wallet.currency || organizationCurrency)}
                            </span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                utilization && utilization > 100
                                  ? 'bg-red-500'
                                  : utilization && utilization > 80
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(utilization || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <Wallet className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                No wallets configured
              </div>
            )}
          </CardContent>
        </Card>

        {/* Predictions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-5 w-5 text-purple-500" />
              Spending Predictions
            </CardTitle>
            <CardDescription>
              AI-powered forecast for the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            {predictions ? (
              <div className="space-y-4">
                <div className="bg-purple-50 rounded-lg p-4">
                  <div className="text-sm text-purple-700 mb-1">
                    Predicted Total Spend
                  </div>
                  <div className="text-2xl font-semibold text-purple-900">
                    {formatCurrency(
                      predictions.total_predicted_spend || '0',
                      organizationCurrency
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        predictions.confidence === 'high'
                          ? 'bg-green-100 text-green-700'
                          : predictions.confidence === 'medium'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {predictions.confidence} confidence
                    </span>
                  </div>
                </div>

                {predictions.predictions && predictions.predictions.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-gray-700">By Category</h4>
                    {predictions.predictions.slice(0, 5).map((pred, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-700 capitalize">
                            {pred.category?.replace(/_/g, ' ')}
                          </span>
                          {pred.trend === 'increasing' && (
                            <TrendingUp className="h-3 w-3 text-red-500" />
                          )}
                          {pred.trend === 'decreasing' && (
                            <TrendingDown className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                        <span className="text-sm font-medium">
                          {formatCurrency(pred.estimated_amount, organizationCurrency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {predictions.key_factors && predictions.key_factors.length > 0 && (
                  <div className="text-xs text-gray-500 border-t pt-3">
                    <span className="font-medium">Based on:</span>{' '}
                    {predictions.key_factors.join(', ')}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <LineChart className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>Predictions not available</p>
                <p className="text-xs">Add more transaction history to enable predictions</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
