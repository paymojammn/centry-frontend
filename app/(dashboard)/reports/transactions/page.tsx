/**
 * Transaction Reports Page
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganizations } from '@/hooks/use-organization';
import { useTransactionReport, useCashFlow, useExportReport } from '@/hooks/use-reports';
import {
  ArrowRightLeft,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
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
import CashFlowChart from '@/components/reports/charts/CashFlowChart';
import { format, parseISO } from 'date-fns';

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

const TRANSACTION_TYPES = [
  { label: 'All Types', value: 'all' },
  { label: 'Deposits', value: 'deposit' },
  { label: 'Withdrawals', value: 'withdrawal' },
  { label: 'Transfers In', value: 'transfer_in' },
  { label: 'Transfers Out', value: 'transfer_out' },
  { label: 'Payments', value: 'payment' },
];

const STATUS_COLORS: Record<string, string> = {
  completed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const TYPE_COLORS: Record<string, { bg: string; icon: typeof ArrowUpRight }> = {
  deposit: { bg: 'bg-green-50 text-green-600', icon: ArrowDownRight },
  transfer_in: { bg: 'bg-green-50 text-green-600', icon: ArrowDownRight },
  withdrawal: { bg: 'bg-red-50 text-red-600', icon: ArrowUpRight },
  transfer_out: { bg: 'bg-red-50 text-red-600', icon: ArrowUpRight },
  payment: { bg: 'bg-red-50 text-red-600', icon: ArrowUpRight },
};

export default function TransactionsReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [dateRangeDays, setDateRangeDays] = useState('30');
  const [transactionType, setTransactionType] = useState('all');

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
      transaction_type: transactionType !== 'all' ? transactionType : undefined,
    };
  }, [dateRangeDays, transactionType]);

  const {
    data: report,
    isLoading,
    refetch,
  } = useTransactionReport(selectedOrganizationId || undefined, dateFilters);

  const { data: cashFlowData } = useCashFlow(
    selectedOrganizationId || undefined,
    dateFilters
  );

  const exportMutation = useExportReport();

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selectedOrganizationId) return;
    exportMutation.mutate({
      organization_id: selectedOrganizationId,
      report_type: 'transactions',
      format,
      filters: dateFilters,
    });
  };

  // Calculate totals
  const totals = useMemo(() => {
    if (!report?.summary) return { inflow: 0, outflow: 0, count: 0 };

    let inflow = 0;
    let outflow = 0;
    let count = 0;

    Object.entries(report.summary).forEach(([type, data]) => {
      const amount = parseFloat(data.total);
      count += data.count;
      if (type === 'deposit' || type === 'transfer_in') {
        inflow += amount;
      } else {
        outflow += amount;
      }
    });

    return { inflow, outflow, count };
  }, [report]);

  if (orgsLoading) {
    return (
      <PageContainer>
        <LoadingState message="Loading transaction report..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Transaction Reports"
        description="Cash flow analysis and transaction history"
        action={
          <div className="flex items-center gap-3">
            <Select value={transactionType} onValueChange={setTransactionType}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSACTION_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              <span className="text-sm text-gray-500">Total Inflow</span>
              <ArrowDownRight className="h-5 w-5 text-green-500" />
            </div>
            <div className="text-2xl font-semibold text-green-600">
              {formatCurrency(totals.inflow, organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Total Outflow</span>
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            </div>
            <div className="text-2xl font-semibold text-red-600">
              {formatCurrency(totals.outflow, organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Net Flow</span>
              <ArrowRightLeft className="h-5 w-5 text-blue-500" />
            </div>
            <div
              className={`text-2xl font-semibold ${
                totals.inflow - totals.outflow >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(totals.inflow - totals.outflow, organizationCurrency)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">Transactions</span>
              <ArrowRightLeft className="h-5 w-5 text-purple-500" />
            </div>
            <div className="text-2xl font-semibold text-gray-900">{totals.count}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base">Cash Flow Over Time</CardTitle>
          <CardDescription>Daily inflow and outflow comparison</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-64 flex items-center justify-center">
              <LoadingState message="Loading chart..." />
            </div>
          ) : cashFlowData?.cash_flow && cashFlowData.cash_flow.length > 0 ? (
            <CashFlowChart data={cashFlowData.cash_flow} currency={organizationCurrency} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No cash flow data available
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction Summary by Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary by Type</CardTitle>
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
            ) : report?.summary && Object.keys(report.summary).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(report.summary).map(([type, data], idx) => {
                  const typeConfig = TYPE_COLORS[type] || {
                    bg: 'bg-gray-50 text-gray-600',
                    icon: ArrowRightLeft,
                  };
                  const Icon = typeConfig.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`p-2 rounded-lg ${typeConfig.bg}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-900 capitalize">
                            {type.replace(/_/g, ' ')}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            ({data.count} transactions)
                          </span>
                        </div>
                      </div>
                      <span className="font-medium">
                        {formatCurrency(data.total, organizationCurrency)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No transaction data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(5)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-32" />
                      <div className="h-4 bg-gray-200 rounded w-20" />
                    </div>
                  ))}
              </div>
            ) : report?.transactions && report.transactions.length > 0 ? (
              <div className="space-y-3">
                {report.transactions.slice(0, 5).map((txn, idx) => {
                  const typeConfig = TYPE_COLORS[txn.transaction_type] || {
                    bg: 'bg-gray-50 text-gray-600',
                    icon: ArrowRightLeft,
                  };
                  const isInflow =
                    txn.transaction_type === 'deposit' ||
                    txn.transaction_type === 'transfer_in';
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-2 border-b last:border-0"
                    >
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {txn.description || txn.transaction_type.replace(/_/g, ' ')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {txn.wallet_name} • {format(parseISO(txn.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={`font-medium ${
                            isInflow ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(txn.amount, txn.currency || organizationCurrency)}
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            STATUS_COLORS[txn.status] || 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {txn.status}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                No transactions available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full Transaction Table */}
      {report?.transactions && report.transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Transactions</CardTitle>
            <CardDescription>Complete transaction history for the period</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Date
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Wallet
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Type
                    </th>
                    <th className="text-left text-xs font-medium text-gray-500 uppercase py-3">
                      Description
                    </th>
                    <th className="text-right text-xs font-medium text-gray-500 uppercase py-3">
                      Amount
                    </th>
                    <th className="text-center text-xs font-medium text-gray-500 uppercase py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {report.transactions.map((txn, idx) => {
                    const isInflow =
                      txn.transaction_type === 'deposit' ||
                      txn.transaction_type === 'transfer_in';
                    return (
                      <tr key={idx} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-3 text-sm text-gray-600">
                          {format(parseISO(txn.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="py-3 text-sm font-medium text-gray-900">
                          {txn.wallet_name}
                        </td>
                        <td className="py-3 text-sm text-gray-600 capitalize">
                          {txn.transaction_type.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 text-sm text-gray-600 max-w-xs truncate">
                          {txn.description || '-'}
                        </td>
                        <td
                          className={`py-3 text-sm font-medium text-right ${
                            isInflow ? 'text-green-600' : 'text-red-600'
                          }`}
                        >
                          {isInflow ? '+' : '-'}
                          {formatCurrency(txn.amount, txn.currency || organizationCurrency)}
                        </td>
                        <td className="py-3 text-center">
                          <span
                            className={`text-xs px-2 py-1 rounded-full ${
                              STATUS_COLORS[txn.status] || 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {txn.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
