/**
 * Bills Page - Accounts Payable Invoices
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
  MoreHorizontal,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  ArrowUpRight,
  Loader2,
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
  // Fallback to raw amounts if UGX fields not available (backwards compatibility)
  const totalPayableUgx = payableStats?.total_open_ugx
    ? parseFloat(payableStats.total_open_ugx)
    : (payableStats?.total_open_amount ? parseFloat(payableStats.total_open_amount) : 0);
  const overdueUgx = payableStats?.overdue_ugx
    ? parseFloat(payableStats.overdue_ugx)
    : (payableStats?.overdue_amount ? parseFloat(payableStats.overdue_amount) : 0);
  const totalOpen = payableStats?.total_open || 0;
  const overdueCount = payableStats?.overdue_count || 0;

  // Calculate due this week from current bills (local calculation for this specific metric)
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

  const tabs = [
    { value: 'bills', label: 'Bills', icon: Receipt },
    { value: 'processing', label: 'Processing', icon: Send },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Bills & Payables</h1>
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-gray-50 border-gray-200">
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
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncBills}
              disabled={isSyncing || !activeConnectionId}
              className="h-9"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync from Xero'}
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Total Payable:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                UGX {formatCompactNumber(totalPayableUgx)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Open Bills:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {totalOpen}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Overdue:</span>
              <span className={`px-2 py-0.5 rounded text-sm font-medium ${
                overdueCount > 0 ? 'bg-orange-50 text-orange-700' : 'bg-gray-100 text-gray-600'
              }`}>
                {overdueCount} ({formatCompactNumber(overdueUgx)})
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Due This Week:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-amber-50 text-amber-700">
                UGX {formatCompactNumber(dueThisWeekAmount)}
              </span>
            </div>
            {selectedBills.size > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-sm">Selected:</span>
                <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-700">
                  {selectedBills.size} bills
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value as 'bills' | 'processing')}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? 'border-[#638C80] text-[#638C80]'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'bills' ? (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search vendors, invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 bg-gray-50 border-gray-200"
                  />
                </div>

                <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[160px] h-9 bg-gray-50 border-gray-200">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="awaiting_approval">Approval</SelectItem>
                    <SelectItem value="awaiting_payment">Payment</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="repeating">Repeating</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Bills Table */}
            {isLoading ? (
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              </div>
            ) : error ? (
              <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
                <AlertCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Error loading bills</p>
                <p className="text-xs text-gray-400 mt-1">Please try refreshing the page</p>
              </div>
            ) : !filteredBills || filteredBills.length === 0 ? (
              <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
                <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {searchQuery ? 'No bills match your search' : 'No bills found'}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {searchQuery ? 'Try a different search term' : 'Sync with Xero to get started'}
                </p>
              </div>
            ) : (
              <>
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

                {selectedBills.size > 0 && (
                  <div className="fixed bottom-6 right-6 z-40">
                    <Button
                      onClick={() => setIsPayModalOpen(true)}
                      size="lg"
                      className="shadow-lg bg-[#638C80] hover:bg-[#547568]"
                    >
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay {selectedBills.size} Bill{selectedBills.size > 1 ? 's' : ''}
                      <ArrowUpRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        ) : (
          <ProcessingQueue organizationId={selectedOrganizationId} />
        )}
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
    switch (status) {
      case 'PAID':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3" />
            Paid
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            Draft
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
            Submitted
          </span>
        );
      case 'AUTHORISED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
            <Clock className="h-3 w-3" />
            Awaiting
          </span>
        );
      case 'REPEATING':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#638C80]/10 text-[#638C80]">
            Repeating
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getDueBadge = (bill: Bill) => {
    if (bill.status === 'PAID') return null;
    if (!bill.due_date) return null;

    if (isOverdue(bill.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded ml-2">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    if (isDueSoon(bill.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded ml-2">
          <Clock className="h-3 w-3" />
          Soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="py-3 px-4 w-10">
              <input
                type="checkbox"
                checked={allPayableSelected}
                ref={input => {
                  if (input) input.indeterminate = somePayableSelected;
                }}
                onChange={handleSelectAll}
                disabled={payableBills.length === 0}
                className="w-4 h-4 rounded border-gray-300 text-[#638C80] focus:ring-[#638C80] disabled:opacity-50"
              />
            </th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Vendor</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Invoice</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Due Date</th>
            <th className="text-right text-xs font-medium text-gray-500 py-3 px-4">Amount</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-4">Status</th>
            <th className="w-10 py-3 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {bills.map((bill) => {
            const canPay = isPayable(bill);
            const isSelected = selectedBills.has(bill.id);

            return (
              <tr
                key={bill.id}
                className={`hover:bg-gray-50 transition-colors ${
                  isSelected ? 'bg-[#638C80]/5' : ''
                } ${!canPay ? 'opacity-60' : 'cursor-pointer'}`}
                onClick={() => canPay && onSelectBill(bill.id)}
              >
                <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                  {canPay ? (
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onSelectBill(bill.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#638C80] focus:ring-[#638C80]"
                    />
                  ) : (
                    <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50" />
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
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
                  <span className="text-sm text-gray-700">{bill.invoice_number || '-'}</span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center">
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
                <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
