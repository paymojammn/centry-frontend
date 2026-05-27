/**
 * Invoices Page - Sales Invoices (Receivables / Payins)
 *
 * Color Scheme:
 * - #6B8FB8 Blue - Draft
 * - #fed652 Mustard - Sent
 * - #f77f00 Orange - Outstanding
 * - #5C8A65 Green - Paid
 * - #bec3c6 Grey - Voided / Repeating
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useInvoices, useCollectionEvents } from '@/hooks/use-invoices';
import { useSyncInvoices, useERPConnections } from '@/hooks/use-erp';
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
import { useCurrentUser } from '@/hooks/use-user';
import CollectInvoiceModal from '@/components/invoices/CollectInvoiceModal';
import CollectionsQueue from '@/components/invoices/CollectionsQueue';
import { CreditCard } from 'lucide-react';
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
  const [selectedInvoices, setSelectedInvoices] = useState<Set<number>>(new Set());
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'invoices' | 'collections'>('invoices');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: user } = useCurrentUser();

  const canCollect = useMemo(() => {
    if (!user) return false;
    // Org owners/admins have all permissions
    if (user.organizations?.some(
      (o: any) => o.membership_role === 'owner' || o.membership_role === 'admin',
    )) return true;
    // Check explicit invoices.collect permission
    return user.organizations?.some(
      (o: any) => o.permissions?.invoices?.collect === true,
    );
  }, [user]);
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncSales, isPending: isSyncing } = useSyncInvoices();

  const invoiceFilters = { ...filters, organization: selectedOrganizationId || undefined };
  const { data: invoicesResponse, isLoading, error } = useInvoices(invoiceFilters);
  const { data: collectionEvents } = useCollectionEvents(
    selectedOrganizationId || undefined,
  );

  const invoices: Invoice[] = Array.isArray(invoicesResponse)
    ? invoicesResponse
    : (invoicesResponse as any)?.results || [];

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  // OneGate / Ozow hosted-checkout return handler. The provider redirects
  // back here with ?payment=success|cancelled|error plus the originating
  // ?organization=<uuid> so we land on the right tenant instead of falling
  // back to organizations[0] (which produces a 403 when the user isn't a
  // member of that one). Mirrors the same effect in /bills/page.tsx.
  const searchParams = useSearchParams();
  const paymentToastHandled = useRef(false);
  useEffect(() => {
    if (paymentToastHandled.current) return;
    const payment = searchParams.get('payment');
    if (!payment) return;
    paymentToastHandled.current = true;
    const invoiceIdParam = searchParams.get('invoice_id');
    const orgFromReturn = searchParams.get('organization');
    const merchantRef = searchParams.get('merchant_reference');
    const transactionId = searchParams.get('transaction_id');
    if (orgFromReturn) {
      setSelectedOrganizationId(orgFromReturn);
    }
    const refSuffix = merchantRef
      ? ` (${merchantRef})`
      : invoiceIdParam
      ? ` for invoice #${invoiceIdParam}`
      : '';
    const txnSuffix = transactionId ? ` · txn ${transactionId}` : '';
    if (payment === 'success') {
      toast.success(`Payment successful${refSuffix}${txnSuffix}`);
      setActiveTab('collections');
    } else if (payment === 'cancelled') {
      toast.error(`Payment cancelled${refSuffix}`);
    } else {
      toast.error(`Payment failed${refSuffix}`);
    }
    const remaining = new URLSearchParams(searchParams.toString());
    for (const k of [
      'payment',
      'invoice_id',
      'organization',
      'merchant_reference',
      'transaction_id',
      'payment_key',
    ]) {
      remaining.delete(k);
    }
    const qs = remaining.toString();
    router.replace(qs ? `/invoices?${qs}` : '/invoices', { scroll: false });
  }, [searchParams, router]);

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

  const selectedInvoicesData = invoices.filter((inv) => selectedInvoices.has(inv.id));
  const collectableInvoices = invoices.filter((inv) => inv.status === 'AUTHORISED');

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      inv.customer_name?.toLowerCase().includes(q) ||
      inv.invoice_number?.toLowerCase().includes(q) ||
      inv.reference?.toLowerCase().includes(q)
    );
  });

  // Centry-internal collection pipeline stats — computed from CollectionEvent
  // records (collections initiated through Centry), not from Xero-mirrored
  // receivable totals. So Outstanding/Overdue/Due-This-Week make way for
  // "what Centry is actually collecting".
  const collections = Array.isArray(collectionEvents) ? collectionEvents : [];
  const IN_FLIGHT_STATUSES = new Set([
    'PENDING_APPROVAL',
    'PROCESSING',
    'PENDING',
    'SENT_PAYMENT',
  ]);
  const collInFlight = collections.filter((e: any) =>
    IN_FLIGHT_STATUSES.has(e.provider_status),
  );
  const collPendingApproval = collections.filter(
    (e: any) => e.provider_status === 'PENDING_APPROVAL',
  );
  const collSettled = collections.filter(
    (e: any) => e.provider_status === 'SUCCESS_PAYMENT',
  );
  const sumAmount = (rows: any[]) =>
    rows.reduce((s, r) => s + parseFloat(r.amount || '0'), 0);
  const collInFlightAmount = sumAmount(collInFlight);
  const collPendingApprovalAmount = sumAmount(collPendingApproval);
  const collSettledAmount = sumAmount(collSettled);

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

      {/* Tabs */}
      <div className="bg-card border-b border-border shadow-sm">
        <div className="px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('invoices')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'invoices'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Invoices
            </button>
            <button
              onClick={() => setActiveTab('collections')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'collections'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Collections Queue
            </button>
          </nav>
        </div>
      </div>

      <div className="px-6 py-6">
        {activeTab === 'invoices' && (
          <>
            {/* Summary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
              <StatCard
                label="In Centry Pipeline"
                value={`${orgCurrency} ${formatCompactNumber(collInFlightAmount)}`}
                subtext={`${collInFlight.length} collections in flight`}
                icon={Wallet}
                iconColor={STATUS_COLORS.awaiting_payment.bg}
                iconBgColor={STATUS_COLORS.awaiting_payment.light}
                variant="accent"
              />
              <StatCard
                label="Awaiting Approval"
                value={collPendingApproval.length}
                subtext={`${orgCurrency} ${formatCompactNumber(collPendingApprovalAmount)}`}
                icon={Calendar}
                iconColor="#b08b00"
                iconBgColor={STATUS_COLORS.awaiting_approval.light}
                variant={collPendingApproval.length > 0 ? 'warning' : 'default'}
              />
              <StatCard
                label="Collected"
                value={collSettled.length}
                subtext={`${orgCurrency} ${formatCompactNumber(collSettledAmount)} settled`}
                icon={CheckCircle}
                iconColor={STATUS_COLORS.paid.bg}
                iconBgColor={STATUS_COLORS.paid.light}
                variant="default"
              />
              {canCollect && (
                <StatCard
                  label="Selected"
                  value={selectedInvoices.size}
                  icon={CheckCircle}
                  iconColor={selectedInvoices.size > 0 ? STATUS_COLORS.paid.bg : undefined}
                  iconBgColor={selectedInvoices.size > 0 ? STATUS_COLORS.paid.light : undefined}
                  variant={selectedInvoices.size > 0 ? 'accent' : 'default'}
                >
                  {selectedInvoices.size > 0 ? (
                    <Button
                      onClick={() => setIsCollectModalOpen(true)}
                      size="sm"
                      className="w-full text-white btn-press"
                      style={{ backgroundColor: STATUS_COLORS.paid.bg }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Collect Payment
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select invoices to collect</p>
                  )}
                </StatCard>
              )}
            </div>
          </>
        )}

        {/* Content Card — wraps both tabs like bills page */}
        <ContentCard noPadding className="animate-fade-in">
          {activeTab === 'invoices' ? (
            <div>
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
                        {canCollect && (
                          <th className="w-10">
                            <input
                              type="checkbox"
                              checked={collectableInvoices.length > 0 && collectableInvoices.every((i) => selectedInvoices.has(i.id))}
                              ref={(input) => {
                                if (input) input.indeterminate = collectableInvoices.some((i) => selectedInvoices.has(i.id)) && !collectableInvoices.every((i) => selectedInvoices.has(i.id));
                              }}
                              onChange={() => {
                                if (collectableInvoices.every((i) => selectedInvoices.has(i.id))) {
                                  setSelectedInvoices(new Set());
                                } else {
                                  setSelectedInvoices(new Set(collectableInvoices.map((i) => i.id)));
                                }
                              }}
                              disabled={collectableInvoices.length === 0}
                              className="w-4 h-4 rounded border-border text-foreground focus:ring-ring disabled:opacity-50"
                            />
                          </th>
                        )}
                        <th>Customer</th>
                        <th>Invoice</th>
                        <th>Due Date</th>
                        <th className="cell-currency">Ccy</th>
                        <th className="text-right">Amount</th>
                        <th>Status</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredInvoices.map((inv) => {
                        const isCollectable = inv.status === 'AUTHORISED';
                        const isSelected = selectedInvoices.has(inv.id);
                        return (
                          <tr
                            key={inv.id}
                            className={`${isSelected ? 'is-selected' : ''} ${!isCollectable || !canCollect ? 'opacity-60' : 'cursor-pointer'}`}
                            onClick={() => {
                              if (canCollect && isCollectable) {
                                setSelectedInvoices((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(inv.id)) next.delete(inv.id);
                                  else next.add(inv.id);
                                  return next;
                                });
                              } else {
                                router.push(`/invoices/${inv.id}`);
                              }
                            }}
                          >
                            {canCollect && (
                              <td onClick={(e) => e.stopPropagation()}>
                                {isCollectable ? (
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => {
                                      setSelectedInvoices((prev) => {
                                        const next = new Set(prev);
                                        if (next.has(inv.id)) next.delete(inv.id);
                                        else next.add(inv.id);
                                        return next;
                                      });
                                    }}
                                    className="w-4 h-4 rounded border-border text-foreground focus:ring-ring"
                                  />
                                ) : (
                                  <div className="w-4 h-4 rounded border border-border bg-muted" />
                                )}
                              </td>
                            )}
                            <td className="cell-primary">
                              <div className="flex items-center gap-3">
                                <div className="cell-avatar">
                                  {getCustomerInitials(inv.customer_name || '')}
                                </div>
                                <div className="min-w-0">
                                  <div className="truncate">{inv.customer_name}</div>
                                  {inv.reference && (
                                    <span className="cell-sub truncate">{inv.reference}</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td>{inv.invoice_number || '-'}</td>
                            <td className="cell-muted">
                              <div className="flex items-center gap-1">
                                <span>{formatDate(inv.due_date || '')}</span>
                                {getDueBadge(inv)}
                              </div>
                            </td>
                            <td className="cell-currency">{cleanCurrencyCode(inv.currency)}</td>
                            <td className="cell-amount">
                              {parseFloat(
                                inv.status === 'PAID' ? inv.total : inv.amount_due
                              ).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td>{getStatusBadge(inv.status)}</td>
                            <td>
                              <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <CollectionsQueue organizationId={selectedOrganizationId} />
          )}
        </ContentCard>
      </div>

      <CollectInvoiceModal
        isOpen={isCollectModalOpen}
        onClose={() => {
          setIsCollectModalOpen(false);
          setSelectedInvoices(new Set());
        }}
        invoices={selectedInvoicesData}
        organizationId={selectedOrganizationId || ''}
      />
    </div>
  );
}
