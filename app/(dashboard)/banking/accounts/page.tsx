"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { BankAccountsList } from "@/components/banking/bank-accounts-list";
import { BankAccountForm } from "@/components/banking/bank-account-form";
import { StatCard } from "@/components/layout/stat-card";
import { ContentCard } from "@/components/layout/content-card";
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
    const countFor = (ccy: string) =>
      accounts.filter((a) => cleanCurrencyCode(a.currency) === ccy).length;
    const currencies = new Set(accounts.map((a) => cleanCurrencyCode(a.currency)));
    const activeAccounts = accounts.filter((acc) => acc.is_active).length;

    return {
      localCurrency,
      balanceLocal: sumFor(localCurrency),
      balanceUSD: sumFor('USD'),
      localCount: countFor(localCurrency),
      usdCount: countFor('USD'),
      currencyCount: currencies.size,
      activeAccounts,
      inactiveAccounts: accounts.length - activeAccounts,
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

  const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Accounts"
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
            size="sm"
            onClick={handleSyncAccounts}
            disabled={isSyncing}
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : `Sync from ${activeProviderName}`}
          </Button>
        )}
        <Button size="sm" onClick={handleAddAccount} className="h-9 btn-press">
          <Plus className="h-4 w-4 mr-2" />
          Add account
        </Button>
      </PageHeader>

      <div className="px-6 py-6">
        {/* Summary cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6 animate-fade-in-up">
          <StatCard
            label={`Balance · ${stats.localCurrency}`}
            value={stats.balanceLocal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            subtext={`${stats.localCurrency} ${formatCurrencyAmount(stats.balanceLocal)} · ${plural(stats.localCount, 'account')}`}
            icon={CreditCard}
            variant="default"
          />
          <StatCard
            label="Balance · USD"
            value={stats.balanceUSD.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            subtext={`USD ${formatCurrencyAmount(stats.balanceUSD)} · ${plural(stats.usdCount, 'account')}`}
            icon={CreditCard}
            variant="default"
          />
          <StatCard
            label="Accounts"
            value={stats.totalAccounts}
            subtext={`Across ${stats.currencyCount} ${stats.currencyCount === 1 ? 'currency' : 'currencies'}`}
            icon={Landmark}
            variant="default"
          />
          <StatCard
            label="Active"
            value={stats.activeAccounts}
            subtext={`${stats.inactiveAccounts} inactive`}
            icon={CheckCircle2}
            variant={stats.activeAccounts > 0 ? 'success' : 'default'}
          />
        </div>

        {/* Accounts grid */}
        <ContentCard noPadding className="animate-fade-in">
          <BankAccountsList
            onEditAccount={handleEditAccount}
            organizationId={selectedOrganizationId || undefined}
          />
        </ContentCard>
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
