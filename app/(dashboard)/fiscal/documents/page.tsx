'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, ChevronRight, Clock, FileText, Search, XCircle } from 'lucide-react';
import { DocumentDetailSheet } from '@/components/fiscal/document-detail-sheet';
import { FiscalConnectionSelect } from '@/components/fiscal/connection-select';
import { FiscalStatusBadge } from '@/components/fiscal/fiscal-status-badge';
import { ContentCard } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatCard } from '@/components/layout/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFiscalConnections, useFiscalDocumentSummary, useFiscalDocuments } from '@/hooks/use-fiscal';
import { useFiscalOrganization } from '@/hooks/use-fiscal-organization';
import { FISCAL_COUNTRIES, totalPages } from '@/lib/fiscal';
import type { FiscalDocumentFilters, FiscalStatus } from '@/types/fiscal';

const PAGE_SIZE = 25;

const STATUS_PILLS: { value: FiscalStatus | 'all'; label: string; countKey?: 'total' | 'fiscalized' | 'pending_approval' | 'error' | 'rejected' | 'cancelled' }[] = [
  { value: 'all', label: 'All', countKey: 'total' },
  { value: 'fiscalized', label: 'Fiscalized', countKey: 'fiscalized' },
  { value: 'pending_approval', label: 'Pending Approval', countKey: 'pending_approval' },
  { value: 'error', label: 'Error', countKey: 'error' },
  { value: 'rejected', label: 'Rejected', countKey: 'rejected' },
  { value: 'cancelled', label: 'Cancelled', countKey: 'cancelled' },
  { value: 'received', label: 'Received' },
  { value: 'sending', label: 'Sending' },
];

function formatDate(d: string) {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatAmount(a: string) {
  const n = parseFloat(a || '0');
  return Number.isNaN(n) ? a : n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export default function FiscalDocumentsPage() {
  const { organizations, organizationId, setOrganizationId, isLoadingOrgs } = useFiscalOrganization();

  const [status, setStatus] = useState<FiscalStatus | 'all'>('all');
  const [country, setCountry] = useState<string>('all');
  const [connection, setConnection] = useState<string>('all');
  const [kind, setKind] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce the search box into the server-side `search` filter.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Any filter change goes back to page 1.
  useEffect(() => {
    setPage(1);
  }, [organizationId, status, country, connection, kind, dateFrom, dateTo, search]);

  const baseFilters: FiscalDocumentFilters = useMemo(
    () => ({
      organization: organizationId || undefined,
      country_code: country as FiscalDocumentFilters['country_code'],
      connection: connection === 'all' ? undefined : connection,
      kind: kind as FiscalDocumentFilters['kind'],
      date_from: dateFrom || undefined,
      date_to: dateTo || undefined,
      search: search || undefined,
    }),
    [organizationId, country, connection, kind, dateFrom, dateTo, search],
  );
  const listFilters: FiscalDocumentFilters = { ...baseFilters, status, page, page_size: PAGE_SIZE };

  const { data: connectionsPage } = useFiscalConnections(organizationId);
  const connections = connectionsPage?.results ?? [];
  const { data: summary } = useFiscalDocumentSummary(baseFilters);
  const { data, isLoading, error, isFetching } = useFiscalDocuments(listFilters);
  const documents = data?.results ?? [];
  const pages = totalPages(data?.count ?? 0, PAGE_SIZE);
  const hasFilters = status !== 'all' || country !== 'all' || connection !== 'all' || kind !== 'all' || !!dateFrom || !!dateTo || !!search;

  const resetFilters = () => {
    setStatus('all');
    setCountry('all');
    setConnection('all');
    setKind('all');
    setDateFrom('');
    setDateTo('');
    setSearchInput('');
  };

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Fiscal Documents"
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={isLoadingOrgs}
      >
        <Button asChild variant="outline" size="sm" className="h-9">
          <Link href="/fiscal/connections">Connections</Link>
        </Button>
      </PageHeader>

      <div className="px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6 animate-fade-in-up">
          <StatCard label="Total" value={summary?.total ?? 0} subtext="Documents submitted" icon={FileText} variant="accent" />
          <StatCard label="Fiscalized" value={summary?.fiscalized ?? 0} subtext="FDN issued" icon={CheckCircle2} variant="success" />
          <StatCard
            label="Pending Approval"
            value={summary?.pending_approval ?? 0}
            subtext="Credit notes awaiting the authority"
            icon={Clock}
            variant={summary?.pending_approval ? 'warning' : 'default'}
          />
          <StatCard
            label="Failed"
            value={(summary?.error ?? 0) + (summary?.rejected ?? 0)}
            subtext={`${summary?.error ?? 0} error · ${summary?.rejected ?? 0} rejected · ${summary?.cancelled ?? 0} cancelled`}
            icon={XCircle}
            variant={(summary?.error ?? 0) + (summary?.rejected ?? 0) > 0 ? 'danger' : 'default'}
          />
        </div>

        <ContentCard noPadding className="animate-fade-in">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {STATUS_PILLS.map((p) => {
              const active = status === p.value;
              const count = p.countKey ? summary?.[p.countKey] : undefined;
              return (
                <button
                  key={p.value}
                  onClick={() => setStatus(p.value)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {p.label}
                  {count !== undefined ? ` (${count})` : ''}
                </button>
              );
            })}
            <div className="ml-auto relative w-56 max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Invoice, FDN, buyer..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="pl-9 h-9 bg-card border-border text-sm text-foreground"
              />
            </div>
          </div>

          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All countries</SelectItem>
                {FISCAL_COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FiscalConnectionSelect
              connections={connections}
              value={connection}
              onChange={setConnection}
              allowAll
              className="h-9 w-64"
            />
            <Select value={kind} onValueChange={setKind}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Kind" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All kinds</SelectItem>
                <SelectItem value="invoice">Invoices</SelectItem>
                <SelectItem value="credit_note">Credit notes</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Input type="date" aria-label="From date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 w-40" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" aria-label="To date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 w-40" />
            </div>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                Clear filters
              </Button>
            )}
          </div>

          {isLoading ? (
            <LoadingState />
          ) : error ? (
            <div className="text-center py-16">
              <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Error loading fiscal documents</p>
              <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
            </div>
          ) : documents.length === 0 ? (
            <EmptyState
              icon={FileText}
              title={hasFilters ? 'No documents match these filters' : 'No fiscal documents yet'}
              description={
                hasFilters
                  ? 'Try different filters.'
                  : 'Fiscalize an ERP invoice or turn on auto-fiscalize on a connection.'
              }
            />
          ) : (
            <>
              <div className={`overflow-x-auto ${isFetching ? 'opacity-70' : ''}`}>
                <table className="w-full table-professional">
                  <thead>
                    <tr>
                      <th>Invoice</th>
                      <th>Buyer</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th>Country</th>
                      <th className="text-center">Status</th>
                      <th>FDN</th>
                      <th>Created</th>
                      <th className="text-right pr-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {documents.map((doc) => (
                      <tr key={doc.id} className="cursor-pointer" onClick={() => setSelectedId(doc.id)}>
                        <td className="cell-primary">
                          <div className="min-w-0">
                            <div className="truncate">{doc.invoice_number || doc.instance_invoice_id}</div>
                            {doc.kind === 'credit_note' && <span className="cell-sub">Credit note</span>}
                          </div>
                        </td>
                        <td className="max-w-[200px] truncate">{doc.buyer_name || '-'}</td>
                        <td className="cell-currency">{doc.currency}</td>
                        <td className="cell-amount">{formatAmount(doc.total_amount)}</td>
                        <td className="cell-muted">{doc.country_code}</td>
                        <td className="text-center">
                          <FiscalStatusBadge status={doc.status} label={doc.status_label} size="sm" />
                        </td>
                        <td className="font-mono text-xs">{doc.fdn || '-'}</td>
                        <td className="cell-muted">{formatDate(doc.created_at)}</td>
                        <td className="text-right pr-4">
                          <ChevronRight className="h-4 w-4 text-muted-foreground/50 inline" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                <span className="text-muted-foreground">
                  {data?.count ?? 0} document{data?.count === 1 ? '' : 's'} · page {page} of {pages}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || !data?.previous} onClick={() => setPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={page >= pages || !data?.next} onClick={() => setPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </ContentCard>
      </div>

      <DocumentDetailSheet documentId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
