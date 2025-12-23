/**
 * Bills Page - Accounts Payable Invoices
 */

'use client';

import { useState, useEffect } from 'react';
import { useBills } from '@/hooks/use-bills';
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
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export default function BillsPage() {
  const [filters, setFilters] = useState<BillFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'bills' | 'processing'>('bills');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  const billFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined
  };

  const { data: billsResponse, isLoading, error } = useBills(billFilters);
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
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bills</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage accounts payable invoices
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[220px]">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select organization" />
                  </div>
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
                onClick={handleSyncBills}
                disabled={isSyncing || !activeConnectionId}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>

          {/* Main Tabs */}
          <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as 'bills' | 'processing')}>
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger
                value="bills"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Bills
              </TabsTrigger>
              <TabsTrigger
                value="processing"
                className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md px-4 py-2 text-sm font-medium"
              >
                <Send className="h-4 w-4 mr-2" />
                Processing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bills" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="bg-white rounded-lg border shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search bills..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>

                  <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[160px] h-9">
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
                <BillsLoadingSkeleton />
              ) : error ? (
                <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
                  <AlertCircle className="h-10 w-10 text-red-400 mx-auto mb-3" />
                  <p className="text-gray-500">Error loading bills</p>
                </div>
              ) : !filteredBills || filteredBills.length === 0 ? (
                <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
                  <FileText className="h-10 w-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    {searchQuery ? 'No bills match your search' : 'No bills found'}
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
                        className="shadow-lg"
                        size="lg"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Pay {selectedBills.size} Bill{selectedBills.size > 1 ? 's' : ''}
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="processing" className="mt-4">
              <ProcessingQueue organizationId={selectedOrganizationId} />
            </TabsContent>
          </Tabs>

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
      </div>
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

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-50 text-green-700';
      case 'DRAFT':
        return 'bg-gray-100 text-gray-600';
      case 'SUBMITTED':
        return 'bg-yellow-50 text-yellow-700';
      case 'AUTHORISED':
        return 'bg-blue-50 text-blue-700';
      case 'REPEATING':
        return 'bg-purple-50 text-purple-700';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="py-3 px-4 w-10">
                <input
                  type="checkbox"
                  checked={allPayableSelected}
                  ref={input => {
                    if (input) input.indeterminate = somePayableSelected;
                  }}
                  onChange={handleSelectAll}
                  disabled={payableBills.length === 0}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                />
              </th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Due</th>
              <th className="text-right py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="w-10 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {bills.map((bill) => {
              const canPay = isPayable(bill);

              return (
                <tr
                  key={bill.id}
                  className={`hover:bg-gray-50/50 transition-colors ${!canPay ? 'opacity-60' : ''}`}
                >
                  <td className="py-3 px-4">
                    {canPay ? (
                      <input
                        type="checkbox"
                        checked={selectedBills.has(bill.id)}
                        onChange={() => onSelectBill(bill.id)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded border border-gray-200 bg-gray-50" />
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-gray-900 text-sm">{bill.vendor_name}</div>
                    {bill.reference && (
                      <div className="text-xs text-gray-400">{bill.reference}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-700">{bill.invoice_number || '-'}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-gray-600">{formatDate(bill.due_date || '')}</span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {cleanCurrencyCode(bill.currency)} {parseFloat(
                        bill.status === 'PAID' ? bill.total : bill.amount_due
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BillsLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-4 w-4 bg-gray-100 rounded" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-50 rounded w-1/4" />
            </div>
            <div className="h-5 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
