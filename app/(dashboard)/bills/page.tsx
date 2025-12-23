/**
 * Bills Page - Accounts Payable Invoices
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
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
  Clock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Calendar,
  DollarSign,
  ArrowUpRight,
  Sparkles,
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

// Generate consistent color based on name - Using Centry colors
function getVendorColor(name: string): string {
  const colors = [
    'from-[#638C80] to-[#4a6b62]',    // Teal (primary)
    'from-[#4E97D1] to-[#3d7ab0]',    // Blue
    'from-[#49a034] to-[#3a8029]',    // Green
    'from-[#f77f00] to-[#d66d00]',    // Orange
    'from-[#638C80] to-[#49a034]',    // Teal to Green
    'from-[#4E97D1] to-[#638C80]',    // Blue to Teal
    'from-[#49a034] to-[#4E97D1]',    // Green to Blue
    'from-[#f77f00] to-[#fed652]',    // Orange to Mustard
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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

  // Calculate stats from bills
  const stats = useMemo(() => {
    if (!bills || bills.length === 0) {
      return {
        totalPayable: 0,
        awaitingPayment: 0,
        overdue: 0,
        dueThisWeek: 0,
        paid: 0,
        currency: 'UGX',
      };
    }

    const currency = cleanCurrencyCode(bills[0]?.currency || 'UGX');

    let totalPayable = 0;
    let awaitingPayment = 0;
    let overdue = 0;
    let dueThisWeek = 0;
    let paid = 0;

    bills.forEach((bill: Bill) => {
      const amount = parseFloat(bill.amount_due || '0');
      const total = parseFloat(bill.total || '0');

      if (bill.status === 'AUTHORISED') {
        awaitingPayment += amount;
        totalPayable += amount;

        if (isOverdue(bill.due_date || '')) {
          overdue += amount;
        } else if (isDueSoon(bill.due_date || '')) {
          dueThisWeek += amount;
        }
      }

      if (bill.status === 'PAID') {
        paid += total;
      }
    });

    return {
      totalPayable,
      awaitingPayment,
      overdue,
      dueThisWeek,
      paid,
      currency,
    };
  }, [bills]);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                <Receipt className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bills & Payables</h1>
                <p className="text-sm text-gray-500">
                  Manage and pay your accounts payable invoices
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[220px] bg-white border-gray-200 shadow-sm">
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
                className="bg-white shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Payable - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#638C80] via-[#5a8073] to-[#4a6b62] rounded-2xl p-6 text-white shadow-xl shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">Total Payable</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#49a034] text-xs font-medium bg-[#49a034]/20 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {stats.currency} {formatCompactNumber(stats.totalPayable)}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {bills.filter((b: Bill) => b.status === 'AUTHORISED').length} bills awaiting payment
                </p>
              </div>
            </div>

            {/* Overdue */}
            <StatCard
              icon={AlertTriangle}
              label="Overdue"
              value={`${stats.currency} ${formatCompactNumber(stats.overdue)}`}
              color="orange"
              subtitle="Needs attention"
            />

            {/* Due This Week */}
            <StatCard
              icon={Calendar}
              label="Due This Week"
              value={`${stats.currency} ${formatCompactNumber(stats.dueThisWeek)}`}
              color="mustard"
              subtitle="Coming up soon"
            />
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStatCard
              label="Total Bills"
              value={bills.length.toString()}
              icon={FileText}
              color="teal"
            />
            <MiniStatCard
              label="Awaiting Payment"
              value={bills.filter((b: Bill) => b.status === 'AUTHORISED').length.toString()}
              icon={Clock}
              color="blue"
            />
            <MiniStatCard
              label="Paid This Month"
              value={bills.filter((b: Bill) => b.status === 'PAID').length.toString()}
              icon={CheckCircle2}
              color="green"
            />
            <MiniStatCard
              label="Selected"
              value={selectedBills.size.toString()}
              icon={Sparkles}
              color="mustard"
            />
          </div>

          {/* Main Tabs */}
          <Tabs value={activeMainTab} onValueChange={(val) => setActiveMainTab(val as 'bills' | 'processing')}>
            <TabsList className="bg-white/80 backdrop-blur-sm p-1.5 rounded-xl border border-gray-200/50 shadow-sm">
              <TabsTrigger
                value="bills"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#638C80] data-[state=active]:to-[#4a6b62] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              >
                <Receipt className="h-4 w-4 mr-2" />
                Bills
              </TabsTrigger>
              <TabsTrigger
                value="processing"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#4E97D1] data-[state=active]:to-[#3d7ab0] data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg px-5 py-2.5 text-sm font-medium transition-all"
              >
                <Send className="h-4 w-4 mr-2" />
                Processing
              </TabsTrigger>
            </TabsList>

            <TabsContent value="bills" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search vendors, invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-10 bg-white border-gray-200"
                    />
                  </div>

                  <Select value={filters.status || 'all'} onValueChange={handleStatusChange}>
                    <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200">
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
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-8 w-8 text-red-400" />
                  </div>
                  <p className="text-gray-600 font-medium">Error loading bills</p>
                  <p className="text-gray-400 text-sm mt-1">Please try refreshing the page</p>
                </div>
              ) : !filteredBills || filteredBills.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-8 w-8 text-gray-300" />
                  </div>
                  <p className="text-gray-600 font-medium">
                    {searchQuery ? 'No bills match your search' : 'No bills found'}
                  </p>
                  <p className="text-gray-400 text-sm mt-1">
                    {searchQuery ? 'Try a different search term' : 'Sync with your accounting software to get started'}
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
                        className="bg-gradient-to-r from-[#638C80] to-[#4a6b62] hover:from-[#5a8073] hover:to-[#436259] text-white shadow-xl shadow-[#638C80]/30 px-6 py-3 h-auto rounded-xl font-semibold"
                        size="lg"
                      >
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pay {selectedBills.size} Bill{selectedBills.size > 1 ? 's' : ''}
                        <ArrowUpRight className="h-4 w-4 ml-2" />
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

// Stat Card Component - Using Centry colors
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5',
      icon: 'bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-[#638C80]/30',
      text: 'text-[#638C80]',
      border: 'border-[#638C80]/20',
    },
    blue: {
      bg: 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/5',
      icon: 'bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-[#4E97D1]/30',
      text: 'text-[#4E97D1]',
      border: 'border-[#4E97D1]/20',
    },
    green: {
      bg: 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/5',
      icon: 'bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-[#49a034]/30',
      text: 'text-[#49a034]',
      border: 'border-[#49a034]/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/5',
      icon: 'bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-[#f77f00]/30',
      text: 'text-[#f77f00]',
      border: 'border-[#f77f00]/20',
    },
    mustard: {
      bg: 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/5',
      icon: 'bg-gradient-to-br from-[#fed652] to-[#e6c149] shadow-[#fed652]/30',
      text: 'text-[#d4a843]',
      border: 'border-[#fed652]/20',
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} rounded-2xl p-5 border ${style.border} shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${style.icon} shadow-lg flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${style.text}`}>{value}</div>
      {subtitle && (
        <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Mini Stat Card Component - Using Centry colors
interface MiniStatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
}

function MiniStatCard({ label, value, icon: Icon, color }: MiniStatCardProps) {
  const colorStyles = {
    teal: 'text-[#638C80] bg-[#638C80]/10',
    blue: 'text-[#4E97D1] bg-[#4E97D1]/10',
    green: 'text-[#49a034] bg-[#49a034]/10',
    orange: 'text-[#f77f00] bg-[#f77f00]/10',
    mustard: 'text-[#d4a843] bg-[#fed652]/20',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${colorStyles[color]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
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
        return 'bg-gradient-to-r from-[#49a034] to-[#3a8029] text-white';
      case 'DRAFT':
        return 'bg-[#bec3c6]/30 text-gray-600';
      case 'SUBMITTED':
        return 'bg-gradient-to-r from-[#fed652] to-[#e6c149] text-gray-800';
      case 'AUTHORISED':
        return 'bg-gradient-to-r from-[#4E97D1] to-[#3d7ab0] text-white';
      case 'REPEATING':
        return 'bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white';
      default:
        return 'bg-[#bec3c6]/30 text-gray-600';
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
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#f77f00]/10 text-[#f77f00] px-2 py-0.5 rounded-full ml-2">
          <AlertTriangle className="h-3 w-3" />
          Overdue
        </span>
      );
    }
    if (isDueSoon(bill.due_date)) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#fed652]/20 text-[#d4a843] px-2 py-0.5 rounded-full ml-2">
          <Clock className="h-3 w-3" />
          Due soon
        </span>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="py-4 px-4 w-12">
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
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Vendor</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Due Date</th>
              <th className="text-right py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Amount</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="w-12 py-4 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {bills.map((bill) => {
              const canPay = isPayable(bill);
              const isSelected = selectedBills.has(bill.id);

              return (
                <tr
                  key={bill.id}
                  className={`
                    transition-all duration-200 cursor-pointer
                    ${isSelected ? 'bg-[#638C80]/5' : 'hover:bg-gray-50/80'}
                    ${!canPay ? 'opacity-60' : ''}
                  `}
                  onClick={() => canPay && onSelectBill(bill.id)}
                >
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
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
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getVendorColor(bill.vendor_name || '')} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                        {getVendorInitials(bill.vendor_name || '')}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900 text-sm">{bill.vendor_name}</div>
                        {bill.reference && (
                          <div className="text-xs text-gray-400">{bill.reference}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm text-gray-700 font-medium">{bill.invoice_number || '-'}</span>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center">
                      <span className="text-sm text-gray-600">{formatDate(bill.due_date || '')}</span>
                      {getDueBadge(bill)}
                    </div>
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className="text-sm font-bold text-gray-900">
                      {cleanCurrencyCode(bill.currency)} {parseFloat(
                        bill.status === 'PAID' ? bill.total : bill.amount_due
                      ).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      })}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(bill.status)}`}>
                      {bill.status}
                    </span>
                  </td>
                  <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
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
    </div>
  );
}

function BillsLoadingSkeleton() {
  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="h-4 w-4 bg-gray-200 rounded" />
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
