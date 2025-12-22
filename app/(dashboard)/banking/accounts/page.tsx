"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useOrganizations } from "@/hooks/use-organization";
import { useSyncAccounts, useERPConnections } from "@/hooks/use-erp";
import {
  Building2,
  Plus,
  TrendingUp,
  CheckCircle2,
  DollarSign,
  RefreshCw
} from "lucide-react";

interface AccountStats {
  total_accounts: number;
  active_accounts: number;
  total_balance: number;
  by_currency: Record<string, number>;
}

export default function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncAccounts, isPending: isSyncing } = useSyncAccounts();

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Extract connections from paginated response
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Find active ERP connection for selected organization
  useEffect(() => {
    if (!selectedOrganizationId) return;

    const orgConnection = erpConnections?.find(
      conn => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    if (orgConnection) {
      setActiveConnectionId(orgConnection.id);
    } else {
      setActiveConnectionId(null);
    }
  }, [selectedOrganizationId, erpConnections]);

  // Fetch account stats for selected organization
  const { data: stats } = useQuery<AccountStats>({
    queryKey: ["bank-account-stats", selectedOrganizationId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (selectedOrganizationId) params.append('organization', selectedOrganizationId);
      return api.get(`/api/v1/banking/accounts/stats/?${params.toString()}`);
    },
    enabled: !!selectedOrganizationId,
  });

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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="absolute top-0 right-0 -mt-10 -mr-10 h-40 w-40 rounded-full bg-white/10"></div>
            <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-40 w-40 rounded-full bg-white/10"></div>
            <div className="relative flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Building2 className="h-8 w-8" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Bank Accounts</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Manage your organization's bank accounts and view balances
                </p>
              </div>

              {/* Action Buttons */}
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

                {/* Sync Accounts Button */}
                {activeConnectionId && (
                  <Button
                    onClick={handleSyncAccounts}
                    disabled={isSyncing}
                    className="bg-white/95 backdrop-blur-sm text-[#638C80] hover:bg-white shadow-lg hover:shadow-xl transition-all"
                    size="lg"
                    title={isSyncing ? 'Syncing accounts...' : 'Sync chart of accounts from Xero'}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Syncing...' : 'Sync from Xero'}
                  </Button>
                )}

                {/* Add Account Button */}
                <Button
                  onClick={handleAddAccount}
                  className="bg-white/95 backdrop-blur-sm text-[#638C80] hover:bg-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Account
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards with vibrant gradients */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#638C80] to-[#547568] p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Building2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Total Accounts</div>
                <div className="text-4xl font-bold text-white">{stats?.total_accounts || 0}</div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <CheckCircle2 className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Active Accounts</div>
                <div className="text-4xl font-bold text-white">{stats?.active_accounts || 0}</div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Total Balance</div>
                <div className="text-4xl font-bold text-white">
                  {stats?.total_balance?.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  }) || '0.00'}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="text-white/80 text-sm font-medium mb-1">Currencies</div>
                <div className="text-4xl font-bold text-white">
                  {stats?.by_currency ? Object.keys(stats.by_currency).length : 0}
                </div>
              </div>
            </div>
          </div>

          {/* Accounts List */}
          <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
            <BankAccountsList
              onEditAccount={handleEditAccount}
              organizationId={selectedOrganizationId || undefined}
            />
          </Card>

          {/* Account Form Dialog */}
          <BankAccountForm
            open={isFormOpen}
            onClose={handleCloseForm}
            account={selectedAccount}
            organizationId={selectedOrganizationId || undefined}
          />
        </div>
      </div>
    </div>
  );
}
