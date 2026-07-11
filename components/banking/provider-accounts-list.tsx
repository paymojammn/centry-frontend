"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Loader2, Star, Wallet, Pencil, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  providerAccountsApi,
  type ProviderAccount,
  type ProviderAccountEditable,
} from "@/lib/provider-accounts-api";
import { ProviderAccountCreateDialog } from "@/components/banking/provider-account-create-dialog";

interface ProviderAccountsListProps {
  organizationId?: string;
}

function formatBalance(account: ProviderAccount): string {
  if (account.balance == null || account.balance === "") return "—";
  const n = Number(account.balance);
  if (!Number.isFinite(n)) return "—";
  return `${account.balance_currency || ""} ${n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })}`.trim();
}

export function ProviderAccountsList({ organizationId }: ProviderAccountsListProps) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ProviderAccount | null>(null);
  const [form, setForm] = useState<ProviderAccountEditable>({});
  const [editCreds, setEditCreds] = useState<{ sandbox: Record<string, string>; production: Record<string, string> }>({
    sandbox: {},
    production: {},
  });
  const [editSettings, setEditSettings] = useState<Record<string, string>>({});
  const [editCredTab, setEditCredTab] = useState<"sandbox" | "production">("sandbox");
  const [creating, setCreating] = useState(false);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["provider-accounts", organizationId],
    queryFn: () => providerAccountsApi.list(organizationId),
    enabled: !!organizationId,
  });

  const { data: schemas } = useQuery({
    queryKey: ["provider-account-schemas"],
    queryFn: () => providerAccountsApi.getSchemas(),
    staleTime: 60 * 60 * 1000,
  });

  const accounts = data?.results || [];
  const editingSchema = schemas?.find((s) => s.code === editing?.provider)?.schema ?? null;

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

  const saveEdit = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProviderAccountEditable }) =>
      providerAccountsApi.update(id, patch),
    onSuccess: () => {
      invalidate();
      setEditing(null);
      toast.success("Account updated");
    },
    onError: () => toast.error("Failed to update account"),
  });

  // Only send credentials/settings the operator actually filled in — blanks are
  // dropped so the backend merge preserves the stored (encrypted) secrets.
  const nonEmpty = (obj: Record<string, string>) =>
    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v != null));

  const submitEdit = () => {
    if (!editing) return;
    const patch: ProviderAccountEditable = { ...form };
    const sandbox = nonEmpty(editCreds.sandbox);
    const production = nonEmpty(editCreds.production);
    const settings = nonEmpty(editSettings);
    if (Object.keys(sandbox).length) patch.credentials_sandbox = sandbox;
    if (Object.keys(production).length) patch.credentials_production = production;
    if (Object.keys(settings).length) patch.settings = settings;
    saveEdit.mutate({ id: editing.id, patch });
  };

  const syncBalance = useMutation({
    mutationFn: (id: string) => providerAccountsApi.syncBalance(id),
    onMutate: (id) => setSyncingId(id),
    onSuccess: (res) => {
      invalidate();
      if (res?.success) {
        toast.success(
          `Balance synced${
            res.currency
              ? `: ${res.currency} ${Number(res.balance).toLocaleString()}`
              : ""
          }`,
        );
      } else {
        toast.error(res?.error || "Failed to fetch balance from provider");
      }
    },
    onError: () => toast.error("Failed to sync balance"),
    onSettled: () => setSyncingId(null),
  });

  const openEdit = (a: ProviderAccount) => {
    setEditing(a);
    setForm({
      name: a.name,
      active_environment: a.active_environment,
      fee_percentage: a.fee_percentage,
      fee_fixed: a.fee_fixed,
      timeout: a.timeout,
      balance: a.balance,
      balance_currency: a.balance_currency,
    });
    setEditCreds({ sandbox: {}, production: {} });
    setEditSettings({});
    setEditCredTab(a.active_environment);
  };

  const header = (
    <div className="flex items-center justify-between px-6 py-3 border-b border-border">
      <span className="text-sm font-medium text-foreground">
        {accounts.length} provider {accounts.length === 1 ? "account" : "accounts"}
      </span>
      <Button
        size="sm"
        className="h-8"
        disabled={!organizationId}
        onClick={() => setCreating(true)}
      >
        <Plus className="h-4 w-4 mr-1" />
        New account
      </Button>
    </div>
  );

  const createDialog = organizationId ? (
    <ProviderAccountCreateDialog
      organizationId={organizationId}
      open={creating}
      onOpenChange={setCreating}
    />
  ) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <>
        {header}
        <div className="text-center py-12">
          <Wallet className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No provider accounts yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Add a payment provider (MTN, Airtel, Ozow, Paystack, etc.) with “New account”.
          </p>
        </div>
        {createDialog}
      </>
    );
  }

  return (
    <>
      {header}
      <table className="w-full table-professional">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Account</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Provider</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Balance</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Capabilities</th>
            <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Env</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Default</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Active</th>
            <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Edit</th>
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
                <div className="text-sm font-medium text-foreground tabular-nums">
                  {formatBalance(account)}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] text-muted-foreground">
                    {account.balance_synced_at
                      ? `synced ${format(new Date(account.balance_synced_at), "dd MMM HH:mm")}`
                      : "never synced"}
                  </span>
                  <button
                    type="button"
                    onClick={() => syncBalance.mutate(account.id)}
                    disabled={syncingId === account.id}
                    className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                    title="Sync balance from provider"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${syncingId === account.id ? "animate-spin" : ""}`}
                    />
                  </button>
                </div>
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
              <td className="px-6 py-3 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => openEdit(account)}
                  title="Edit account"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {editing?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-sm">Account name</Label>
              <Input
                value={form.name ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Environment</Label>
              <Select
                value={form.active_environment}
                onValueChange={(v) =>
                  setForm((f) => ({ ...f, active_environment: v as "sandbox" | "production" }))
                }
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Environment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Fee %</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fee_percentage ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fee_percentage: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Fee fixed</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.fee_fixed ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, fee_fixed: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Balance</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={form.balance ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Balance currency</Label>
                <Select
                  value={form.balance_currency || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, balance_currency: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Currency" />
                  </SelectTrigger>
                  <SelectContent>
                    {(() => {
                      const opts = editing?.balance_currency_options?.length
                        ? editing.balance_currency_options
                        : ["USD", "EUR"];
                      // Always allow the current value even if outside the options.
                      const all =
                        form.balance_currency && !opts.includes(form.balance_currency)
                          ? [form.balance_currency, ...opts]
                          : opts;
                      return all.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ));
                    })()}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Timeout (seconds)</Label>
              <Input
                type="number"
                value={form.timeout ?? ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, timeout: Number(e.target.value) || 0 }))
                }
              />
            </div>

            {editingSchema && editingSchema.credential_fields.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Credentials</Label>
                <Tabs value={editCredTab} onValueChange={(v) => setEditCredTab(v as "sandbox" | "production")}>
                  <TabsList className="grid grid-cols-2 w-full">
                    <TabsTrigger value="sandbox" className="text-xs">
                      Sandbox{editing?.has_sandbox_credentials ? " ✓" : ""}
                    </TabsTrigger>
                    <TabsTrigger value="production" className="text-xs">
                      Production{editing?.has_production_credentials ? " ✓" : ""}
                    </TabsTrigger>
                  </TabsList>
                  {(["sandbox", "production"] as const).map((env) => (
                    <TabsContent key={env} value={env} className="space-y-3 pt-3">
                      {editingSchema.credential_fields.map((field) => (
                        <div key={field.name} className="space-y-1.5">
                          <Label className="text-xs">{field.name}</Label>
                          <Input
                            type={field.field_type === "secret" ? "password" : "text"}
                            value={editCreds[env][field.name] || ""}
                            onChange={(e) =>
                              setEditCreds((c) => ({
                                ...c,
                                [env]: { ...c[env], [field.name]: e.target.value },
                              }))
                            }
                            placeholder={field.help_text || "leave blank to keep current"}
                            className="text-sm font-mono"
                          />
                        </div>
                      ))}
                    </TabsContent>
                  ))}
                </Tabs>
              </div>
            )}

            {editingSchema && editingSchema.setting_fields.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm">Settings</Label>
                {editingSchema.setting_fields.map((field) => (
                  <div key={field.name} className="space-y-1.5">
                    <Label className="text-xs">{field.name}</Label>
                    <Input
                      value={editSettings[field.name] || ""}
                      onChange={(e) =>
                        setEditSettings((s) => ({ ...s, [field.name]: e.target.value }))
                      }
                      placeholder={field.help_text || "leave blank to keep current"}
                      className="text-sm"
                    />
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground flex items-start gap-1.5">
              <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
              Blank credential/setting fields are left unchanged. Balance can be set manually or
              pulled live with the sync button.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              onClick={submitEdit}
              disabled={saveEdit.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {saveEdit.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {createDialog}
    </>
  );
}
