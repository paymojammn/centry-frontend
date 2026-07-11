'use client';

/**
 * Create a new provider account (org-scoped) with a schema-driven credential
 * form — the finance-app equivalent of the Django admin "add ProviderAccount"
 * page. Credential/setting fields are rendered from the provider's schema.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  providerAccountsApi,
  type ProviderSchemaField,
  type CreateProviderAccountPayload,
} from '@/lib/provider-accounts-api';

interface Props {
  organizationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProviderAccountCreateDialog({ organizationId, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const { data: providers } = useQuery({
    queryKey: ['provider-account-schemas'],
    queryFn: () => providerAccountsApi.getSchemas(),
    staleTime: 60 * 60 * 1000,
  });

  const [providerCode, setProviderCode] = useState('');
  const [name, setName] = useState('');
  const [environment, setEnvironment] = useState<'sandbox' | 'production'>('sandbox');
  const [country, setCountry] = useState('');
  const [feePercentage, setFeePercentage] = useState('0.00');
  const [feeFixed, setFeeFixed] = useState('0.00');
  const [credsSandbox, setCredsSandbox] = useState<Record<string, string>>({});
  const [credsProduction, setCredsProduction] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [credTab, setCredTab] = useState<'sandbox' | 'production'>('sandbox');

  const selected = useMemo(
    () => providers?.find((p) => p.code === providerCode),
    [providers, providerCode],
  );
  const credentialFields = selected?.schema?.credential_fields ?? [];
  const settingFields = selected?.schema?.setting_fields ?? [];
  const providerCountries = selected?.schema?.countries ?? [];

  const reset = () => {
    setProviderCode('');
    setName('');
    setEnvironment('sandbox');
    setCountry('');
    setFeePercentage('0.00');
    setFeeFixed('0.00');
    setCredsSandbox({});
    setCredsProduction({});
    setSettings({});
    setCredTab('sandbox');
  };

  const close = () => {
    reset();
    onOpenChange(false);
  };

  const handleProviderChange = (code: string) => {
    setProviderCode(code);
    const countries = providers?.find((p) => p.code === code)?.schema?.countries ?? [];
    setCountry(countries[0] ?? '');
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateProviderAccountPayload) => providerAccountsApi.create(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['provider-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['payment-sources'] });
      toast.success('Provider account created');
      close();
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create provider account'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerCode || !name) return;
    createMutation.mutate({
      organization: organizationId,
      provider: providerCode,
      name,
      active_environment: environment,
      country: country || undefined,
      fee_percentage: parseFloat(feePercentage) || 0,
      fee_fixed: parseFloat(feeFixed) || 0,
      credentials_sandbox: credsSandbox,
      credentials_production: credsProduction,
      settings,
    });
  };

  const renderField = (
    field: ProviderSchemaField,
    value: string,
    setValue: (v: string) => void,
    requiredForActive: boolean,
  ) => {
    const isSecret = field.field_type === 'secret';
    return (
      <div key={field.name} className="space-y-1.5">
        <Label className="text-xs">
          {field.name}
          {field.required && requiredForActive && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Input
          type={isSecret ? 'password' : 'text'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={field.help_text}
          className="text-sm font-mono"
        />
        {field.help_text && <p className="text-[10px] text-muted-foreground">{field.help_text}</p>}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : close())}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Provider Account</DialogTitle>
          <DialogDescription>
            Set up a payment provider with sandbox and production credentials in one record.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">
                Provider <span className="text-destructive">*</span>
              </Label>
              <Select value={providerCode} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map((p) => (
                    <SelectItem key={p.code} value={p.code}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Uganda MTN Production"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Active environment</Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as 'sandbox' | 'production')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sandbox">Sandbox</SelectItem>
                  <SelectItem value="production">Production</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Country (ISO-2)</Label>
              {providerCountries.length > 1 ? (
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerCountries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value.toUpperCase())}
                  maxLength={2}
                  placeholder={providerCode ? '—' : 'Select a provider first'}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fee % (pass-through)</Label>
              <Input type="number" step="0.01" min="0" value={feePercentage} onChange={(e) => setFeePercentage(e.target.value)} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Fee fixed</Label>
              <Input type="number" step="0.01" min="0" value={feeFixed} onChange={(e) => setFeeFixed(e.target.value)} />
            </div>
          </div>

          {selected && credentialFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Credentials</Label>
              <Tabs value={credTab} onValueChange={(v) => setCredTab(v as 'sandbox' | 'production')}>
                <TabsList className="grid grid-cols-2 w-full">
                  <TabsTrigger value="sandbox" className="text-xs">
                    Sandbox
                  </TabsTrigger>
                  <TabsTrigger value="production" className="text-xs">
                    Production
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="sandbox" className="space-y-3 pt-3">
                  {credentialFields.map((f) =>
                    renderField(
                      f,
                      credsSandbox[f.name] || '',
                      (v) => setCredsSandbox((prev) => ({ ...prev, [f.name]: v })),
                      environment === 'sandbox',
                    ),
                  )}
                </TabsContent>
                <TabsContent value="production" className="space-y-3 pt-3">
                  {credentialFields.map((f) =>
                    renderField(
                      f,
                      credsProduction[f.name] || '',
                      (v) => setCredsProduction((prev) => ({ ...prev, [f.name]: v })),
                      environment === 'production',
                    ),
                  )}
                </TabsContent>
              </Tabs>
              <p className="text-[10px] text-muted-foreground flex items-start gap-1.5 pt-1">
                <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
                Credentials are encrypted at rest. Required fields apply to the active environment.
              </p>
            </div>
          )}

          {selected && settingFields.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs">Settings</Label>
              <div className="space-y-3">
                {settingFields.map((f) =>
                  renderField(f, settings[f.name] || '', (v) => setSettings((prev) => ({ ...prev, [f.name]: v })), false),
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" disabled={createMutation.isPending || !providerCode || !name}>
              {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Create account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
