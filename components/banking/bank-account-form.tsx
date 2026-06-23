"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { toast } from "sonner";

interface BankProvider {
  id: string;
  name: string;
  code: string;
}

interface BankBranch {
  id: number;
  branch_code: string;
  branch_name: string;
  is_head_office: boolean;
  swift_code: string;
}

interface BankAccountFormProps {
  open: boolean;
  onClose: () => void;
  account?: any;
}

interface FormData {
  bank_provider_id: string;
  account_name: string;
  account_number: string;
  account_type: string;
  currency: string;
  balance: number;
  branch_name?: string;
  branch_code?: string;
  swift_code?: string;
  is_active: boolean;
  is_default: boolean;
  notes?: string;
}

// Helper to extract clean currency code from enum-style strings like "CurrencyCode.UGX" -> "UGX"
const cleanCurrencyCode = (currency: string): string => {
  if (!currency) return 'USD';
  if (currency.includes('.')) {
    return currency.split('.').pop() || currency;
  }
  return currency;
};

export function BankAccountForm({ open, onClose, account }: BankAccountFormProps) {
  const queryClient = useQueryClient();
  const isEdit = !!account;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      is_active: true,
      is_default: false,
      balance: 0,
      currency: "KES",
      account_type: "checking",
      bank_provider_id: "",
    },
  });

  // Fetch bank providers
  const { data: providersResponse } = useQuery<{ results: BankProvider[] }>({
    queryKey: ["bank-providers"],
    queryFn: () => api.get("/api/v1/banking/providers/"),
    enabled: open,
  });
  const providers = providersResponse?.results || [];

  // Fetch branches for the selected provider (resolved via provider.bank on the backend)
  const selectedProviderId = watch("bank_provider_id");
  const { data: branchesResponse, isLoading: branchesLoading } = useQuery<{
    branches: BankBranch[];
    count: number;
  }>({
    queryKey: ["provider-branches", selectedProviderId],
    queryFn: () => api.get(`/api/v1/banking/providers/${selectedProviderId}/branches/`),
    enabled: open && !!selectedProviderId,
  });
  const branches = branchesResponse?.branches || [];

  // Create/Update mutation
  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (isEdit) {
        return api.patch(`/api/v1/banking/accounts/${account.id}/`, data);
      }
      return api.post("/api/v1/banking/accounts/", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bank-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["bank-account-stats"] });
      toast.success(isEdit ? "Account updated successfully" : "Account created successfully");
      onClose();
      reset();
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 
                     error.response?.data?.message ||
                     (isEdit ? "Failed to update account" : "Failed to create account");
      toast.error(message);
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (account && open) {
      // Handle bank_provider - could be object, string ID, or null
      const bankProviderId = typeof account.bank_provider === 'object'
        ? account.bank_provider?.id
        : account.bank_provider;

      setValue("bank_provider_id", bankProviderId || "");
      setValue("account_name", account.account_name || "");
      setValue("account_number", account.account_number || "");
      setValue("account_type", account.account_type || "checking");
      // Clean currency code from "CurrencyCode.UGX" format to "UGX"
      setValue("currency", cleanCurrencyCode(account.currency || "KES"));
      setValue("balance", account.balance || 0);
      setValue("branch_name", account.branch_name || "");
      setValue("branch_code", account.branch_code || "");
      setValue("swift_code", account.swift_code || "");
      setValue("is_active", account.is_active ?? true);
      setValue("is_default", account.is_default ?? false);
      setValue("notes", account.notes || "");
    } else if (open && !account) {
      reset({
        is_active: true,
        is_default: false,
        balance: 0,
        currency: "KES",
        account_type: "checking",
      });
    }
  }, [account, open, reset, setValue]);

  const onSubmit = (data: FormData) => {
    // Clean up the data - remove empty bank_provider_id for PATCH requests
    const cleanedData: Partial<FormData> = { ...data };

    // Don't send empty/null bank_provider_id
    if (!cleanedData.bank_provider_id) {
      delete cleanedData.bank_provider_id;
    }

    mutation.mutate(cleanedData as FormData);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const accountType = watch("account_type");
  const isActive = watch("is_active");
  const isDefault = watch("is_default");

  // Display label for the selected provider in the searchable dropdown.
  const selectedProviderName =
    providers.find((p) => p.id === watch("bank_provider_id"))?.name || "";

  // Display label for the selected branch in the searchable dropdown.
  const watchedBranchCode = watch("branch_code");
  const watchedBranchName = watch("branch_name");
  const selectedBranchDisplay = watchedBranchCode
    ? watchedBranchName
      ? `${watchedBranchName} — ${watchedBranchCode}`
      : watchedBranchCode
    : "";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEdit ? "Edit Bank Account" : "Add Bank Account"}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit
              ? "Update the bank account details below"
              : "Fill in the details to add a new bank account"}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Bank Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="bank_provider_id" className="text-sm font-medium text-foreground">Bank Provider *</Label>
            <SearchableSelect
              placeholder="Select a bank provider"
              value={watch("bank_provider_id") || ""}
              displayValue={selectedProviderName}
              options={providers.map((provider) => ({
                value: provider.id,
                label: provider.name,
                hint: provider.code,
              }))}
              onSelect={(value) => {
                setValue("bank_provider_id", value);
                // Branches belong to the provider's bank — reset on change.
                setValue("branch_name", "");
                setValue("branch_code", "");
              }}
            />
            {errors.bank_provider_id && (
              <p className="text-sm text-destructive">{errors.bank_provider_id.message}</p>
            )}
          </div>

          {/* Account Name */}
          <div className="space-y-2">
            <Label htmlFor="account_name" className="text-sm font-medium text-foreground">Account Name *</Label>
            <Input
              id="account_name"
              {...register("account_name", { required: "Account name is required" })}
              placeholder="e.g., Main Operating Account"
              className="h-10 bg-muted border-border"
            />
            <input type="hidden" {...register("bank_provider_id", { required: "Bank provider is required" })} />
            {errors.account_name && (
              <p className="text-sm text-destructive">{errors.account_name.message}</p>
            )}
          </div>

          {/* Account Number */}
          <div className="space-y-2">
            <Label htmlFor="account_number" className="text-sm font-medium text-foreground">Account Number *</Label>
            <Input
              id="account_number"
              {...register("account_number", { required: "Account number is required" })}
              placeholder="e.g., 1234567890"
              className="h-10 bg-muted border-border"
            />
            {errors.account_number && (
              <p className="text-sm text-destructive">{errors.account_number.message}</p>
            )}
          </div>

          {/* Account Type & Currency - Side by side */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="account_type" className="text-sm font-medium text-foreground">Account Type *</Label>
              <Select
                value={accountType}
                onValueChange={(value) => setValue("account_type", value)}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Checking</SelectItem>
                  <SelectItem value="savings">Savings</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="currency" className="text-sm font-medium text-foreground">Currency *</Label>
              <Select
                value={watch("currency")}
                onValueChange={(value) => setValue("currency", value)}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UGX">UGX - Ugandan Shilling</SelectItem>
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Balance */}
          <div className="space-y-2">
            <Label htmlFor="balance" className="text-sm font-medium text-foreground">Current Balance *</Label>
            <Input
              id="balance"
              type="number"
              step="0.01"
              {...register("balance", {
                required: "Balance is required",
                valueAsNumber: true
              })}
              placeholder="0.00"
              className="h-10 bg-muted border-border"
            />
            {errors.balance && (
              <p className="text-sm text-destructive">{errors.balance.message}</p>
            )}
          </div>

          {/* Branch Details */}
          {branches.length > 0 ? (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Branch</Label>
              <SearchableSelect
                placeholder="Select a branch"
                value={watch("branch_code") || ""}
                displayValue={selectedBranchDisplay}
                loading={branchesLoading}
                options={branches.map((b) => ({
                  value: b.branch_code,
                  label: b.branch_name || b.branch_code,
                  hint: b.branch_code,
                }))}
                onSelect={(code) => {
                  const branch = branches.find((b) => b.branch_code === code);
                  setValue("branch_code", code);
                  setValue("branch_name", branch?.branch_name || "");
                  // SWIFT/BIC comes from the branch's bank — auto-fill it.
                  if (branch?.swift_code) {
                    setValue("swift_code", branch.swift_code);
                  }
                }}
              />
              <p className="text-xs text-muted-foreground">
                Branch name and code are taken from this bank&apos;s branch registry.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch_name" className="text-sm font-medium text-foreground">Branch Name</Label>
                <Input
                  id="branch_name"
                  {...register("branch_name")}
                  placeholder="e.g., Main Branch"
                  className="h-10 bg-muted border-border"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="branch_code" className="text-sm font-medium text-foreground">Branch Code</Label>
                <Input
                  id="branch_code"
                  {...register("branch_code")}
                  placeholder="e.g., 001"
                  className="h-10 bg-muted border-border"
                />
              </div>
            </div>
          )}

          {/* SWIFT Code */}
          <div className="space-y-2">
            <Label htmlFor="swift_code" className="text-sm font-medium text-foreground">SWIFT Code</Label>
            <Input
              id="swift_code"
              {...register("swift_code")}
              placeholder="e.g., ABCDKENA"
              className="h-10 bg-muted border-border"
            />
          </div>

          {/* Status Toggles */}
          <div className="space-y-4 p-4 bg-muted/80 rounded-xl border border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_active" className="text-sm font-medium text-foreground">Active Status</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isActive ? "Account is active and can be used" : "Account is inactive"}
                </p>
              </div>
              <Switch
                id="is_active"
                checked={isActive}
                onCheckedChange={(checked) => setValue("is_active", checked)}
                className="data-[state=checked]:bg-primary"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="is_default" className="text-sm font-medium text-foreground">Default Account</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isDefault ? "This is the default account" : "Set as default account"}
                </p>
              </div>
              <Switch
                id="is_default"
                checked={isDefault}
                onCheckedChange={(checked) => setValue("is_default", checked)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium text-foreground">Notes</Label>
            <Textarea
              id="notes"
              {...register("notes")}
              placeholder="Add any additional notes about this account..."
              rows={3}
              className="bg-muted border-border resize-none"
            />
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button type="button" variant="outline" onClick={handleClose} className="btn-press">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={mutation.isPending}
              className="bg-primary hover:bg-primary/90 text-white btn-press"
            >
              {mutation.isPending ? "Saving..." : (isEdit ? "Update Account" : "Add Account")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
