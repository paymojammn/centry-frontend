/**
 * Bills Page - Accounts Payable Invoices
 *
 * Color Scheme:
 * - #6B8FB8 Blue - Draft
 * - #fed652 Mustard – Awaiting Approval
 * - #f77f00 Orange – Awaiting Payment
 * - #5C8A65 Green – Paid
 * - #bec3c6 Grey - Repeating
 */

'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useBills } from '@/hooks/use-bills';
import { usePaymentPipelineStats } from '@/hooks/use-banking';
import { useSyncBills, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
import { useCurrentUser } from '@/hooks/use-user';
import {
  FileText,
  Search,
  Building2,
  RefreshCw,
  Receipt,
  Send,
  CreditCard,
  AlertCircle,
  Clock,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Calendar,
  Wallet,
  ChevronRight,
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
import type { BillFilters, Bill } from '@/types/bill';
import PayBillsModal from '@/components/bills/PayBillsModal';
import ProcessingQueue from '@/components/bills/ProcessingQueue';
import { StatusBadge, StatusDot } from '@/components/ui/status-badge';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { ContentCard, ContentCardHeader } from '@/components/layout/content-card';
import { STATUS_COLORS, formatCompactNumber } from '@/lib/theme';

// Helper to extract clean currency code from enum-style strings
const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) {
    return currency.split('.').pop() || currency;
  }
  return currency;
};

// Get vendor initials for avatar
function getVendorInitials(name: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Check if bill is overdue
function isOverdue(dueDate: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

// Check if bill is due soon (within 7 days)
function isDueSoon(dueDate: string): boolean {
  if (!dueDate) return false;
  const due = new Date(dueDate);
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return due >= now && due <= sevenDaysLater;
}

export default function BillsPage() {
  const [filters, setFilters] = useState<BillFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'bills' | 'processing'>('bills');

  // Surface OneGate / Ozow hosted-checkout return as a toast. The provider
  // redirects back here with ?payment=success|cancelled|error and ?bill_id=…
  // after the customer finishes on the hosted page. We strip the params
  // afterwards so a refresh doesn't re-fire the toast.
  const router = useRouter();
  const searchParams = useSearchParams();
  const paymentToastHandled = useRef(false);
  useEffect(() => {
    if (paymentToastHandled.current) return;
    const payment = searchParams.get('payment');
    if (!payment) return;
    paymentToastHandled.current = true;
    const billIdParam = searchParams.get('bill_id');
    const orgFromReturn = searchParams.get('organization');
    const merchantRef = searchParams.get('merchant_reference');
    const transactionId = searchParams.get('transaction_id');
    if (orgFromReturn) {
      // OneGate's customer-return endpoint resolves the originating
      // Centry org UUID and propagates it here so we land on the right
      // tenant's bills page instead of falling back to organizations[0]
      // (which produced a 403 cascade when the user wasn't a member).
      setSelectedOrganizationId(orgFromReturn);
    }
    // Prefer the merchant_reference for the toast — it's the canonical
    // identifier the user typed when minting the payment-key, while the
    // numeric bill_id is parsed out of it server-side. Falls back to
    // bill_id when the reference wasn't propagated (older redirects).
    const refSuffix = merchantRef
      ? ` (${merchantRef})`
      : billIdParam
      ? ` for bill #${billIdParam}`
      : '';
    const txnSuffix = transactionId ? ` · txn ${transactionId}` : '';
    if (payment === 'success') {
      toast.success(`Payment successful${refSuffix}${txnSuffix}`);
      setActiveTab('processing');
    } else if (payment === 'cancelled') {
      toast.error(`Payment cancelled${refSuffix}`);
    } else {
      toast.error(`Payment failed${refSuffix}`);
    }
    const remaining = new URLSearchParams(searchParams.toString());
    for (const k of [
      'payment',
      'bill_id',
      'organization',
      'merchant_reference',
      'transaction_id',
      'payment_key',
    ]) {
      remaining.delete(k);
    }
    const qs = remaining.toString();
    router.replace(qs ? `/bills?${qs}` : '/bills', { scroll: false });
  }, [searchParams, router]);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: user } = useCurrentUser();

  // Check if user has payments.create permission (finance creator, owner, or admin)
  const canCreatePayment = useMemo(() => {
    if (!user) return false;
    // Org owners/admins have all permissions
    if (user.organizations?.some(
      (o) => o.membership_role === 'owner' || o.membership_role === 'admin',
    )) return true;
    // Check explicit payments.create permission
    return user.organizations?.some(
      (o) => o.permissions?.payments?.create === true,
    );
  }, [user]);

  const billFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined
  };

  const { data: billsResponse, isLoading, error } = useBills(billFilters);
  const { data: pipelineStats } = usePaymentPipelineStats(selectedOrganizationId || undefined);
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncBills, isPending: isSyncing } = useSyncBills();

  // Defensive dedupe: the backend bills endpoint can echo the same id when
  // ERP-synced rows overlap with locally-created rows on page boundaries.
  // Two rows with the same `id` would crash <BillsTable> with a duplicate
  // React key, so collapse them here and keep the first occurrence.
  const billsRaw = Array.isArray(billsResponse)
    ? billsResponse
    : (billsResponse as any)?.results || [];
  const bills: Bill[] = (() => {
    const seen = new Set<string | number>();
    const out: Bill[] = [];
    for (const b of billsRaw as Bill[]) {
      const k = (b?.id ?? `${out.length}`) as string | number;
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(b);
    }
    return out;
  })();

  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedOrganizationId) return;

    const orgConnection = erpConnections?.find(
      (conn: any) => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    setActiveConnectionId(orgConnection?.id || null);
  }, [selectedOrganizationId, erpConnections]);

  const selectedBillsData = bills?.filter((bill: Bill) => selectedBills.has(bill.id)) || [];

  const filteredBills = bills?.filter((bill: Bill) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bill.vendor_name?.toLowerCase().includes(query) ||
      bill.invoice_number?.toLowerCase().includes(query) ||
      bill.reference?.toLowerCase().includes(query)
    );
  });

  // Centry payment pipeline stats — sum/count of PaymentEvents that
  // Centry itself routes. Replaces the Xero-mirrored payable totals so the
  // summary row reflects what Centry is actually moving, not what's
  // outstanding upstream in the ERP.
  const pipelinePendingApproval = Number(pipelineStats?.pending_approval || 0);
  const pipelineProcessing = Number(pipelineStats?.processing || 0);
  const pipelineSent = Number(pipelineStats?.pending || 0) + Number(pipelineStats?.sent || 0);
  const pipelineSuccess = Number(pipelineStats?.success || 0);
  const pipelineInFlight = pipelinePendingApproval + pipelineProcessing + pipelineSent;
  const pipelineInFlightAmount =
    parseFloat(pipelineStats?.total_amount_pending_approval || '0') +
    parseFloat(pipelineStats?.total_amount_processing || '0') +
    parseFloat(pipelineStats?.total_amount_pending || '0') +
    parseFloat(pipelineStats?.total_amount_sent || '0');
  const pipelinePendingApprovalAmount = parseFloat(
    pipelineStats?.total_amount_pending_approval || '0'
  );
  const pipelineSentAmount =
    parseFloat(pipelineStats?.total_amount_pending || '0') +
    parseFloat(pipelineStats?.total_amount_sent || '0');

  // Get organization currency
  const currentOrganization = organizations?.find((org: any) => org.id === selectedOrganizationId);
  const organizationCurrency = currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  const handleStatusChange = (status: string) => {
    const validStatuses = ['all', 'draft', 'awaiting_approval', 'awaiting_payment', 'paid', 'repeating'];
    if (validStatuses.includes(status)) {
      setFilters(prev => ({
        ...prev,
        status: status as any
      }));
    }
  };

  const handleSyncBills = () => {
    if (activeConnectionId) {
      syncBills(activeConnectionId);
    }
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      {/* Header */}
      <PageHeader
        title="Bills"
        subtitle="Manage your accounts payable"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncBills}
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
              onClick={() => setActiveTab('bills')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'bills'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`py-3.5 text-sm font-medium border-b-2 transition-all ${
                activeTab === 'processing'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              Processing Queue
            </button>
          </nav>
        </div>
      </div>

      <div className="px-6 py-6">
        {activeTab === 'bills' && (
          <>
            {/* Summary Stats - Enhanced cards with animations */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
              <StatCard
                label="In Centry Pipeline"
                value={`${organizationCurrency} ${formatCompactNumber(pipelineInFlightAmount)}`}
                subtext={`${pipelineInFlight} payments in flight`}
                icon={Wallet}
                iconColor={STATUS_COLORS.awaiting_payment.bg}
                iconBgColor={STATUS_COLORS.awaiting_payment.light}
                variant="accent"
              />

              <StatCard
                label="Awaiting Approval"
                value={pipelinePendingApproval}
                subtext={`${organizationCurrency} ${formatCompactNumber(pipelinePendingApprovalAmount)}`}
                icon={Calendar}
                iconColor="#b08b00"
                iconBgColor={STATUS_COLORS.awaiting_approval.light}
                variant={pipelinePendingApproval > 0 ? 'warning' : 'default'}
              />

              <StatCard
                label="Sent to Bank"
                value={pipelineSent}
                subtext={`${organizationCurrency} ${formatCompactNumber(pipelineSentAmount)} · ${pipelineSuccess} settled`}
                icon={AlertTriangle}
                variant="accent"
              />

              {canCreatePayment && (
                <StatCard
                  label="Selected"
                  value={selectedBills.size}
                  icon={CheckCircle}
                  iconColor={selectedBills.size > 0 ? STATUS_COLORS.paid.bg : undefined}
                  iconBgColor={selectedBills.size > 0 ? STATUS_COLORS.paid.light : undefined}
                  variant="accent"
                >
                  {selectedBills.size > 0 ? (
                    <Button
                      onClick={() => setIsPayModalOpen(true)}
                      size="sm"
                      className="w-full text-white btn-press hover:opacity-90"
                      style={{ backgroundColor: 'var(--foreground)' }}
                    >
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pay Selected
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Select bills to pay</p>
                  )}
                </StatCard>
              )}
            </div>
          </>
        )}

        {/* Content Card */}
        <ContentCard noPadding className="animate-fade-in">
          {activeTab === 'bills' ? (
            <div>
              {/* Filters - Clean toolbar */}
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Search vendors, invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-card border-border text-sm text-foreground"
                    />
                  </div>
                  <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px] h-9 bg-card border-border text-sm text-foreground">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">
                        <span className="flex items-center gap-2">
                          <StatusDot status="draft" />
                          Draft
                        </span>
                      </SelectItem>
                      <SelectItem value="awaiting_approval">
                        <span className="flex items-center gap-2">
                          <StatusDot status="awaiting_approval" />
                          Awaiting Approval
                        </span>
                      </SelectItem>
                      <SelectItem value="awaiting_payment">
                        <span className="flex items-center gap-2">
                          <StatusDot status="awaiting_payment" />
                          Awaiting Payment
                        </span>
                      </SelectItem>
                      <SelectItem value="paid">
                        <span className="flex items-center gap-2">
                          <StatusDot status="paid" />
                          Paid
                        </span>
                      </SelectItem>
                      <SelectItem value="repeating">
                        <span className="flex items-center gap-2">
                          <StatusDot status="repeating" />
                          Repeating
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Bills Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <AlertCircle className="h-8 w-8 text-[#D4944A] mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Error loading bills</p>
                  <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
                </div>
              ) : !filteredBills || filteredBills.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">
                    {searchQuery ? 'No bills match your search' : 'No bills found'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery ? 'Try a different search term' : 'Sync with Xero to get started'}
                  </p>
                </div>
              ) : (
                <BillsTable
                  bills={filteredBills}
                  selectedBills={selectedBills}
                  canCreatePayment={!!canCreatePayment}
                  onSelectBill={(billId) => {
                    setSelectedBills(prev => {
                      const newSet = new Set(prev);
                      if (newSet.has(billId)) {
                        newSet.delete(billId);
                      } else {
                        newSet.add(billId);
                      }
                      return newSet;
                    });
                  }}
                  onSelectAll={(bills) => {
                    if (bills.length === 0) {
                      setSelectedBills(new Set());
                    } else {
                      setSelectedBills(new Set(bills.map(b => b.id)));
                    }
                  }}
                  onPayOne={(billId) => {
                    setSelectedBills(new Set([billId]));
                    setIsPayModalOpen(true);
                  }}
                />
              )}
            </div>
          ) : (
            <ProcessingQueue organizationId={selectedOrganizationId} />
          )}
        </ContentCard>
      </div>

      <PayBillsModal
        isOpen={isPayModalOpen}
        onClose={() => {
          setIsPayModalOpen(false);
          setSelectedBills(new Set());
        }}
        bills={selectedBillsData}
        organizationId={selectedOrganizationId || ''}
        countryCode="UG"
      />
    </div>
  );
}

interface BillsTableProps {
  bills: Bill[];
  selectedBills: Set<number>;
  canCreatePayment: boolean;
  onSelectBill: (billId: number) => void;
  onSelectAll: (bills: Bill[]) => void;
  onPayOne: (billId: number) => void;
}

function BillsTable({ bills, selectedBills, canCreatePayment, onSelectBill, onSelectAll, onPayOne }: BillsTableProps) {
  const payableBills = bills.filter(bill => bill.status === 'AUTHORISED');
  const allPayableSelected = payableBills.length > 0 && payableBills.every(bill => selectedBills.has(bill.id));
  const somePayableSelected = payableBills.some(bill => selectedBills.has(bill.id)) && !allPayableSelected;

  const handleSelectAll = () => {
    if (allPayableSelected) {
      onSelectAll([]);
    } else {
      onSelectAll(payableBills);
    }
  };

  const isPayable = (bill: Bill) => bill.status === 'AUTHORISED';

  const getStatusBadge = (status: string) => {
    return <StatusBadge status={status} />;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDueBadge = (bill: Bill) => {
    if (bill.status === 'PAID') return null;
    if (!bill.due_date) return null;

    if (isOverdue(bill.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-destructive ml-2">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    if (isDueSoon(bill.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 ml-2">
          <Clock className="h-3 w-3" />
          Soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-professional">
        <colgroup>
          {canCreatePayment && <col className="w-10" />}
          <col />
          <col className="w-[80px]" />{/* Invoice — narrow */}
          <col />
          <col className="w-[48px]" />
          <col />
          <col />
          <col className="w-[90px]" />{/* Pay action */}
        </colgroup>
        <thead>
          <tr>
            {canCreatePayment && (
              <th>
                <input
                  type="checkbox"
                  checked={allPayableSelected}
                  ref={input => {
                    if (input) input.indeterminate = somePayableSelected;
                  }}
                  onChange={handleSelectAll}
                  disabled={payableBills.length === 0}
                  className="w-4 h-4 rounded border-border text-foreground focus:ring-ring disabled:opacity-50"
                />
              </th>
            )}
            <th>Vendor</th>
            <th>Invoice</th>
            <th>Due Date</th>
            <th className="cell-currency">Ccy</th>
            <th className="text-right">Amount</th>
            <th>Status</th>
            <th className="text-right pr-4">{canCreatePayment ? '' : ''}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {bills.map((bill) => {
            const canPay = isPayable(bill);
            const isSelected = selectedBills.has(bill.id);

            return (
              <tr
                key={bill.id}
                className={`${isSelected ? 'is-selected' : ''} ${!canPay || !canCreatePayment ? 'opacity-60' : 'cursor-pointer'}`}
                onClick={() => canCreatePayment && canPay && onSelectBill(bill.id)}
              >
                {canCreatePayment && (
                  <td onClick={(e) => e.stopPropagation()}>
                    {canPay ? (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectBill(bill.id)}
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
                      {getVendorInitials(bill.vendor_name || '')}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate">{bill.vendor_name}</div>
                      {bill.reference && (
                        <span className="cell-sub truncate">{bill.reference}</span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="truncate" title={bill.invoice_number || ''}>{bill.invoice_number || '-'}</td>
                <td className="cell-muted">
                  <div className="flex items-center gap-2">
                    <span>{formatDate(bill.due_date || '')}</span>
                    {getDueBadge(bill)}
                  </div>
                </td>
                <td className="cell-currency">{cleanCurrencyCode(bill.currency)}</td>
                <td className="cell-amount">
                  {parseFloat(
                    bill.status === 'PAID' ? bill.total : bill.amount_due
                  ).toLocaleString(undefined, {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0
                  })}
                </td>
                <td>
                  {getStatusBadge(bill.status)}
                </td>
                <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                  {canCreatePayment && canPay && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-2.5 text-xs font-normal"
                      onClick={() => onPayOne(bill.id)}
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Pay
                    </Button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
