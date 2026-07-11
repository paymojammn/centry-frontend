'use client';

/**
 * Organisation → provider-account picker for the certification/test pages.
 *
 * Lets the operator choose an organisation, then one of that org's provider
 * accounts for the given `provider`. The selected account id is what the cert
 * endpoints resolve against.
 */

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { useOrganizations } from '@/hooks/use-organization';
import { providerAccountsApi, type ProviderAccount } from '@/lib/provider-accounts-api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Props {
  provider: string;
  value: string;
  onChange: (accountId: string, account?: ProviderAccount) => void;
}

export function ProviderAccountPicker({ provider, value, onChange }: Props) {
  const { data: orgsResp } = useOrganizations();
  const orgs = orgsResp?.results ?? [];
  const [orgId, setOrgId] = useState('');

  const { data: accountsResp, isLoading } = useQuery({
    queryKey: ['provider-accounts', orgId],
    queryFn: () => providerAccountsApi.list(orgId),
    enabled: !!orgId,
  });
  const accounts = (accountsResp?.results ?? []).filter((a) => a.provider === provider);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <label className="text-xs text-muted-foreground">Organisation</label>
        <Select
          value={orgId}
          onValueChange={(v) => {
            setOrgId(v);
            onChange('');
          }}
        >
          <SelectTrigger className="h-9 w-64">
            <SelectValue placeholder="Select organisation" />
          </SelectTrigger>
          <SelectContent>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>
                {o.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <label className="text-xs text-muted-foreground">Provider account</label>
        <Select
          value={value}
          onValueChange={(v) => onChange(v, accounts.find((a) => a.id === v))}
          disabled={!orgId}
        >
          <SelectTrigger className="h-9 w-72">
            <SelectValue
              placeholder={
                !orgId
                  ? 'Select an organisation first'
                  : isLoading
                    ? 'Loading…'
                    : accounts.length
                      ? 'Select account'
                      : `No ${provider} accounts in this org`
              }
            />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name} ({a.active_environment})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
