'use client';

import { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileKey2,
  Pencil,
  Plug,
  Plus,
  Power,
  ShieldAlert,
  Trash2,
  Zap,
} from 'lucide-react';
import { CertificateDialog } from '@/components/fiscal/certificate-dialog';
import { ConnectionDialog } from '@/components/fiscal/connection-dialog';
import { ContentCard } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  useDeleteFiscalConnection,
  useFiscalConnections,
  useTestFiscalConnection,
  useUpdateFiscalConnection,
} from '@/hooks/use-fiscal';
import { useFiscalOrganization } from '@/hooks/use-fiscal-organization';
import { countryLabel } from '@/lib/fiscal';
import type { FiscalConnection } from '@/types/fiscal';

const ENV_BADGE: Record<string, 'success' | 'warning' | 'secondary'> = {
  live: 'success',
  uat: 'warning',
  test: 'secondary',
};

function documentTotal(c: FiscalConnection): number {
  const d = c.document_counts;
  return d ? d.fiscalized + d.error + d.pending : 0;
}

export default function FiscalConnectionsPage() {
  const { organizations, organizationId, setOrganizationId, isLoadingOrgs } = useFiscalOrganization();
  const { data, isLoading, error } = useFiscalConnections(organizationId);
  const connections = data?.results ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FiscalConnection | null>(null);
  const [certFor, setCertFor] = useState<FiscalConnection | null>(null);
  const [removing, setRemoving] = useState<FiscalConnection | null>(null);
  const [testingId, setTestingId] = useState<string | null>(null);

  const test = useTestFiscalConnection();
  const update = useUpdateFiscalConnection();
  const remove = useDeleteFiscalConnection();

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (c: FiscalConnection) => {
    setEditing(c);
    setDialogOpen(true);
  };
  const runTest = (c: FiscalConnection) => {
    setTestingId(c.id);
    test.mutate(c.id, { onSettled: () => setTestingId(null) });
  };

  const removeWillDeactivate = removing ? documentTotal(removing) > 0 : false;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Fiscal Connections"
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={isLoadingOrgs}
      >
        <Button size="sm" className="h-9" onClick={openCreate} disabled={!organizationId}>
          <Plus className="h-4 w-4 mr-2" /> Add connection
        </Button>
      </PageHeader>

      <div className="px-6 py-6">
        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ContentCard>
            <div className="text-center py-10">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Error loading fiscal connections</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          </ContentCard>
        ) : connections.length === 0 ? (
          <ContentCard>
            <EmptyState
              icon={Plug}
              title="No fiscal connections"
              description="Connect a taxpayer to URA EFRIS, ZRA or DGI to start fiscalizing invoices."
            >
              <Button size="sm" onClick={openCreate} disabled={!organizationId}>
                <Plus className="h-4 w-4 mr-2" /> Add connection
              </Button>
            </EmptyState>
          </ContentCard>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-fade-in">
            {connections.map((c) => (
              <ContentCard key={c.id} className={c.is_active ? '' : 'opacity-70'}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground">{c.country_label || countryLabel(c.country_code)}</p>
                    <h2 className="text-base font-semibold text-foreground truncate">
                      {c.business_name || c.legal_name || `TIN ${c.tin}`}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      TIN <span className="font-mono text-foreground">{c.tin}</span>
                      {c.device_no ? ` · Device ${c.device_no}` : ''}
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <Badge variant={ENV_BADGE[c.environment] ?? 'secondary'} appearance="light" size="sm">
                      {c.environment.toUpperCase()}
                    </Badge>
                    <Badge variant={c.is_active ? 'primary' : 'secondary'} appearance="light" size="sm">
                      {c.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-lg bg-muted px-2 py-2">
                    <p className="text-lg font-semibold text-foreground tabular-nums">{c.document_counts?.fiscalized ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Fiscalized</p>
                  </div>
                  <div className="rounded-lg bg-muted px-2 py-2">
                    <p className="text-lg font-semibold text-foreground tabular-nums">{c.document_counts?.pending ?? 0}</p>
                    <p className="text-xs text-muted-foreground">Pending</p>
                  </div>
                  <div className="rounded-lg bg-muted px-2 py-2">
                    <p className={`text-lg font-semibold tabular-nums ${c.document_counts?.error ? 'text-destructive' : 'text-foreground'}`}>
                      {c.document_counts?.error ?? 0}
                    </p>
                    <p className="text-xs text-muted-foreground">Errors</p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                  {c.has_certificate ? (
                    <span className="inline-flex items-center gap-1 text-primary">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Certificate on file
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <ShieldAlert className="h-3.5 w-3.5" /> No certificate
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {c.credential_keys?.length ?? 0} credential{(c.credential_keys?.length ?? 0) === 1 ? '' : 's'} set
                  </span>
                  {c.auto_fiscalize && <span className="text-muted-foreground">Auto-fiscalize</span>}
                  {c.writeback_enabled && <span className="text-muted-foreground">Write-back</span>}
                </div>

                <div className="mt-4 pt-4 border-t border-border flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => runTest(c)} disabled={testingId === c.id}>
                    <Zap className={`h-4 w-4 mr-1.5 ${testingId === c.id ? 'animate-pulse' : ''}`} />
                    {testingId === c.id ? 'Testing…' : 'Test connection'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                    <Pencil className="h-4 w-4 mr-1.5" /> Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCertFor(c)}>
                    <FileKey2 className="h-4 w-4 mr-1.5" /> Certificate
                  </Button>
                  {c.is_active ? (
                    <Button size="sm" variant="ghost" className="text-destructive ml-auto" onClick={() => setRemoving(c)}>
                      <Trash2 className="h-4 w-4 mr-1.5" /> Remove
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto"
                      disabled={update.isPending}
                      onClick={() => update.mutate({ id: c.id, payload: { is_active: true } })}
                    >
                      <Power className="h-4 w-4 mr-1.5" /> Reactivate
                    </Button>
                  )}
                </div>
              </ContentCard>
            ))}
          </div>
        )}
      </div>

      <ConnectionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        organizationId={organizationId}
        connection={editing}
      />
      <CertificateDialog connection={certFor} onClose={() => setCertFor(null)} />

      <AlertDialog open={!!removing} onOpenChange={(o) => !o && setRemoving(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{removeWillDeactivate ? 'Deactivate connection?' : 'Delete connection?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeWillDeactivate
                ? `TIN ${removing?.tin} has fiscal documents, so it will be deactivated and kept for the audit trail. No new invoices will be fiscalized through it.`
                : `TIN ${removing?.tin} has no fiscal documents and will be deleted with its stored credentials.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => {
                e.preventDefault();
                if (removing) remove.mutate(removing.id, { onSuccess: () => setRemoving(null) });
              }}
            >
              {remove.isPending ? 'Working…' : removeWillDeactivate ? 'Deactivate' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
