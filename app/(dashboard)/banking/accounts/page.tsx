"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BankAccountsList } from "@/components/banking/bank-accounts-list";
import { BankAccountForm } from "@/components/banking/bank-account-form";
import { useOrganizations } from "@/hooks/use-organization";
import { useSyncAccounts, useERPConnections } from "@/hooks/use-erp";
import {
  Building2,
  Plus,
  RefreshCw,
  Landmark,
  TrendingUp,
  CreditCard,
  CheckCircle2,
  DollarSign,
} from "lucide-react";

interface BankAccount {
  id: number;
  account_name: string;
  account_number: string;
  balance: number;
  currency: string;
  is_active: boolean;
  is_default: boolean;
}

// Helper to clean currency code
const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) {
    return currency.split('.').pop() || currency;
  }
  return currency;
};

// Format compact numbers
function formatCompactNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return num.toLocaleString();
}

export default function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncAccounts, isPending: isSyncing } = useSyncAccounts();

  // Fetch bank accounts
  const { data: accountsData } = useQuery<{ results: BankAccount[] }>({
    queryKey: ["bank-accounts", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOrganizationId) params.append("organization", selectedOrganizationId);
      return api.get(`/api/v1/banking/accounts/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

  const accounts = accountsData?.results || [];

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

    const orgConnection = erpConnections?.find(
      (conn: any) => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    setActiveConnectionId(orgConnection?.id || null);
  }, [selectedOrganizationId, erpConnections]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const activeAccounts = accounts.filter(acc => acc.is_active).length;
    const defaultAccount = accounts.find(acc => acc.is_default);
    const primaryCurrency = accounts[0]?.currency ? cleanCurrencyCode(accounts[0].currency) : 'UGX';

    return {
      totalBalance,
      activeAccounts,
      totalAccounts: accounts.length,
      defaultAccount,
      primaryCurrency,
    };
  }, [accounts]);

  const handleAddAccount = () => {
    setSelectedAccount(null);
    setIsFormOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setSelectedAccount(account);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setSelectedAccount(null);
  };

  const handleSyncAccounts = () => {
    if (activeConnectionId) {
      syncAccounts(activeConnectionId);
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
                <Landmark className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Bank Accounts</h1>
                <p className="text-sm text-gray-500">
                  Manage your organization's bank accounts
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Organization Selector */}
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

              {/* Sync Button */}
              {activeConnectionId && (
                <Button
                  variant="outline"
                  onClick={handleSyncAccounts}
                  disabled={isSyncing}
                  className="bg-[#638C80] border-[#638C80] text-white hover:bg-[#547568] hover:border-[#547568]"
                >
                  <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
              )}

              {/* Add Account Button */}
              <Button onClick={handleAddAccount}>
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Balance - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#638C80] via-[#5a8073] to-[#4a6b62] rounded-2xl p-6 text-white shadow-xl shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">Total Balance</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#49a034] text-xs font-medium bg-[#49a034]/20 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {stats.primaryCurrency} {formatCompactNumber(stats.totalBalance)}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  Across {stats.activeAccounts} active account{stats.activeAccounts !== 1 ? 's' : ''}
                </p>
              </div>
            </div>

            {/* Active Accounts */}
            <StatCard
              icon={CheckCircle2}
              label="Active Accounts"
              value={stats.activeAccounts.toString()}
              color="green"
              subtitle="Ready for transactions"
            />

            {/* Total Accounts */}
            <StatCard
              icon={CreditCard}
              label="Total Accounts"
              value={stats.totalAccounts.toString()}
              color="blue"
              subtitle="All bank accounts"
            />
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStatCard
              label="Total Accounts"
              value={stats.totalAccounts.toString()}
              icon={CreditCard}
              color="blue"
            />
            <MiniStatCard
              label="Active"
              value={stats.activeAccounts.toString()}
              icon={CheckCircle2}
              color="green"
            />
            <MiniStatCard
              label="Default"
              value={stats.defaultAccount ? '1' : '0'}
              icon={Landmark}
              color="teal"
            />
            <MiniStatCard
              label="Currency"
              value={stats.primaryCurrency}
              icon={DollarSign}
              color="mustard"
            />
          </div>

          {/* Accounts List */}
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
            <BankAccountsList
              onEditAccount={handleEditAccount}
              organizationId={selectedOrganizationId || undefined}
            />
          </div>

          {/* Account Form Dialog */}
          <BankAccountForm
            open={isFormOpen}
            onClose={handleCloseForm}
            account={selectedAccount}
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
