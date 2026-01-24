/**
 * Reports Dashboard - Main Reports Overview
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useOrganizations } from '@/hooks/use-organization';
import {
  useReportsDashboard,
  useAIInsights,
  useExportReport,
  useNaturalLanguageQuery,
} from '@/hooks/use-reports';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Wallet,
  Receipt,
  ArrowRightLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';
import Link from 'next/link';
import AIInsightsPanel from '@/components/reports/AIInsightsPanel';
import NaturalLanguageQuery from '@/components/reports/NaturalLanguageQuery';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

function formatCurrency(amount: string | number, currency: string = 'UGX'): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

function formatPercent(value: number): string {
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(1)}%`;
}

export default function ReportsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end: new Date().toISOString(),
  });

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const currentOrganization = organizations?.find(
    (org: any) => org.id === selectedOrganizationId
  );
  const organizationCurrency = currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const {
    data: dashboard,
    isLoading,
    refetch,
  } = useReportsDashboard(selectedOrganizationId || undefined, {
    start_date: dateRange.start,
    end_date: dateRange.end,
  });

  const { data: insights } = useAIInsights(selectedOrganizationId || undefined);
  const exportMutation = useExportReport();

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    if (!selectedOrganizationId) return;
    exportMutation.mutate({
      organization_id: selectedOrganizationId,
      report_type: 'dashboard',
      format,
      filters: {
        start_date: dateRange.start,
        end_date: dateRange.end,
      },
    });
  };

  const stats = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        title: 'Total Expenses',
        value: formatCurrency(dashboard.expenses?.total_amount || '0', organizationCurrency),
        change: dashboard.expenses?.change_percent || 0,
        icon: Receipt,
        color: '#9b59b6',
      },
      {
        title: 'Wallet Balance',
        value: formatCurrency(dashboard.wallets?.total_balance || '0', organizationCurrency),
        subtitle: `${dashboard.wallets?.wallet_count || 0} wallets`,
        icon: Wallet,
        color: '#4E97D1',
      },
      {
        title: 'Net Cash Flow',
        value: formatCurrency(dashboard.transactions?.net_flow || '0', organizationCurrency),
        subtitle: `${dashboard.transactions?.transaction_count || 0} transactions`,
        icon: ArrowRightLeft,
        color: parseFloat(dashboard.transactions?.net_flow || '0') >= 0 ? '#49a034' : '#dc2626',
      },
      {
        title: 'Pending Approval',
        value: formatCurrency(dashboard.expenses?.pending_amount || '0', organizationCurrency),
        subtitle: 'Awaiting review',
        icon: TrendingUp,
        color: '#fed652',
      },
    ];
  }, [dashboard, organizationCurrency]);

  const reportLinks = [
    {
      title: 'Financial Overview',
      description: 'Income vs expenses, balance trends, and wallet health',
      path: '/reports/financial',
      icon: BarChart3,
      color: '#4E97D1',
    },
    {
      title: 'Expense Analytics',
      description: 'Category breakdown, department spending, and trends',
      path: '/reports/expenses',
      icon: Receipt,
      color: '#9b59b6',
    },
    {
      title: 'Transaction History',
      description: 'Cash flow analysis and transaction details',
      path: '/reports/transactions',
      icon: ArrowRightLeft,
      color: '#49a034',
    },
  ];

  if (orgsLoading) {
    return (
      <PageContainer>
        <LoadingState message="Loading reports..." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        title="Reports & Analytics"
        description="Financial insights and business intelligence"
        action={
          <div className="flex items-center gap-3">
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

      {/* Natural Language Query */}
      <div className="mb-6">
        <NaturalLanguageQuery organizationId={selectedOrganizationId || ''} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          Array(4)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2" />
                  <div className="h-8 bg-gray-200 rounded w-32" />
                </CardContent>
              </Card>
            ))
        ) : (
          stats.map((stat, idx) => (
            <Card key={idx} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">{stat.title}</span>
                  <stat.icon className="h-5 w-5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-semibold text-gray-900">{stat.value}</div>
                {stat.change !== undefined && (
                  <div className="flex items-center mt-1">
                    {stat.change > 0 ? (
                      <TrendingUp className="h-4 w-4 text-red-500 mr-1" />
                    ) : stat.change < 0 ? (
                      <TrendingDown className="h-4 w-4 text-green-500 mr-1" />
                    ) : null}
                    <span
                      className={`text-sm ${
                        stat.change > 0 ? 'text-red-500' : stat.change < 0 ? 'text-green-500' : 'text-gray-500'
                      }`}
                    >
                      {formatPercent(stat.change)} from last period
                    </span>
                  </div>
                )}
                {stat.subtitle && !stat.change && (
                  <span className="text-sm text-gray-500">{stat.subtitle}</span>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* AI Insights */}
      {insights && insights.insights?.length > 0 && (
        <div className="mb-6">
          <AIInsightsPanel
            insights={insights.insights}
            organizationId={selectedOrganizationId || ''}
          />
        </div>
      )}

      {/* Quick Access Reports */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportLinks.map((report) => (
            <Link key={report.path} href={report.path}>
              <Card className="hover:shadow-md transition-all cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <report.icon
                          className="h-5 w-5"
                          style={{ color: report.color }}
                        />
                        <h3 className="font-medium text-gray-900">{report.title}</h3>
                      </div>
                      <p className="text-sm text-gray-500">{report.description}</p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expense Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expense Summary</CardTitle>
            <CardDescription>Last 30 days breakdown</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Submitted</span>
                  <span className="font-medium">
                    {formatCurrency(dashboard?.expenses?.total_amount || '0', organizationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Approved</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(dashboard?.expenses?.approved_amount || '0', organizationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Pending Approval</span>
                  <span className="font-medium text-yellow-600">
                    {formatCurrency(dashboard?.expenses?.pending_amount || '0', organizationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-600">Total Expense Count</span>
                  <span className="font-medium">{dashboard?.expenses?.count || 0}</span>
                </div>
              </div>
            )}
            <Link href="/reports/expenses">
              <Button variant="outline" className="w-full mt-4" size="sm">
                View Expense Analytics
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Wallet Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Wallet Summary</CardTitle>
            <CardDescription>Current balances and activity</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array(3)
                  .fill(0)
                  .map((_, i) => (
                    <div key={i} className="flex justify-between animate-pulse">
                      <div className="h-4 bg-gray-200 rounded w-24" />
                      <div className="h-4 bg-gray-200 rounded w-16" />
                    </div>
                  ))}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Balance</span>
                  <span className="font-medium">
                    {formatCurrency(dashboard?.wallets?.total_balance || '0', organizationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Department Wallets</span>
                  <span className="font-medium">{dashboard?.wallets?.department_wallets || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">General Wallets</span>
                  <span className="font-medium">{dashboard?.wallets?.general_wallets || 0}</span>
                </div>
                <div className="flex justify-between pt-3 border-t">
                  <span className="text-gray-600">Total Inflow (30d)</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(dashboard?.transactions?.total_inflow || '0', organizationCurrency)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Outflow (30d)</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(dashboard?.transactions?.total_outflow || '0', organizationCurrency)}
                  </span>
                </div>
              </div>
            )}
            <Link href="/reports/financial">
              <Button variant="outline" className="w-full mt-4" size="sm">
                View Financial Overview
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
