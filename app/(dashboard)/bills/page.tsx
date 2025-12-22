/**
 * Bills Page - Accounts Payable Invoices
 *
 * Displays bills synced from Xero that need to be paid
 */

'use client';

import { useState, useEffect } from 'react';
import { useBills, useBillStats } from '@/hooks/use-bills';
import { useSyncBills, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
import {
  FileText,
  DollarSign,
  Calendar,
  AlertCircle,
  Search,
  Filter,
  Building2,
  Clock,
  CreditCard,
  RefreshCw,
  Receipt,
  Send,
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

export default function BillsPage() {
  const [filters, setFilters] = useState<BillFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBills, setSelectedBills] = useState<Set<number>>(new Set());
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeMainTab, setActiveMainTab] = useState<'bills' | 'processing'>('bills');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Include organization in filters for API query
  const billFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined
  };

  const { data: billsResponse, isLoading, error } = useBills(billFilters);
  const { data: stats } = useBillStats(selectedOrganizationId || undefined);
  const { data: erpConnectionsResponse, isLoading: connectionsLoading } = useERPConnections();
  const { mutate: syncBills, isPending: isSyncing } = useSyncBills();

  // Handle both array format and paginated format { results: [] }
  const bills = Array.isArray(billsResponse)
    ? billsResponse
    : (billsResponse as any)?.results || [];

  // Extract connections from paginated response
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      // Default to first organization
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Find active ERP connection for selected organization
  useEffect(() => {
    if (!selectedOrganizationId) return;

    // Find connection for selected organization
    const orgConnection = erpConnections?.find(
      conn => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    if (orgConnection) {
      setActiveConnectionId(orgConnection.id);
    } else {
      setActiveConnectionId(null);
    }
  }, [selectedOrganizationId, erpConnections]);

  // Get selected bills data
  const selectedBillsData = bills?.filter(bill => selectedBills.has(bill.id)) || [];

  // Filter bills by search query (organization filtering is now handled by API)
  const filteredBills = bills?.filter(bill => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      bill.vendor_name?.toLowerCase().includes(query) ||
      bill.invoice_number?.toLowerCase().includes(query) ||
      bill.reference?.toLowerCase().includes(query) ||
      bill.description?.toLowerCase().includes(query)
    );
  });

  const handleStatusChange = (status: string) => {
    const validStatuses = ['all', 'draft', 'awaiting_approval', 'awaiting_payment', 'paid', 'repeating'];
    if (validStatuses.includes(status)) {
      setFilters(prev => ({
        ...prev,
        status: status as 'all' | 'draft' | 'awaiting_approval' | 'awaiting_payment' | 'paid' | 'repeating'
      }));
    }
  };

  const handleSyncBills = () => {
    // Use the active connection ID we found
    if (activeConnectionId) {
      syncBills(activeConnectionId);
    } else {
      // Show error toast if no connection found
      import('sonner').then(({ toast }) => {
        toast.error('No active ERP connection found. Please connect to Xero first.');
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Receipt className="h-8 w-8" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Bills</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Manage your accounts payable invoices
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Organization Selector */}
                <Select
                  value={selectedOrganizationId || undefined}
                  onValueChange={setSelectedOrganizationId}
                  disabled={orgsLoading || !organizations?.length}
                >
                  <SelectTrigger className="w-[280px] bg-white/95 backdrop-blur-sm border-white/20 text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#638C80]" />
                      <SelectValue placeholder="Select organization..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org: any) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <span>{org.name}</span>
                          {org.external_id?.startsWith('xero_') && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Xero
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  onClick={handleSyncBills}
                  disabled={isSyncing || !activeConnectionId}
                  className="bg-white/95 backdrop-blur-sm text-[#638C80] hover:bg-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  title={
                    !selectedOrganizationId
                      ? 'Select an organization first'
                      : !activeConnectionId
                        ? 'No ERP connection for this organization'
                        : isSyncing
                          ? 'Syncing bills...'
                          : 'Sync bills from Xero'
                  }
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Bills'}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards with brand-themed gradients */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-5">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-400 to-gray-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Draft</div>
                  <div className="text-4xl font-bold text-white">{stats.total_draft}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Awaiting Approval</div>
                  <div className="text-4xl font-bold text-white">{stats.total_awaiting_approval}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <AlertCircle className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Awaiting Payment</div>
                  <div className="text-4xl font-bold text-white">{stats.total_authorised || (stats.total_awaiting_payment + stats.overdue_count)}</div>
                  {(stats.total_awaiting_payment_ugx || stats.overdue_ugx) && (
                    <div className="text-sm text-white/90 mt-1 font-medium">
                      UGX {(parseFloat(stats.total_awaiting_payment_ugx || '0') + parseFloat(stats.overdue_ugx || '0')).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-500 p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Paid</div>
                  <div className="text-4xl font-bold text-white">{stats.total_paid}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#638C80] to-[#547568] p-6 shadow-lg hover:shadow-xl transition-all">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Calendar className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Repeating</div>
                  <div className="text-4xl font-bold text-white">{stats.total_repeating}</div>
                </div>
              </div>
            </div>
          )}

          {/* Main Tabs: Bills vs Processing Queue */}
          <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as 'bills' | 'processing')}>
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2 mb-6">
              <TabsList className="bg-gray-50 p-1.5 rounded-xl w-full grid grid-cols-2 gap-1">
                <TabsTrigger
                  value="bills"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-6 py-3 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Receipt className="h-4 w-4" />
                  Bills
                </TabsTrigger>
                <TabsTrigger
                  value="processing"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-400 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-6 py-3 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  Processing Queue
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Bills Tab Content */}
            <TabsContent value="bills" className="mt-0 space-y-6">
              {/* Filters with modern design */}
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#638C80]" />
                    <Input
                      placeholder="Search bills by vendor, number, or reference..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-12 h-12 border-2 border-gray-200 focus:border-[#638C80] rounded-xl text-base"
                    />
                  </div>
                </div>
              </div>

              {/* Bills Status Tabs */}
              <Tabs value={filters.status || 'all'} onValueChange={handleStatusChange}>
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
                  <TabsList className="bg-gray-50 p-1.5 rounded-xl w-full grid grid-cols-6 gap-1">
                    <TabsTrigger
                      value="all"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      All
                    </TabsTrigger>
                    <TabsTrigger
                      value="draft"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-400 data-[state=active]:to-gray-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      Draft
                    </TabsTrigger>
                    <TabsTrigger
                      value="awaiting_approval"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-yellow-400 data-[state=active]:to-yellow-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      Approval
                    </TabsTrigger>
                    <TabsTrigger
                      value="awaiting_payment"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:to-blue-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      Payment
                    </TabsTrigger>
                    <TabsTrigger
                      value="paid"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-400 data-[state=active]:to-green-500 data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      Paid
                    </TabsTrigger>
                    <TabsTrigger
                      value="repeating"
                      className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#547568] data-[state=active]:text-white data-[state=active]:shadow-md rounded-lg px-4 py-2.5 transition-all font-medium"
                    >
                      Repeating
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value={filters.status || 'all'} className="mt-6">
              {isLoading ? (
                <BillsLoadingSkeleton />
              ) : error ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="p-4 bg-red-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <AlertCircle className="h-10 w-10 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Bills</h3>
                  <p className="text-gray-600">{error.message}</p>
                </div>
              ) : !filteredBills || filteredBills.length === 0 ? (
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
                  <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                    <FileText className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No Bills Found</h3>
                  <p className="text-gray-600">
                    {searchQuery
                      ? 'Try adjusting your search criteria'
                      : 'There are no bills to display'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Info banner for non-payable tabs */}
                  {filters.status !== 'awaiting_payment' && filters.status !== 'all' && (
                    <div className="mb-4 bg-gradient-to-r from-blue-50 to-blue-100/50 border border-blue-200 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-blue-500/10 rounded-lg">
                          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-blue-900">
                            Bills in this tab cannot be paid
                          </p>
                          <p className="text-xs text-blue-700 mt-1">
                            Only bills with "AUTHORISED" status (Awaiting Payment) can be selected for payment.
                            Switch to the "Payment" tab to pay bills.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {/* Pay Button - Fixed at bottom when bills are selected */}
                  {selectedBills.size > 0 && (
                    <div className="fixed bottom-8 right-8 z-40">
                      <button
                        onClick={() => setIsPayModalOpen(true)}
                        className="group flex items-center gap-3 bg-gradient-to-r from-[#638C80] to-[#547568] text-white px-8 py-4 rounded-2xl shadow-2xl hover:shadow-3xl hover:scale-105 transition-all duration-300 font-semibold text-lg"
                      >
                        <div className="p-2 bg-white/20 rounded-lg">
                          <CreditCard className="h-6 w-6" />
                        </div>
                        <span>Pay {selectedBills.size} Bill{selectedBills.size > 1 ? 's' : ''}</span>
                      </button>
                    </div>
                  )}
                </>
              )}
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Processing Queue Tab Content */}
            <TabsContent value="processing" className="mt-0">
              <ProcessingQueue organizationId={selectedOrganizationId} />
            </TabsContent>
          </Tabs>

          {/* Payment Modal */}
          <PayBillsModal
            isOpen={isPayModalOpen}
            onClose={() => {
              setIsPayModalOpen(false);
              setSelectedBills(new Set()); // Clear selection after payment
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

// Bills Table Component
interface BillsTableProps {
  bills: Bill[];
  selectedBills: Set<number>;
  onSelectBill: (billId: number) => void;
  onSelectAll: (bills: Bill[]) => void;
}

function BillsTable({ bills, selectedBills, onSelectBill, onSelectAll }: BillsTableProps) {
  // Only bills with AUTHORISED status (awaiting payment) can be selected
  const payableBills = bills.filter(bill => bill.status === 'AUTHORISED');
  const allPayableSelected = payableBills.length > 0 && payableBills.every(bill => selectedBills.has(bill.id));
  const somePayableSelected = payableBills.some(bill => selectedBills.has(bill.id)) && !allPayableSelected;

  const handleSelectAll = () => {
    if (allPayableSelected) {
      // Deselect all payable bills
      onSelectAll([]);
    } else {
      // Select all payable bills only
      onSelectAll(payableBills);
    }
  };

  const isPayable = (bill: Bill) => bill.status === 'AUTHORISED';

  // Generate initials for vendor
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Get gradient color based on vendor name
  const getGradientColor = (name: string) => {
    const colors = [
      'from-[#638C80] to-[#547568]',
      'from-[#7BA895] to-[#638C80]',
      'from-[#456050] to-[#3A5043]',
      'from-[#8BA89E] to-[#6D9686]',
      'from-[#5A7C72] to-[#4A6B61]',
      'from-[#729284] to-[#5E7D71]',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4">
                <input
                  type="checkbox"
                  checked={allPayableSelected}
                  ref={input => {
                    if (input) input.indeterminate = somePayableSelected;
                  }}
                  onChange={handleSelectAll}
                  disabled={payableBills.length === 0}
                  className="w-5 h-5 text-[#638C80] border-gray-300 rounded-lg focus:ring-[#638C80] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Select all payable bills"
                />
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Vendor
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Invoice #
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Due Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Amount
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Organization
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bills.map((bill) => {
              const canPay = isPayable(bill);

              return (
                <tr
                  key={bill.id}
                  className={`group hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-200 ${canPay ? 'cursor-pointer' : 'opacity-60'}`}
                >
                  <td className="px-6 py-5">
                    {canPay ? (
                      <input
                        type="checkbox"
                        checked={selectedBills.has(bill.id)}
                        onChange={() => onSelectBill(bill.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-[#638C80] border-gray-300 rounded-lg focus:ring-[#638C80] transition-all"
                        aria-label={`Select bill from ${bill.vendor_name}`}
                      />
                    ) : (
                      <div className="w-5 h-5 border-2 border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed" title="Only awaiting payment bills can be selected" />
                    )}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${getGradientColor(bill.vendor_name)} flex items-center justify-center text-white font-bold text-sm shadow-md group-hover:shadow-lg transition-shadow`}>
                        {getInitials(bill.vendor_name)}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-base group-hover:text-[#638C80] transition-colors">
                          {bill.vendor_name}
                        </div>
                        {bill.reference && (
                          <div className="text-sm text-gray-500 mt-0.5">{bill.reference}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm font-medium text-gray-900">
                      {bill.invoice_number || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                    {bill.date ? new Date(bill.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap text-sm text-gray-600">
                    {bill.due_date ? new Date(bill.due_date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    }) : 'N/A'}
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <div className="text-base font-bold text-gray-900">
                      {bill.currency} {parseFloat(
                        bill.status === 'PAID' ? bill.total : bill.amount_due
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
                      bill.status === 'PAID'
                        ? 'bg-gradient-to-r from-green-400 to-green-500 text-white' :
                      bill.status === 'DRAFT'
                        ? 'bg-gradient-to-r from-gray-400 to-gray-500 text-white' :
                      bill.status === 'SUBMITTED'
                        ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-white' :
                      bill.status === 'AUTHORISED'
                        ? 'bg-gradient-to-r from-blue-400 to-blue-500 text-white' :
                      bill.status === 'REPEATING'
                        ? 'bg-gradient-to-r from-[#638C80] to-[#547568] text-white' :
                      'bg-gray-200 text-gray-700'
                    }`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="px-6 py-5 whitespace-nowrap">
                    <span className="text-sm text-gray-600 font-medium">
                      {bill.organization_name}
                    </span>
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

// Loading Skeleton
function BillsLoadingSkeleton() {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
      <div className="space-y-6">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="h-12 w-12 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-xl" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-gray-200 animate-pulse rounded-lg w-1/3" />
              <div className="h-4 bg-gray-100 animate-pulse rounded-lg w-1/4" />
            </div>
            <div className="h-6 bg-gray-200 animate-pulse rounded-full w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
