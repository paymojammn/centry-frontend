"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Edit,
  Trash2,
  Search,
  Star,
  Building2,
  CheckCircle2,
  XCircle,
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

export function BankAccountsList({ onEditAccount, organizationId }: BankAccountsListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [accountTypeFilter, setAccountTypeFilter] = useState("all");
  const [currencyFilter, setCurrencyFilter] = useState("all");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<BankAccount | null>(null);

  const queryClient = useQueryClient();

  // Fetch accounts for selected organization
  const { data: accountsResponse, isLoading } = useQuery({
    queryKey: ["bank-accounts", organizationId, searchQuery, accountTypeFilter, currencyFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (organizationId) params.append("organization", organizationId);
      if (searchQuery) params.append("search", searchQuery);
      if (accountTypeFilter !== "all") params.append("account_type", accountTypeFilter);
      if (currencyFilter !== "all") params.append("currency", currencyFilter);

      return api.get(`/api/v1/banking/accounts/?${params.toString()}`);
    },
    enabled: !!organizationId,
  });

  // Handle both array format and paginated format { results: [] }
  const accounts = Array.isArray(accountsResponse) 
    ? accountsResponse 
    : (accountsResponse as any)?.results || [];

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.del(`/api/v1/banking/accounts/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account-stats"] });
      toast.success("Account deleted successfully");
      setDeleteDialogOpen(false);
      setAccountToDelete(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to delete account");
    },
  });

  // Set default mutation
  const setDefaultMutation = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/banking/accounts/${id}/set_default/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account-stats"] });
      toast.success("Default account updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to set default account");
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

  const handleSetDefault = (account: BankAccount) => {
    setDefaultMutation.mutate(account.id);
  };

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      checking: "bg-blue-100 text-blue-800",
      savings: "bg-green-100 text-green-800",
      current: "bg-purple-100 text-purple-800",
      business: "bg-orange-100 text-orange-800",
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number, currency: string) => {
    // List of currencies not fully supported by Intl.NumberFormat
    const unsupportedCurrencies = ['UGX', 'KES', 'TZS', 'RWF', 'BIF'];

    if (unsupportedCurrencies.includes(currency)) {
      // Manual formatting for unsupported currencies
      return `${currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }

    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch (error) {
      // Fallback for any other unsupported currencies
      return `${currency} ${amount.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500">
        <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full mx-auto mb-4"></div>
        Loading accounts...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search by name, number, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Account Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="checking">Checking</SelectItem>
            <SelectItem value="savings">Savings</SelectItem>
            <SelectItem value="current">Current</SelectItem>
            <SelectItem value="business">Business</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currencyFilter} onValueChange={setCurrencyFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="Currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Currencies</SelectItem>
            <SelectItem value="KES">KES</SelectItem>
            <SelectItem value="USD">USD</SelectItem>
            <SelectItem value="EUR">EUR</SelectItem>
            <SelectItem value="GBP">GBP</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {accounts.length === 0 ? (
        <div className="text-center py-12">
          <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No bank accounts found</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery || accountTypeFilter !== "all" || currencyFilter !== "all"
              ? "Try adjusting your filters"
              : "Get started by adding your first bank account"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead>Account</TableHead>
                <TableHead>Bank</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <div className="flex items-start gap-2">
                      {account.is_default && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mt-0.5" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{account.account_name}</div>
                        <div className="text-sm text-gray-500">{account.account_number}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium text-gray-900">{account.bank.name}</div>
                      <div className="text-sm text-gray-500">{account.bank.country}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getAccountTypeBadge(account.account_type)}>
                      {account.account_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {account.branch_name ? (
                      <div>
                        <div className="text-sm text-gray-900">{account.branch_name}</div>
                        {account.branch_code && (
                          <div className="text-xs text-gray-500">{account.branch_code}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="font-medium text-gray-900">
                      {formatCurrency(account.balance, account.currency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {account.is_active ? (
                      <Badge className="bg-green-100 text-green-800 flex items-center gap-1 w-fit">
                        <CheckCircle2 className="h-3 w-3" />
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 flex items-center gap-1 w-fit">
                        <XCircle className="h-3 w-3" />
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {!account.is_default && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSetDefault(account)}
                          className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                        >
                          <Star className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditAccount(account)}
                        className="text-[#638C80] hover:text-[#638C80] hover:bg-[#638C80]/10"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(account)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Bank Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{accountToDelete?.account_name}</strong>?
              This action cannot be undone.
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
