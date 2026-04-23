"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Switch } from "@/components/ui/switch";
import { Loader2, Star, Wallet } from "lucide-react";
import { toast } from "sonner";
import { providerAccountsApi, type ProviderAccount } from "@/lib/provider-accounts-api";

interface ProviderAccountsListProps {
  organizationId?: string;
}

export function ProviderAccountsList({ organizationId }: ProviderAccountsListProps) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["provider-accounts", organizationId],
    queryFn: () => providerAccountsApi.list(organizationId),
    enabled: !!organizationId,
  });

  const accounts = data?.results || [];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["provider-accounts"] });
    queryClient.invalidateQueries({ queryKey: ["payment-sources"] });
  };

  const toggleActive = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      providerAccountsApi.update(id, { is_active }),
    onSuccess: () => {
      invalidate();
      toast.success("Account updated");
    },
    onError: () => toast.error("Failed to update account"),
  });

  const setDefault = useMutation({
    mutationFn: (id: string) => providerAccountsApi.update(id, { is_default: true }),
    onSuccess: () => {
      invalidate();
      toast.success("Default account updated");
    },
    onError: () => toast.error("Failed to set default"),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="text-center py-12">
        <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">No provider accounts yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Link a payment provider (MTN, Airtel, Ozow, Paystack, etc.) during onboarding.
        </p>
      </div>
    );
  }

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border bg-muted/50">
          <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Account</th>
          <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Provider</th>
          <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Capabilities</th>
          <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Env</th>
          <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Default</th>
          <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Active</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {accounts.map((account: ProviderAccount) => (
          <tr key={account.id} className="hover:bg-muted transition-colors">
            <td className="px-6 py-3">
              <div className="flex items-center gap-2">
                {account.is_default && (
                  <Star className="h-3.5 w-3.5 text-[#D4B35A] fill-[#D4B35A] flex-shrink-0" />
                )}
                <div className="text-sm font-medium text-foreground">{account.name}</div>
              </div>
            </td>
            <td className="px-6 py-3">
              <span className="text-sm text-foreground uppercase">{account.provider}</span>
              {account.country && (
                <div className="text-xs text-muted-foreground">{account.country}</div>
              )}
            </td>
            <td className="px-6 py-3">
              <div className="flex gap-1 flex-wrap">
                {(account.capabilities || []).map((c) => (
                  <span key={c} className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                    {c}
                  </span>
                ))}
              </div>
            </td>
            <td className="px-6 py-3">
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  account.is_live
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-700"
                }`}
              >
                {account.active_environment}
              </span>
            </td>
            <td className="px-6 py-3 text-center">
              <button
                type="button"
                disabled={account.is_default || setDefault.isPending}
                onClick={() => setDefault.mutate(account.id)}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40"
                title={account.is_default ? "Default" : "Make default"}
              >
                {account.is_default ? "—" : "Set default"}
              </button>
            </td>
            <td className="px-6 py-3 text-center">
              <Switch
                checked={account.is_active}
                onCheckedChange={() =>
                  toggleActive.mutate({ id: account.id, is_active: !account.is_active })
                }
                className="data-[state=checked]:bg-primary"
              />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
