"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useAllSFTPCredentials } from "@/hooks/use-banking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MoreHorizontal,
  Search,
  Star,
  Building2,
  Pencil,
  Trash2,
  Server,
  Power,
  PowerOff,
} from "lucide-react";
import { toast } from "sonner";
import { HostToHostDialog } from "@/components/banking/host-to-host-dialog";

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  /** Statement-sourced (read-only): MT940 :64:/:62F: or camt.053 CLAV/CLBD. */
  balance: number;
  booked_balance?: number | string | null;
  balance_as_of_date?: string | null;
  balance_is_stale?: boolean;
  bank: {
    id: string;
    name: string;
    code: string;
    country: string;
  };
  bank_provider?: {
    id: string;
    name: string;
    code: string;
  };
  branch_name?: string;
  branch_code?: string;
  swift_code?: string;
  is_active: boolean;
  is_default: boolean;
  xero_account_name?: string;
  created_at: string;
}

interface BankAccountsListProps {
  onEditAccount: (account: BankAccount) => void;
  organizationId?: string;
}

// Helper to extract clean currency code from enum-style strings
const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  // Handle "CurrencyCode.UGX" -> "UGX"
  if (currency.includes('.')) {
    return currency.split('.').pop() || currency;
  }
  return currency;
};

const formatBalanceAmount = (amount: number | string) => {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  return (numericAmount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

const formatDate = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : format(d, "dd MMM yyyy");
};

// Statement closing dates are plain ISO dates; anchor to local midnight so
// they don't shift a day in west-of-UTC browsers.
const formatAsOf = (iso: string | null | undefined) => {
  if (!iso) return "No statement yet";
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? "No statement yet" : `As of ${format(d, "dd MMM yyyy")}`;
};

// Semantic status-pill tints (success / warning / danger / info / neutral).
const PILL = {
  success: "bg-success-500/10 text-success-700 border-success-500/20",
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  neutral: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20",
} as const;

function ActivePill({ active }: { active: boolean }) {
  return (
    <span className={`status-pill ${active ? PILL.success : PILL.neutral}`}>
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function SyncPill({ synced }: { synced: boolean }) {
  return (
    <span className={`status-pill ${synced ? PILL.info : PILL.neutral}`}>
      {synced ? "Synced" : "Not synced"}
    </span>
  );
}

export function BankAccountsList({ onEditAccount, organizationId }: BankAccountsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"host_to_host" | "other" | "all">(
    "host_to_host"
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);
  const [h2hAccount, setH2hAccount] = useState<BankAccount | null>(null);

  const queryClient = useQueryClient();

  const { data: accountsResponse, isLoading } = useQuery({
    queryKey: ["bank-accounts", organizationId, searchQuery],
    queryFn: () => {
      const params = new URLSearchParams();
      if (organizationId) params.append("organization", organizationId);
      if (searchQuery) params.append("search", searchQuery);
      return api.get(`/api/v1/banking/accounts/?${params.toString()}`);
    },
    enabled: !!organizationId,
  });

  const accounts = Array.isArray(accountsResponse)
    ? accountsResponse
    : (accountsResponse as any)?.results || [];

  // Which accounts have a host-to-host (SFTP) connection configured.
  const { data: sftpData } = useAllSFTPCredentials(organizationId);
  const accountsWithH2H = useMemo(() => {
    const ids = new Set<string>();
    (sftpData?.results || []).forEach((c) => {
      if (c?.bank_account?.id != null) ids.add(String(c.bank_account.id));
    });
    return ids;
  }, [sftpData]);

  const hasH2H = (account: BankAccount) => accountsWithH2H.has(String(account.id));

  const pills = [
    { value: "all", label: "All", count: accounts.length },
    { value: "host_to_host", label: "Host-to-Host", count: accounts.filter((a: BankAccount) => hasH2H(a)).length },
    { value: "other", label: "Other", count: accounts.filter((a: BankAccount) => !hasH2H(a)).length },
  ] as const;

  const filteredAccounts = accounts.filter((a: BankAccount) =>
    statusFilter === "all" ? true : statusFilter === "host_to_host" ? hasH2H(a) : !hasH2H(a)
  );

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/banking/accounts/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Account deleted");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: () => {
      toast.error("Failed to delete account");
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/api/v1/banking/accounts/${id}/`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Account updated");
    },
    onError: () => {
      toast.error("Failed to update account");
    },
  });

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/banking/accounts/${id}/set_default/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      toast.success("Default account updated");
    },
    onError: () => {
      toast.error("Failed to set default");
    },
  });

  const handleDelete = (account: BankAccount) => {
    setAccountToDelete(account);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id);
    }
  };

  const handleToggleActive = (account: BankAccount) => {
    toggleActiveMutation.mutate({ id: account.id, is_active: !account.is_active });
  };

  const emptyTitle = searchQuery
    ? "No accounts match your search"
    : statusFilter === "host_to_host"
      ? "No accounts with a host-to-host connection"
      : statusFilter === "other"
        ? "No accounts without a host-to-host connection"
        : "No bank accounts yet";
  const emptyDescription =
    statusFilter === "host_to_host"
      ? "Configure one from an account's menu (switch to All to see every account)"
      : "Add or sync accounts from your ERP to get started";

  return (
    <div>
      {/* Toolbar: filter pills + search */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        {pills.map((p) => {
          const active = statusFilter === p.value;
          return (
            <button
              key={p.value}
              type="button"
              onClick={() => setStatusFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
              }`}
            >
              {p.label} ({p.count})
            </button>
          );
        })}
        <div className="ml-auto relative w-56 max-w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <LoadingState />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState icon={Building2} title={emptyTitle} description={emptyDescription} />
      ) : (
        <div className="table-scroll-container">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Account</th>
                <th>Bank</th>
                <th className="cell-currency">Ccy</th>
                <th className="text-right">Balance</th>
                <th>Status</th>
                <th>ERP</th>
                <th>Added</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredAccounts.map((account: BankAccount) => (
                <tr key={account.id}>
                  <td className="cell-primary">
                    <div className="flex items-center gap-2">
                      {account.is_default && (
                        <Star
                          className="h-3.5 w-3.5 text-warning-400 fill-warning-400 flex-shrink-0"
                          aria-label="Default account"
                        />
                      )}
                      <div className="min-w-0">
                        <span className="block truncate max-w-[240px]">{account.account_name}</span>
                        <span className="cell-sub">{account.account_number || "—"}</span>
                      </div>
                    </div>
                  </td>
                  <td className="cell-muted">
                    <span className="block truncate max-w-[180px]">{account.bank?.name || "—"}</span>
                    {account.branch_name && <span className="cell-sub">{account.branch_name}</span>}
                  </td>
                  <td className="cell-currency">{cleanCurrencyCode(account.currency)}</td>
                  <td className="cell-amount">
                    {formatBalanceAmount(account.balance || 0)}
                    <span className="cell-sub">
                      {formatAsOf(account.balance_as_of_date)}
                      {account.balance_is_stale && (
                        <span className={`status-pill ml-2 ${PILL.neutral}`}>Stale</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <ActivePill active={account.is_active} />
                  </td>
                  <td>
                    <SyncPill synced={!!account.xero_account_name} />
                  </td>
                  <td className="cell-muted whitespace-nowrap">{formatDate(account.created_at)}</td>
                  <td>
                    <div className="flex items-center justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                            aria-label="Account actions"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEditAccount(account)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setH2hAccount(account)}>
                            <Server className="h-4 w-4 mr-2" />
                            Host-to-Host Connection
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleActive(account)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {account.is_active ? (
                              <>
                                <PowerOff className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <Power className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          {!account.is_default && (
                            <DropdownMenuItem onClick={() => setDefaultMutation.mutate(account.id)}>
                              <Star className="h-4 w-4 mr-2" />
                              Set as Default
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => handleDelete(account)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Host-to-Host Connections Dialog */}
      {h2hAccount && (
        <HostToHostDialog
          open={!!h2hAccount}
          onClose={() => setH2hAccount(null)}
          bankAccountId={Number(h2hAccount.id)}
          bankAccountName={h2hAccount.account_name}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{accountToDelete?.account_name}&quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
