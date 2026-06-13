"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BankAccountsList } from "@/components/banking/bank-accounts-list";
import { BankAccountForm } from "@/components/banking/bank-account-form";
import { StatCard } from "@/components/layout/stat-card";
import { PageHeader } from "@/components/layout/page-header";
import { useOrganizations } from "@/hooks/use-organization";
import { useSyncAccounts, useERPConnections } from "@/hooks/use-erp";
import {
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

  // Calculate stats — balances are split by currency (summing across
  // currencies is meaningless), so we surface the org's local currency and USD.
  const stats = useMemo(() => {
    const selectedOrg = organizations.find((o: any) => o.id === selectedOrganizationId);
    const nonUsd = accounts.find((a) => cleanCurrencyCode(a.currency) !== 'USD');
    const localCurrency =
      (selectedOrg?.primary_currency && cleanCurrencyCode(selectedOrg.primary_currency) !== 'USD'
        ? cleanCurrencyCode(selectedOrg.primary_currency)
        : nonUsd
          ? cleanCurrencyCode(nonUsd.currency)
          : selectedOrg?.primary_currency
            ? cleanCurrencyCode(selectedOrg.primary_currency)
            : 'UGX');
    const sumFor = (ccy: string) =>
      accounts
        .filter((a) => cleanCurrencyCode(a.currency) === ccy)
        .reduce((sum, a) => sum + (parseFloat(String(a.balance)) || 0), 0);

    return {
      localCurrency,
      balanceLocal: sumFor(localCurrency),
      balanceUSD: sumFor('USD'),
      activeAccounts: accounts.filter((acc) => acc.is_active).length,
      totalAccounts: accounts.length,
    };
  }, [accounts, organizations, selectedOrganizationId]);

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
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Bank Accounts"
        subtitle="Manage your organization's bank accounts"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Accounts" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
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
      </PageHeader>

      {/* Summary cards */}
      <div className="px-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard
            label={`Balance · ${stats.localCurrency}`}
            value={stats.balanceLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            subtext={`${stats.localCurrency} ${formatCurrencyAmount(stats.balanceLocal)}`}
            icon={CreditCard}
            variant="accent"
          />
          <StatCard
            label="Balance · USD"
            value={stats.balanceUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            subtext={`USD ${formatCurrencyAmount(stats.balanceUSD)}`}
            icon={CreditCard}
            variant="info"
          />
          <StatCard
            label="Accounts"
            value={stats.totalAccounts}
            icon={Landmark}
            variant="default"
          />
          <StatCard
            label="Active"
            value={stats.activeAccounts}
            icon={CheckCircle2}
            variant="success"
          />
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
