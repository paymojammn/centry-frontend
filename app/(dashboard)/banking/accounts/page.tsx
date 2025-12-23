"use client";

import { useState, useEffect } from "react";
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
import { Building2, Plus, RefreshCw } from "lucide-react";

export default function BankAccountsPage() {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const { data: erpConnectionsResponse } = useERPConnections();
  const { mutate: syncAccounts, isPending: isSyncing } = useSyncAccounts();

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
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Bank Accounts</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage your organization's bank accounts
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Organization Selector */}
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

              {/* Sync Button */}
              {activeConnectionId && (
                <Button
                  variant="outline"
                  onClick={handleSyncAccounts}
                  disabled={isSyncing}
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync'}
                </Button>
              )}

              {/* Add Account Button */}
              <Button onClick={handleAddAccount} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Account
              </Button>
            </div>
          </div>

          {/* Accounts List */}
          <div className="bg-white rounded-lg border shadow-sm">
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
            organizationId={selectedOrganizationId || undefined}
          />
        </div>
      </div>
    </div>
  );
}
