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
  CheckCircle2,
  CreditCard,
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Bank Accounts</h1>
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

            <div className="flex items-center gap-2">
              {activeConnectionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAccounts}
                  disabled={isSyncing}
                  className="h-9"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync from Xero'}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleAddAccount}
                className="h-9 bg-[#638C80] hover:bg-[#547568]"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Total Balance:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                {stats.primaryCurrency} {formatCompactNumber(stats.totalBalance)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Accounts:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {stats.totalAccounts}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Active:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-700">
                {stats.activeAccounts}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Default:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-amber-50 text-amber-700">
                {stats.defaultAccount ? stats.defaultAccount.account_name : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">All Accounts</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">Manage your organization's bank accounts</p>
          </div>
          <BankAccountsList
            onEditAccount={handleEditAccount}
            organizationId={selectedOrganizationId || undefined}
          />
        </div>
      </div>

      {/* Account Form Dialog */}
      <BankAccountForm
        open={isFormOpen}
        onClose={handleCloseForm}
        account={selectedAccount}
      />
    </div>
  );
}
