/**
 * Bills Page - Accounts Payable Invoices
 *
 * Color Scheme:
 * - #4E97D1 Blue - Draft
 * - #fed652 Mustard – Awaiting Approval
 * - #f77f00 Orange – Awaiting Payment
 * - #49a034 Green – Paid
 * - #bec3c6 Grey - Repeating
 */

'use client';

import { useState, useEffect } from 'react';
import { useBills } from '@/hooks/use-bills';
import { usePayableStats } from '@/hooks/use-purchases';
import { useSyncBills, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
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

// Status color constants (Xero-inspired)
const STATUS_COLORS = {
  draft: { bg: '#4E97D1', text: '#ffffff', light: '#E8F2FA', border: '#4E97D1' },
  awaiting_approval: { bg: '#fed652', text: '#7a5c00', light: '#FFF9E5', border: '#fed652' },
  awaiting_payment: { bg: '#f77f00', text: '#ffffff', light: '#FFF0E5', border: '#f77f00' },
  paid: { bg: '#49a034', text: '#ffffff', light: '#E8F5E5', border: '#49a034' },
  repeating: { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7', border: '#bec3c6' },
} as const;

// Helper to extract clean currency code from enum-style strings
const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) {
    return currency.split('.').pop() || currency;
  }
  return currency;
};

// Format large numbers compactly
function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

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

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  const billFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined
  };

  const { data: billsResponse, isLoading, error } = useBills(billFilters);
  const { data: payableStats } = usePayableStats(selectedOrganizationId || undefined);
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncBills, isPending: isSyncing } = useSyncBills();

  const bills = Array.isArray(billsResponse)
    ? billsResponse
    : (billsResponse as any)?.results || [];

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

  // Use stats from backend API (currency-converted, matches Xero)
  const totalPayableUgx = payableStats?.total_open_ugx
    ? parseFloat(payableStats.total_open_ugx)
    : (payableStats?.total_open_amount ? parseFloat(payableStats.total_open_amount) : 0);
  const overdueUgx = payableStats?.overdue_ugx
    ? parseFloat(payableStats.overdue_ugx)
    : (payableStats?.overdue_amount ? parseFloat(payableStats.overdue_amount) : 0);
  const totalOpen = payableStats?.total_open || 0;
  const overdueCount = payableStats?.overdue_count || 0;

  // Calculate due this week from current bills
  const dueThisWeekAmount = bills.reduce((sum: number, bill: Bill) => {
    if (bill.status === 'AUTHORISED' && isDueSoon(bill.due_date || '')) {
      return sum + parseFloat(bill.amount_due || '0');
    }
    return sum;
  }, 0);

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
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* Header - Clean Xero-style */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-xl font-semibold text-gray-900">Bills</h1>
            <div className="flex items-center gap-3">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-white border-gray-200 text-sm">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncBills}
                disabled={isSyncing || !activeConnectionId}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs - Xero-style horizontal nav */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex gap-8">
            <button
              onClick={() => setActiveTab('bills')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'bills'
                  ? 'border-[#1c252c] text-[#1c252c]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Bills
            </button>
            <button
              onClick={() => setActiveTab('processing')}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'processing'
                  ? 'border-[#1c252c] text-[#1c252c]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Processing Queue
            </button>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'bills' && (
          <>
            {/* Summary Stats - Clean horizontal cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Payable</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      UGX {formatCompactNumber(totalPayableUgx)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.awaiting_payment.light }}>
                    <Wallet className="h-5 w-5" style={{ color: STATUS_COLORS.awaiting_payment.bg }} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">{totalOpen} open bills</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Due This Week</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">
                      UGX {formatCompactNumber(dueThisWeekAmount)}
                    </p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: STATUS_COLORS.awaiting_approval.light }}>
                    <Calendar className="h-5 w-5" style={{ color: '#b08b00' }} />
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">Due within 7 days</p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Overdue</p>
                    <p className={`text-2xl font-semibold mt-1 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                      {overdueCount}
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${overdueCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
                    <AlertTriangle className={`h-5 w-5 ${overdueCount > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  </div>
                </div>
                <p className={`text-xs mt-2 ${overdueCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                  UGX {formatCompactNumber(overdueUgx)} overdue
                </p>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Selected</p>
                    <p className="text-2xl font-semibold text-gray-900 mt-1">{selectedBills.size}</p>
                  </div>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: selectedBills.size > 0 ? STATUS_COLORS.paid.light : '#f5f5f5' }}>
                    <CheckCircle className="h-5 w-5" style={{ color: selectedBills.size > 0 ? STATUS_COLORS.paid.bg : '#9ca3af' }} />
                  </div>
                </div>
                {selectedBills.size > 0 ? (
                  <Button
                    onClick={() => setIsPayModalOpen(true)}
                    size="sm"
                    className="mt-2 w-full text-white"
                    style={{ backgroundColor: STATUS_COLORS.paid.bg }}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Pay Selected
                  </Button>
                ) : (
                  <p className="text-xs text-gray-500 mt-2">Select bills to pay</p>
                )}
              </div>
            </div>
          </>
        )}

        {/* Content Card */}
        <div className="bg-white rounded-lg border border-gray-200">
          {activeTab === 'bills' ? (
            <div>
              {/* Filters - Clean toolbar */}
              <div className="px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search vendors, invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9 bg-white border-gray-200 text-sm"
                    />
                  </div>
                  <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 text-sm">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="draft">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.draft.bg }} />
                          Draft
                        </span>
                      </SelectItem>
                      <SelectItem value="awaiting_approval">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.awaiting_approval.bg }} />
                          Awaiting Approval
                        </span>
                      </SelectItem>
                      <SelectItem value="awaiting_payment">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.awaiting_payment.bg }} />
                          Awaiting Payment
                        </span>
                      </SelectItem>
                      <SelectItem value="paid">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.paid.bg }} />
                          Paid
                        </span>
                      </SelectItem>
                      <SelectItem value="repeating">
                        <span className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.repeating.bg }} />
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
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : error ? (
                <div className="text-center py-16">
                  <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">Error loading bills</p>
                  <p className="text-sm text-gray-500 mt-1">Please try refreshing the page</p>
                </div>
              ) : !filteredBills || filteredBills.length === 0 ? (
                <div className="text-center py-16">
                  <FileText className="h-8 w-8 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-900">
                    {searchQuery ? 'No bills match your search' : 'No bills found'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {searchQuery ? 'Try a different search term' : 'Sync with Xero to get started'}
                  </p>
                </div>
              ) : (
                <BillsTable
                  bills={filteredBills}
                  selectedBills={selectedBills}
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
                />
              )}
            </div>
          ) : (
            <ProcessingQueue organizationId={selectedOrganizationId} />
          )}
        </div>
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
  onSelectBill: (billId: number) => void;
  onSelectAll: (bills: Bill[]) => void;
}

function BillsTable({ bills, selectedBills, onSelectBill, onSelectAll }: BillsTableProps) {
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
    // Using the defined color scheme
    switch (status) {
      case 'PAID':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: STATUS_COLORS.paid.light, color: STATUS_COLORS.paid.bg }}
          >
            Paid
          </span>
        );
      case 'DRAFT':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: STATUS_COLORS.draft.light, color: STATUS_COLORS.draft.bg }}
          >
            Draft
          </span>
        );
      case 'SUBMITTED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: STATUS_COLORS.awaiting_approval.light, color: STATUS_COLORS.awaiting_approval.text }}
          >
            Awaiting Approval
          </span>
        );
      case 'AUTHORISED':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: STATUS_COLORS.awaiting_payment.light, color: STATUS_COLORS.awaiting_payment.bg }}
          >
            Awaiting Payment
          </span>
        );
      case 'REPEATING':
        return (
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
            style={{ backgroundColor: STATUS_COLORS.repeating.light, color: STATUS_COLORS.repeating.text }}
          >
            Repeating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
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
        <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 ml-2">
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
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={allPayableSelected}
                ref={input => {
                  if (input) input.indeterminate = somePayableSelected;
                }}
                onChange={handleSelectAll}
                disabled={payableBills.length === 0}
                className="w-4 h-4 rounded border-gray-300 text-[#1c252c] focus:ring-[#1c252c] disabled:opacity-50"
              />
            </th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Vendor</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Invoice</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Due Date</th>
            <th className="text-right text-xs font-medium text-gray-600 py-3 px-4">Amount</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Status</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {bills.map((bill) => {
            const canPay = isPayable(bill);
            const isSelected = selectedBills.has(bill.id);

            return (
              <tr
                key={bill.id}
                className={`transition-colors ${
                  isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                } ${!canPay ? 'opacity-60' : 'cursor-pointer'}`}
                onClick={() => canPay && onSelectBill(bill.id)}
              >
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  {canPay ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectBill(bill.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#1c252c] focus:ring-[#1c252c]"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50" />
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
                      {getVendorInitials(bill.vendor_name || '')}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{bill.vendor_name}</div>
                      {bill.reference && (
                        <div className="text-xs text-gray-500">{bill.reference}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-900">{bill.invoice_number || '-'}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{formatDate(bill.due_date || '')}</span>
                    {getDueBadge(bill)}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {cleanCurrencyCode(bill.currency)} {parseFloat(
                      bill.status === 'PAID' ? bill.total : bill.amount_due
                    ).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0
                    })}
                  </span>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(bill.status)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
