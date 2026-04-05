/**
 * Invoices Page - Sales Invoices (Receivables / Payins)
 *
 * Color Scheme:
 * - #4E97D1 Blue - Draft
 * - #fed652 Mustard - Sent
 * - #f77f00 Orange - Outstanding
 * - #49a034 Green - Paid
 * - #bec3c6 Grey - Voided / Repeating
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useInvoices, useInvoiceStats } from '@/hooks/use-invoices';
import { useSyncBills, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Receipt,
  Search,
  RefreshCw,
  AlertTriangle,
  Clock,
  Loader2,
  Calendar,
  Wallet,
  ChevronRight,
  Send,
  CheckCircle,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge, StatusDot } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { ContentCard } from '@/components/layout/content-card';
import { STATUS_COLORS, formatCompactNumber } from '@/lib/theme';
import type { Invoice, InvoiceFilters } from '@/lib/invoices-api';

const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) return currency.split('.').pop() || currency;
  return currency;
};

function getCustomerInitials(name: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return name.substring(0, 2).toUpperCase();
}

function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function isDueSoon(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return due >= now && due <= sevenDays;
}

export default function InvoicesPage() {
  const router = useRouter();
  const [filters, setFilters] = useState<InvoiceFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncSales, isPending: isSyncing } = useSyncBills(); // Same sync trigger

  const invoiceFilters = { ...filters, organization: selectedOrganizationId || undefined };
  const { data: invoicesResponse, isLoading, error } = useInvoices(invoiceFilters);
  const { data: stats } = useInvoiceStats(selectedOrganizationId || undefined);

  const invoices: Invoice[] = Array.isArray(invoicesResponse)
    ? invoicesResponse
    : (invoicesResponse as any)?.results || [];

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedOrganizationId) return;
    const conn = erpConnections?.find(
      (c: any) => c.organization?.id === selectedOrganizationId && c.is_active
    );
    setActiveConnectionId(conn?.id || null);
  }, [selectedOrganizationId, erpConnections]);

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.reference?.toLowerCase().includes(q)
    );
  });

  const totalOutstanding = stats ? parseFloat(stats.total_outstanding) : 0;
  const overdueAmount = stats ? parseFloat(stats.overdue_amount) : 0;
  const overdueCount = stats?.overdue_count || 0;
  const outstandingCount = stats?.outstanding_count || 0;

  const dueThisWeek = invoices.reduce((sum, inv) => {
    if (inv.status === 'AUTHORISED' && isDueSoon(inv.due_date || '')) {
      return sum + parseFloat(inv.amount_due || '0');
    }
    return sum;
  }, 0);

  const currentOrg = organizations?.find((o: any) => o.id === selectedOrganizationId);
  const orgCurrency = currentOrg?.primary_currency || currentOrg?.currency || 'UGX';

  const handleSync = () => {
    if (activeConnectionId) syncSales(activeConnectionId);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, string> = {
      DRAFT: 'draft',
      SUBMITTED: 'awaiting_approval',
      AUTHORISED: 'awaiting_payment',
      PAID: 'paid',
      REPEATING: 'repeating',
      VOIDED: 'failed',
    };
    return <StatusBadge status={map[status] || 'draft'} />;
  };

  const getDueBadge = (inv: Invoice) => {
    if (inv.status === 'PAID' || !inv.due_date) return null;
    if (isOverdue(inv.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive ml-2">
          <AlertTriangle className="h-3 w-3" /> Overdue
        </span>
      );
    }
    if (isDueSoon(inv.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 ml-2">
          <Clock className="h-3 w-3" /> Soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Invoices"
        subtitle="Sales invoices and receivables"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isSyncing || !activeConnectionId}
          className="h-9 btn-press"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <StatCard
            label="Outstanding"
            value={`${orgCurrency} ${formatCompactNumber(totalOutstanding)}`}
            subtext={`${outstandingCount} open invoices`}
            icon={Wallet}
            iconColor={STATUS_COLORS.awaiting_payment.bg}
            iconBgColor={STATUS_COLORS.awaiting_payment.light}
            variant="accent"
          />
          <StatCard
            label="Due This Week"
            value={`${orgCurrency} ${formatCompactNumber(dueThisWeek)}`}
            subtext="Due within 7 days"
            icon={Calendar}
            iconColor="#b08b00"
            iconBgColor={STATUS_COLORS.awaiting_approval.light}
            variant="warning"
          />
          <StatCard
            label="Overdue"
            value={overdueCount}
            subtext={`${orgCurrency} ${formatCompactNumber(overdueAmount)} overdue`}
            icon={AlertTriangle}
            variant={overdueCount > 0 ? 'danger' : 'default'}
          />
          <StatCard
            label="Total Paid"
            value={`${orgCurrency} ${formatCompactNumber(parseFloat(stats?.total_paid || '0'))}`}
            subtext={`${stats?.total_invoices || 0} total invoices`}
            icon={CheckCircle}
            iconColor={STATUS_COLORS.paid.bg}
            iconBgColor={STATUS_COLORS.paid.light}
          />
        </div>

        {/* Content */}
        <ContentCard noPadding className="animate-fade-in">
          {/* Toolbar */}
          <div className="px-4 py-3 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search customers, invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-card border-border text-sm text-foreground"
                />
              </div>
              <Select value={filters.status || 'all'} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger className="w-[140px] h-9 bg-card border-border text-sm text-foreground">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">
                    <span className="flex items-center gap-2"><StatusDot status="draft" /> Draft</span>
                  </SelectItem>
                  <SelectItem value="sent">
                    <span className="flex items-center gap-2"><StatusDot status="awaiting_approval" /> Sent</span>
                  </SelectItem>
                  <SelectItem value="outstanding">
                    <span className="flex items-center gap-2"><StatusDot status="awaiting_payment" /> Outstanding</span>
                  </SelectItem>
                  <SelectItem value="paid">
                    <span className="flex items-center gap-2"><StatusDot status="paid" /> Paid</span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
            </div>
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="h-8 w-8 text-[#D4944A] mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Error loading invoices</p>
              <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="text-center py-16">
              <Receipt className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? 'No invoices match your search' : 'No invoices found'}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchQuery ? 'Try a different search term' : 'Sync with your ERP to get started'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-professional">
                <thead>
                  <tr>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Customer</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Invoice</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Date</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Due Date</th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Amount</th>
                    <th className="text-right text-xs font-medium text-muted-foreground py-3 px-4">Paid</th>
                    <th className="text-left text-xs font-medium text-muted-foreground py-3 px-4">Status</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredInvoices.map((inv) => (
                    <tr
                      key={inv.id}
                      className="transition-colors hover:bg-muted cursor-pointer"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                            {getCustomerInitials(inv.customer_name || '')}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-foreground">{inv.customer_name}</div>
                            {inv.reference && (
                              <div className="text-xs text-muted-foreground">{inv.reference}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-foreground">{inv.invoice_number || '-'}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-muted-foreground">{formatDate(inv.date)}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-muted-foreground">{formatDate(inv.due_date || '')}</span>
                          {getDueBadge(inv)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm font-medium text-foreground">
                          {cleanCurrencyCode(inv.currency)} {parseFloat(inv.total).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-sm text-muted-foreground">
                          {parseFloat(inv.amount_paid) > 0
                            ? `${cleanCurrencyCode(inv.currency)} ${parseFloat(inv.amount_paid).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                            : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(inv.status)}</td>
                      <td className="py-3 px-4">
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ContentCard>
      </div>
    </div>
  );
}
