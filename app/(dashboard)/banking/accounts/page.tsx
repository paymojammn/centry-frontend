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

// Format currency amount with proper grouping
function formatCurrencyAmount(num: number): string {
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeProviderName, setActiveProviderName] = useState<string>('ERP');

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
    setActiveProviderName(orgConnection?.provider_app?.provider?.name || 'ERP');
  }, [selectedOrganizationId, erpConnections]);

  // Calculate stats
  const stats = useMemo(() => {
    const totalBalance = accounts.reduce((sum, acc) => sum + (parseFloat(String(acc.balance)) || 0), 0);
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
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-normal text-foreground">Bank Accounts</h1>

            <div className="flex items-center gap-2">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-muted border-border">
                  <Building2 className="h-4 w-4 text-muted-foreground/60 mr-2" />
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
              {activeConnectionId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSyncAccounts}
                  disabled={isSyncing}
                  className="h-9"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : `Sync from ${activeProviderName}`}
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleAddAccount}
                className="h-9 bg-primary hover:bg-primary/90"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Total Balance:</span>
              <span className="px-2 py-0.5 rounded text-sm font-normal bg-primary/10 text-primary">
                {stats.primaryCurrency} {formatCurrencyAmount(stats.totalBalance)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Accounts:</span>
              <span className="px-2 py-0.5 rounded text-sm font-normal bg-[#6B8FB8]/10 text-[#6B8FB8]">
                {stats.totalAccounts}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Active:</span>
              <span className="px-2 py-0.5 rounded text-sm font-normal bg-primary/5 text-primary">
                {stats.activeAccounts}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Default:</span>
              <span className="px-2 py-0.5 rounded text-sm font-normal bg-[#D4B35A]/10 text-[#D4B35A]">
                {stats.defaultAccount ? stats.defaultAccount.account_name : 'None'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-sm font-normal text-foreground">All Accounts</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Manage your organization's bank accounts</p>
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
