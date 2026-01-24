/**
 * Wallet Page
 *
 * Manage department wallet transfers and linked accounts
 */

'use client';

import { useState } from 'react';
import {
  useDepartmentWallets,
  useDepartmentWalletTransactions,
  useLinkedAccounts,
  usePendingApprovals,
} from '@/hooks/use-wallet';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Wallet as WalletIcon,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Ban,
  Search,
  Smartphone,
  Building2,
  ExternalLink,
  AlertCircle,
  Link2,
  ChevronDown,
  Plus,
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
import TransferModal from '@/components/wallet/TransferModal';
import CreateWalletModal from '@/components/wallet/CreateWalletModal';
import type { DepartmentWallet, DepartmentWalletTransaction, LinkedAccount } from '@/types/wallet';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { ContentCard, ContentCardHeader } from '@/components/layout/content-card';

export default function WalletPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedWalletId, setSelectedWalletId] = useState<string | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isCreateWalletModalOpen, setIsCreateWalletModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Fetch organizations
  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = organizationsResponse?.results || organizationsResponse || [];
  const currentOrganization = organizations.find((org: { id: string }) => org.id === selectedOrganizationId) || organizations[0];

  // Fetch department wallets
  const {
    data: wallets,
    isLoading: walletsLoading,
    refetch: refetchWallets,
  } = useDepartmentWallets(currentOrganization?.id);

  // Select first wallet by default
  const selectedWallet = wallets?.find((w) => w.id === selectedWalletId) || wallets?.[0];

  // Fetch transactions for selected wallet
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = useDepartmentWalletTransactions(selectedWallet?.id);

  // Fetch linked accounts
  const { data: linkedAccountsData, refetch: refetchLinkedAccounts } = useLinkedAccounts(selectedWallet?.id);

  // Fetch pending approvals
  const { data: pendingApprovals } = usePendingApprovals(selectedWallet?.id);

  const handleRefresh = () => {
    refetchWallets();
    refetchTransactions();
    refetchLinkedAccounts();
  };

  // Calculate stats
  const totalTransfers = calculateTotalTransfers(transactions || []);
  const totalFees = calculateTotalFees(transactions || []);
  const pendingAmount = calculatePending(transactions || []);

  // Filter transactions
  const filteredTransactions = transactions?.filter((tx) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        tx.transaction_type?.toLowerCase().includes(query) ||
        tx.reference?.toLowerCase().includes(query) ||
        tx.description?.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }
    if (statusFilter !== 'all' && tx.status !== statusFilter) {
      return false;
    }
    if (typeFilter !== 'all' && tx.transaction_type !== typeFilter) {
      return false;
    }
    return true;
  }) || [];

  if (orgsLoading || walletsLoading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#49a034]" />
      </div>
    );
  }

  if (!organizations || organizations.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PageHeader title="Wallet" subtitle="Manage your department wallet" />
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <Building2 className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Organizations Found</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              You need to be a member of an organization to access department wallets.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!wallets || wallets.length === 0) {
    return (
      <div className="min-h-screen bg-[#f8f9fa]">
        <PageHeader title="Wallet" subtitle="Manage your department wallet">
          {/* Organization Selector - always show when multiple orgs */}
          {organizations.length > 1 && (
            <Select
              value={selectedOrganizationId || currentOrganization?.id}
              onValueChange={(value) => {
                setSelectedOrganizationId(value);
                setSelectedWalletId(null);
              }}
            >
              <SelectTrigger className="w-[180px] h-9 bg-white">
                <Building2 className="h-4 w-4 mr-2 text-gray-500" />
                <SelectValue placeholder="Organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations.map((org: { id: string; name: string }) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </PageHeader>
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
              <WalletIcon className="w-10 h-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Wallets Found</h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {currentOrganization?.name ? (
                <>No department wallets found for <strong>{currentOrganization.name}</strong>. Create one to get started.</>
              ) : (
                <>You don&apos;t have access to any department wallets yet.</>
              )}
            </p>
            {currentOrganization && (
              <Button onClick={() => setIsCreateWalletModalOpen(true)} className="btn-press">
                <WalletIcon className="w-4 h-4 mr-2" />
                Create Wallet
              </Button>
            )}
          </div>
        </div>

        {currentOrganization && (
          <CreateWalletModal
            isOpen={isCreateWalletModalOpen}
            onClose={() => setIsCreateWalletModalOpen(false)}
            organizationId={currentOrganization.id}
            organizationName={currentOrganization.name}
            organizationCurrency={currentOrganization.primary_currency || currentOrganization.currency || 'UGX'}
            onSuccess={() => {
              refetchWallets();
              setIsCreateWalletModalOpen(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      <PageHeader
        title="Wallet"
        subtitle={`Manage transfers for ${selectedWallet?.name || 'your department'}`}
      >
        {/* Organization Selector - always show */}
        <Select
          value={selectedOrganizationId || currentOrganization?.id}
          onValueChange={(value) => {
            setSelectedOrganizationId(value);
            setSelectedWalletId(null); // Reset wallet when org changes
          }}
        >
          <SelectTrigger className="w-[200px] h-9 bg-white">
            <Building2 className="h-4 w-4 mr-2 text-gray-500" />
            <SelectValue placeholder="Organization" />
          </SelectTrigger>
          <SelectContent>
            {organizations.map((org: { id: string; name: string }) => (
              <SelectItem key={org.id} value={org.id}>
                {org.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* Wallet Selector */}
        {wallets && wallets.length > 1 && (
          <Select
            value={selectedWalletId || selectedWallet?.id}
            onValueChange={setSelectedWalletId}
          >
            <SelectTrigger className="w-[180px] h-9 bg-white">
              <WalletIcon className="h-4 w-4 mr-2 text-gray-500" />
              <SelectValue placeholder="Select wallet" />
            </SelectTrigger>
            <SelectContent>
              {wallets.map((wallet) => (
                <SelectItem key={wallet.id} value={wallet.id}>
                  {wallet.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button onClick={handleRefresh} variant="outline" size="sm" className="h-9 btn-press">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        <Button
          onClick={() => setIsCreateWalletModalOpen(true)}
          variant="outline"
          size="sm"
          className="h-9 btn-press"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Wallet
        </Button>
        <Button
          onClick={() => setIsTransferModalOpen(true)}
          size="sm"
          className="h-9 btn-press"
          disabled={!selectedWallet?.has_linked_account}
        >
          <ArrowRight className="h-4 w-4 mr-2" />
          Make Transfer
        </Button>
      </PageHeader>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Balance & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <StatCard
            label="Wallet Balance"
            value={`${selectedWallet?.currency} ${parseFloat(selectedWallet?.balance || '0').toLocaleString()}`}
            subtext={selectedWallet?.status === 'active' ? 'Wallet is active' : 'Wallet is inactive'}
            icon={WalletIcon}
            iconColor="#49a034"
            iconBgColor="rgba(73, 160, 52, 0.1)"
            variant="accent"
          />
          <StatCard
            label="Total Transfers"
            value={`${selectedWallet?.currency} ${totalTransfers}`}
            subtext="All completed transfers"
            icon={ArrowUpRight}
            iconColor="#10b981"
            iconBgColor="rgba(16, 185, 129, 0.1)"
          />
          <StatCard
            label="Total Fees"
            value={`${selectedWallet?.currency} ${totalFees}`}
            subtext={`${selectedWallet?.fee_percentage}% per transfer`}
            icon={ArrowDownRight}
            iconColor="#3b82f6"
            iconBgColor="rgba(59, 130, 246, 0.1)"
          />
          <StatCard
            label="Pending"
            value={`${pendingApprovals?.length || 0} transfers`}
            subtext={pendingAmount !== '0.00' ? `${selectedWallet?.currency} ${pendingAmount}` : 'No pending transfers'}
            icon={Clock}
            variant={pendingApprovals && pendingApprovals.length > 0 ? 'warning' : 'default'}
          />
        </div>

        {/* Linked Accounts Section */}
        <ContentCard className="mb-6 animate-fade-in-up">
          <ContentCardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#49a034]/10">
                <Link2 className="h-4 w-4 text-[#49a034]" />
              </div>
              <h2 className="text-sm font-semibold text-gray-900">Linked Accounts</h2>
            </div>
          </ContentCardHeader>

          {!selectedWallet?.has_linked_account ? (
            <div className="p-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-3">
                <AlertCircle className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-medium text-gray-900 mb-1">No Linked Accounts</h3>
              <p className="text-sm text-gray-500 mb-4">
                Link a mobile money or bank account to enable transfers.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center">
                <a
                  href={linkedAccountsData?.admin_links?.add_mobile_money_account || '/admin/payments/mobilemoneyaccount/add/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-[#49a034] text-white text-sm rounded-lg hover:bg-[#3d8a2b] transition-colors"
                >
                  <Smartphone className="w-4 h-4" />
                  Add Mobile Money
                  <ExternalLink className="w-3 h-3" />
                </a>
                <a
                  href={linkedAccountsData?.admin_links?.add_bank_account || '/admin/banking_integrations/bankaccount/add/'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 text-sm rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  Add Bank Account
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ) : (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {linkedAccountsData?.current_linked_accounts?.map((account: LinkedAccount) => (
                <div
                  key={account.id}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {account.type === 'mobile_money' ? (
                      <Smartphone className="w-5 h-5 text-[#49a034]" />
                    ) : (
                      <Building2 className="w-5 h-5 text-[#49a034]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900">{account.name}</h4>
                    <p className="text-xs text-gray-500 capitalize">
                      {account.provider || account.bank_name} • {account.type.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {account.type === 'mobile_money' ? account.phone_number : account.account_number}
                    </p>
                    <p className="text-xs font-medium text-[#49a034] mt-1">
                      Balance: {account.currency} {parseFloat(account.balance).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ContentCard>

        {/* Recent Transactions */}
        <ContentCard className="mb-6 animate-fade-in-up" noPadding>
          <ContentCardHeader className="px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-[#49a034]/10">
                  <WalletIcon className="h-4 w-4 text-[#49a034]" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Recent Transactions</h2>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredTransactions?.length || 0} total
                </span>
              </div>
            </div>
          </ContentCardHeader>

          {/* Filters */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-white border-gray-200 text-sm text-gray-900"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px] h-9 bg-white border-gray-200 text-sm text-gray-900">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="account_transfer">Transfer</SelectItem>
                  <SelectItem value="expense_payment">Expense Payment</SelectItem>
                  <SelectItem value="bill_payment">Bill Payment</SelectItem>
                  <SelectItem value="refund">Refund</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-9 bg-white border-gray-200 text-sm text-gray-900">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {transactionsLoading ? (
            <TransactionsLoadingSkeleton />
          ) : !filteredTransactions || filteredTransactions.length === 0 ? (
            <div className="p-12 text-center">
              <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <WalletIcon className="h-10 w-10 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'No matching transactions'
                  : 'No Transactions Yet'}
              </h3>
              <p className="text-gray-600 mb-6">
                {searchQuery || statusFilter !== 'all' || typeFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'Make your first transfer to get started'}
              </p>
              {!searchQuery && statusFilter === 'all' && typeFilter === 'all' && selectedWallet?.has_linked_account && (
                <Button type="button" onClick={() => setIsTransferModalOpen(true)} size="sm">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Make Transfer
                </Button>
              )}
            </div>
          ) : (
            <TransactionsTable transactions={filteredTransactions} currency={selectedWallet?.currency || 'UGX'} />
          )}
        </ContentCard>
      </div>

      {selectedWallet && (
        <TransferModal
          isOpen={isTransferModalOpen}
          onClose={() => setIsTransferModalOpen(false)}
          wallet={selectedWallet}
        />
      )}

      {currentOrganization && (
        <CreateWalletModal
          isOpen={isCreateWalletModalOpen}
          onClose={() => setIsCreateWalletModalOpen(false)}
          organizationId={currentOrganization.id}
          organizationName={currentOrganization.name}
          organizationCurrency={currentOrganization.primary_currency || currentOrganization.currency || 'UGX'}
          onSuccess={() => {
            refetchWallets();
            setIsCreateWalletModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Helper functions
function calculateTotalTransfers(transactions: DepartmentWalletTransaction[]): string {
  const total = transactions
    .filter((t) => t.transaction_type === 'account_transfer' && t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calculateTotalFees(transactions: DepartmentWalletTransaction[]): string {
  const total = transactions
    .filter((t) => t.status === 'completed')
    .reduce((sum, t) => sum + parseFloat(t.fee_amount || '0'), 0);
  return total.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function calculatePending(transactions: DepartmentWalletTransaction[]): string {
  const total = transactions
    .filter((t) => t.status === 'pending' || t.status === 'processing')
    .reduce((sum, t) => sum + parseFloat(t.amount), 0);
  return total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Transactions Table Component
interface TransactionsTableProps {
  transactions: DepartmentWalletTransaction[];
  currency: string;
}

function TransactionsTable({ transactions, currency }: TransactionsTableProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'account_transfer':
        return ArrowUpRight;
      case 'expense_payment':
      case 'bill_payment':
        return ArrowDownRight;
      case 'refund':
        return RefreshCw;
      default:
        return WalletIcon;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'account_transfer':
        return { bg: '#3b82f6', light: 'rgba(59, 130, 246, 0.1)' };
      case 'expense_payment':
      case 'bill_payment':
        return { bg: '#ef4444', light: 'rgba(239, 68, 68, 0.1)' };
      case 'refund':
        return { bg: '#10b981', light: 'rgba(16, 185, 129, 0.1)' };
      default:
        return { bg: '#6b7280', light: 'rgba(107, 114, 128, 0.1)' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Completed
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3 h-3 animate-spin" />
            Processing
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <XCircle className="w-3 h-3" />
            Failed
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200">
            <Ban className="w-3 h-3" />
            Rejected
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-50 text-gray-700 border border-gray-200">
            <Ban className="w-3 h-3" />
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatType = (type: string) => {
    return type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full table-professional">
        <thead>
          <tr>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Type</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Description</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Date</th>
            <th className="text-right text-xs font-medium text-gray-600 py-3 px-4">Amount</th>
            <th className="text-right text-xs font-medium text-gray-600 py-3 px-4">Fee</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Status</th>
            <th className="text-left text-xs font-medium text-gray-600 py-3 px-4">Reference</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {transactions.map((tx) => {
            const TypeIcon = getTypeIcon(tx.transaction_type);
            const typeColor = getTypeColor(tx.transaction_type);

            return (
              <tr key={tx.id} className="transition-colors hover:bg-gray-50">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center"
                      style={{ backgroundColor: typeColor.light }}
                    >
                      <TypeIcon className="h-4 w-4" style={{ color: typeColor.bg }} />
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatType(tx.transaction_type)}
                      </div>
                      {tx.source_type && (
                        <div className="text-xs text-gray-500 capitalize">
                          via {tx.source_type.replace('_', ' ')}
                        </div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className="text-sm text-gray-600 line-clamp-1">
                    {tx.description || '—'}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{formatDate(tx.created_at)}</span>
                    <span className="text-xs text-gray-400">{formatTime(tx.created_at)}</span>
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {currency} {parseFloat(tx.amount).toLocaleString()}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span className="text-sm text-gray-500">
                    {parseFloat(tx.fee_amount || '0') > 0
                      ? `${currency} ${parseFloat(tx.fee_amount).toLocaleString()}`
                      : '—'}
                  </span>
                </td>
                <td className="py-3 px-4">{getStatusBadge(tx.status)}</td>
                <td className="py-3 px-4">
                  <code className="text-xs font-mono bg-gray-50 text-gray-600 px-2.5 py-1 rounded border border-gray-200">
                    {tx.reference}
                  </code>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// Loading Skeleton
function TransactionsLoadingSkeleton() {
  return (
    <div className="p-8 space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-10 w-10 bg-gray-100 animate-pulse rounded-lg" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-100 animate-pulse rounded w-1/3" />
            <div className="h-3 bg-gray-50 animate-pulse rounded w-1/4" />
          </div>
          <div className="h-5 bg-gray-100 animate-pulse rounded-full w-20" />
        </div>
      ))}
    </div>
  );
}
