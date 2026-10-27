'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Plug, ScanSearch } from 'lucide-react';
import { FiscalConnectionSelect } from '@/components/fiscal/connection-select';
import { DataView } from '@/components/fiscal/data-view';
import { JsonBlock } from '@/components/fiscal/json-block';
import { ContentCard } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalConnections, useFiscalInformationLookup, useFiscalInformationRequests } from '@/hooks/use-fiscal';
import { useFiscalOrganization } from '@/hooks/use-fiscal-organization';

export default function FiscalLookupsPage() {
  const { organizations, organizationId, setOrganizationId, isLoadingOrgs } = useFiscalOrganization();
  const { data: connectionsPage, isLoading: connectionsLoading } = useFiscalConnections(organizationId);
  const connections = (connectionsPage?.results ?? []).filter((c) => c.is_active);

  const [pickedId, setPickedId] = useState('');
  const connection = connections.find((c) => c.id === pickedId) ?? connections[0];
  const connectionId = connection?.id ?? '';

  const requests = useFiscalInformationRequests(connectionId || null);
  const [requestKey, setRequestKey] = useState('');
  const request = requests.data?.find((r) => r.key === requestKey);
  const [params, setParams] = useState<Record<string, string>>({});
  const lookup = useFiscalInformationLookup();

  const changeConnection = (id: string) => {
    setPickedId(id);
    setRequestKey('');
    setParams({});
    lookup.reset();
  };
  const changeRequest = (key: string) => {
    setRequestKey(key);
    setParams({});
    lookup.reset();
  };

  const missingParam = request?.params.some((p) => p.required && !(params[p.name] ?? '').trim()) ?? true;

  const run = () => {
    if (!request || !connectionId || missingParam) return;
    lookup.mutate({ connectionId, request: request.key, params });
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Authority Lookups"
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={isLoadingOrgs}
      />

      <div className="px-6 py-6 space-y-4">
        {connectionsLoading ? (
          <LoadingState />
        ) : !connection ? (
          <ContentCard>
            <EmptyState icon={Plug} title="No active fiscal connection" description="Add a connection to query the tax authority.">
              <Button asChild size="sm">
                <Link href="/fiscal/connections">Go to connections</Link>
              </Button>
            </EmptyState>
          </ContentCard>
        ) : (
          <>
            <ContentCard>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  run();
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="lookup-connection" className="text-sm font-medium text-foreground">
                      Connection
                    </label>
                    <FiscalConnectionSelect id="lookup-connection" connections={connections} value={connectionId} onChange={changeConnection} />
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="lookup-request" className="text-sm font-medium text-foreground">
                      Lookup
                    </label>
                    <Select value={requestKey} onValueChange={changeRequest} disabled={requests.isLoading || !requests.data?.length}>
                      <SelectTrigger id="lookup-request">
                        <SelectValue placeholder={requests.isLoading ? 'Loading…' : 'Select a lookup'} />
                      </SelectTrigger>
                      <SelectContent>
                        {(requests.data ?? []).map((r) => (
                          <SelectItem key={r.key} value={r.key}>
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {requests.error && <p className="text-xs text-destructive">{requests.error.message}</p>}
                  </div>
                </div>

                {request && request.params.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {request.params.map((p) => (
                      <div key={p.name} className="space-y-1.5">
                        <label htmlFor={`lookup-param-${p.name}`} className="text-sm font-medium text-foreground">
                          {p.label}
                          {p.required && <span className="text-destructive"> *</span>}
                        </label>
                        <Input
                          id={`lookup-param-${p.name}`}
                          value={params[p.name] ?? ''}
                          onChange={(e) => setParams((prev) => ({ ...prev, [p.name]: e.target.value }))}
                        />
                        {p.help && <p className="text-xs text-muted-foreground">{p.help}</p>}
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex justify-end">
                  <Button type="submit" disabled={!request || missingParam || lookup.isPending}>
                    <ScanSearch className="h-4 w-4 mr-2" />
                    {lookup.isPending ? 'Querying…' : 'Run lookup'}
                  </Button>
                </div>
              </form>
            </ContentCard>

            <ContentCard noPadding>
              {lookup.isPending ? (
                <LoadingState />
              ) : lookup.error ? (
                <div className="text-center py-16">
                  <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                  <p className="text-sm font-medium text-foreground">Lookup failed</p>
                  <p className="text-sm text-muted-foreground mt-1">{lookup.error.message}</p>
                </div>
              ) : !lookup.data ? (
                <EmptyState icon={ScanSearch} title="No lookup yet" description="Pick a lookup and run it to see the authority's answer." />
              ) : (
                <div className="space-y-4 pb-4">
                  <DataView data={lookup.data.result} />
                  <div className="px-4">
                    <JsonBlock title="Raw response" data={lookup.data} />
                  </div>
                </div>
              )}
            </ContentCard>
          </>
        )}
      </div>
    </div>
  );
}
