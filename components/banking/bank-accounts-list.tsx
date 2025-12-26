"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface BankAccount {
  id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  balance: number;
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

export function BankAccountsList({ onEditAccount, organizationId }: BankAccountsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

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

  const formatBalance = (amount: number, currency: string) => {
    const cleanCurrency = cleanCurrencyCode(currency);
    return `${cleanCurrency} ${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div>
      {/* Search */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search accounts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-gray-50 border-gray-200"
          />
        </div>
      </div>

      {/* Table */}
      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            {searchQuery ? "No accounts match your search" : "No bank accounts yet"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Add or sync accounts from Xero to get started
          </p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Account</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Bank</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Currency</th>
              <th className="text-right text-xs font-medium text-gray-500 px-6 py-3">Balance</th>
              <th className="text-center text-xs font-medium text-gray-500 px-6 py-3">Active</th>
              <th className="w-10 px-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {accounts.map((account: BankAccount) => (
              <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-2">
                    {account.is_default && (
                      <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />
                    )}
                    <div>
                      <div className="text-sm font-medium text-gray-900">{account.account_name}</div>
                      <div className="text-xs text-gray-500">{account.account_number}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-gray-700">{account.bank?.name || '-'}</span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-0.5 rounded">
                    {cleanCurrencyCode(account.currency)}
                  </span>
                </td>
                <td className="px-6 py-3 text-right">
                  <span className="text-sm font-medium text-gray-900">
                    {formatBalance(account.balance || 0, account.currency)}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <Switch
                    checked={account.is_active}
                    onCheckedChange={() => handleToggleActive(account)}
                    className="data-[state=checked]:bg-[#638C80]"
                  />
                </td>
                <td className="px-3 py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEditAccount(account)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {!account.is_default && (
                        <DropdownMenuItem onClick={() => setDefaultMutation.mutate(account.id)}>
                          <Star className="h-4 w-4 mr-2" />
                          Set as Default
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => handleDelete(account)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{accountToDelete?.account_name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
