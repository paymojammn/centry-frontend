/**
 * Pay In — request money from one number or collect from many at once.
 *
 * Backed by CollectionRequest: every payer becomes an item, so a bulk receive
 * can be tracked and retried one number at a time.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { StatsBar } from '@/components/layout/stats-bar';
import { ContentCard } from '@/components/layout/content-card';
import {
  BulkPartyEditor,
  createPartyRow,
  type PartyRow,
} from '@/components/payments/bulk-party-editor';
import { useOrganizations } from '@/hooks/use-organization';
import { useRailSelection } from '@/hooks/use-payment-rails';
import { RailSelector } from '@/components/payments/rail-selector';
import {
  useCollectionRequests,
  useCollectionStats,
  useCreateCollectionRequest,
  useRefreshCollectionRequest,
  useRetryCollectionItem,
} from '@/hooks/use-collection-requests';
import { collectionsApi } from '@/lib/collections-api';
import type {
  CollectionItemStatus,
  CollectionRequest,
  CollectionRequestSummary,
} from '@/types/collection-request';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowDownLeft,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  RefreshCw,
  RotateCcw,
  Users,
  XCircle,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { collectionKeys } from '@/hooks/use-collection-requests';

const ITEM_STATUS_STYLES: Record<
  CollectionItemStatus,
  { label: string; className: string; Icon: React.ElementType }
> = {
  pending: { label: 'Queued', className: 'text-muted-foreground bg-muted', Icon: Clock },
  requested: {
    label: 'Awaiting payer',
    className: 'text-amber-700 bg-amber-50',
    Icon: Clock,
  },
  success: { label: 'Collected', className: 'text-primary bg-primary/5', Icon: CheckCircle2 },
  failed: { label: 'Failed', className: 'text-destructive bg-destructive/5', Icon: XCircle },
  expired: { label: 'Expired', className: 'text-destructive bg-destructive/5', Icon: XCircle },
};

export default function PayInPage() {
  const { data: organizationsResponse, isLoading: loadingOrgs } = useOrganizations();
  const organizations = useMemo(
    () =>
      (Array.isArray(organizationsResponse)
        ? organizationsResponse
        : (organizationsResponse as any)?.results || []) as {
        id: string;
        name: string;
        primary_currency?: string;
        currency?: string;
      }[],
    [organizationsResponse]
  );

  const [organizationId, setOrganizationId] = useState<string>('');
  useEffect(() => {
    if (!organizationId && organizations.length) setOrganizationId(organizations[0]!.id);
  }, [organizations, organizationId]);

  const currentOrganization = organizations.find((o) => o.id === organizationId);
  const orgCurrency =
    currentOrganization?.primary_currency || currentOrganization?.currency || 'UGX';

  // Country + rail drive the currency, so they are resolved before anything else.
  const rails = useRailSelection(organizationId, 'payin', orgCurrency);
  const currency = rails.currency;

  const [activeTab, setActiveTab] = useState('single');
  const [single, setSingle] = useState({ name: '', phone: '', amount: '', description: '' });
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [bulkDescription, setBulkDescription] = useState('');

  const { data: stats } = useCollectionStats(organizationId);
  const { data: requestsData, isLoading: loadingRequests } = useCollectionRequests({
    organization_id: organizationId,
  });
  const { mutate: createCollection, isPending: isCreating } = useCreateCollectionRequest();

  const requests = requestsData?.results || [];

  const validRows = useMemo(
    () => rows.filter((r) => r.phone.trim() && parseFloat(r.amount) > 0),
    [rows]
  );

  const singleValid = single.phone.trim().length > 0 && parseFloat(single.amount) > 0;

  const statsBarData = [
    {
      label: 'Collected',
      value: formatCurrency(parseFloat(stats?.total_collected || '0'), currency),
      color: 'rgb(var(--brand-primary))',
    },
    {
      label: 'Awaiting payers',
      value: stats?.awaiting_count ?? 0,
      color: '#f59e0b',
      variant: (stats?.awaiting_count || 0) > 0 ? ('warning' as const) : ('default' as const),
    },
    {
      label: 'Pending amount',
      value: formatCurrency(parseFloat(stats?.total_awaiting_amount || '0'), currency),
      color: '#f59e0b',
    },
    { label: 'Requests', value: stats?.total ?? 0, color: 'rgb(var(--brand-primary))' },
  ];

  const handleSingle = () => {
    if (!organizationId || !singleValid || !rails.ready) return;
    createCollection(
      {
        organization_id: organizationId,
        collection_type: 'single',
        collection_method: 'mobile_money',
        payer_name: single.name,
        payer_phone: single.phone.trim(),
        amount: parseFloat(single.amount),
        currency,
        description: single.description,
        ...(rails.railId ? { destination_provider_account_id: rails.railId } : {}),
      },
      {
        onSuccess: () => {
          setSingle({ name: '', phone: '', amount: '', description: '' });
          setActiveTab('history');
        },
      }
    );
  };

  const handleBulk = () => {
    if (!organizationId || validRows.length === 0 || !rails.ready) return;
    createCollection(
      {
        organization_id: organizationId,
        collection_type: 'bulk',
        collection_method: 'mobile_money',
        payers: validRows.map((r) => ({
          name: r.name,
          phone: r.phone.trim(),
          amount: parseFloat(r.amount),
        })),
        currency,
        description: bulkDescription || `Bulk collection from ${validRows.length} payers`,
        ...(rails.railId ? { destination_provider_account_id: rails.railId } : {}),
      },
      {
        onSuccess: () => {
          setRows([]);
          setBulkDescription('');
          setActiveTab('history');
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Pay In"
        subtitle="Request money from a single number, or collect from many at once"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Pay In' }]}
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={loadingOrgs}
      />

      <StatsBar stats={statsBarData} />

      <PageContainer className="space-y-6">
        <RailSelector
          capability="payin"
          countries={rails.countries}
          countryCode={rails.countryCode}
          onCountryChange={rails.setCountryCode}
          railId={rails.railId}
          onRailChange={rails.setRailId}
          country={rails.country}
          rail={rails.rail}
          currency={currency}
          isLoading={rails.isLoading}
        />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6 animate-fade-in-up">
          <TabsList className="grid w-full grid-cols-3 lg:w-[520px] bg-muted p-1">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          {/* ---------------- Single ---------------- */}
          <TabsContent value="single">
            <ContentCard className="max-w-2xl">
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Receive from a number</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    The payer gets a prompt on their phone and approves with their PIN.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="payer-phone">
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="payer-phone"
                      value={single.phone}
                      placeholder="256700000000"
                      onChange={(e) => setSingle({ ...single, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payer-name">Payer name</Label>
                    <Input
                      id="payer-name"
                      value={single.name}
                      placeholder="Optional"
                      onChange={(e) => setSingle({ ...single, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="payer-amount">
                      Amount ({currency}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="payer-amount"
                      value={single.amount}
                      inputMode="decimal"
                      placeholder="0.00"
                      onChange={(e) =>
                        setSingle({ ...single, amount: e.target.value.replace(/[^\d.]/g, '') })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="payer-description">Reason</Label>
                  <Textarea
                    id="payer-description"
                    rows={2}
                    value={single.description}
                    placeholder="Shown to the payer, e.g. Invoice INV-1042"
                    onChange={(e) => setSingle({ ...single, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm text-muted-foreground">
                    {!rails.ready
                      ? 'Select a country and rail to continue'
                      : singleValid
                        ? `Requesting ${formatCurrency(parseFloat(single.amount), currency)} via ${rails.rail?.provider_display}`
                        : 'Enter a phone number and amount'}
                  </p>
                  <Button onClick={handleSingle} disabled={!singleValid || !rails.ready || isCreating}>
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 mr-1.5" />
                    )}
                    Request payment
                  </Button>
                </div>
              </div>
            </ContentCard>
          </TabsContent>

          {/* ---------------- Bulk ---------------- */}
          <TabsContent value="bulk">
            <ContentCard>
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Receive from many numbers</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Every payer is pushed and tracked separately — failures can be retried on their own.
                  </p>
                </div>

                <div className="space-y-1.5 max-w-md">
                  <Label htmlFor="bulk-description">Reason</Label>
                  <Input
                    id="bulk-description"
                    value={bulkDescription}
                    placeholder="e.g. March contributions"
                    onChange={(e) => setBulkDescription(e.target.value)}
                  />
                </div>

                <BulkPartyEditor
                  rows={rows}
                  onChange={setRows}
                  currency={currency}
                  partyLabel="Payer"
                  emptyHint="Add a row, paste a list, or import a CSV of numbers to collect from"
                  disabled={isCreating}
                />

                <div className="flex items-center justify-between pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setRows([...rows, createPartyRow()])}
                    disabled={isCreating}
                  >
                    Add another
                  </Button>
                  <Button
                    onClick={handleBulk}
                    disabled={validRows.length === 0 || !rails.ready || isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <ArrowDownLeft className="h-4 w-4 mr-1.5" />
                    )}
                    Request from {validRows.length || 0}{' '}
                    {validRows.length === 1 ? 'number' : 'numbers'}
                  </Button>
                </div>
              </div>
            </ContentCard>
          </TabsContent>

          {/* ---------------- History ---------------- */}
          <TabsContent value="history" className="space-y-4">
            {loadingRequests ? (
              <ContentCard>
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </ContentCard>
            ) : requests.length === 0 ? (
              <ContentCard>
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <ArrowDownLeft className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No collections yet</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Money you request will show up here
                  </p>
                </div>
              </ContentCard>
            ) : (
              <div className="space-y-3 animate-stagger">
                {requests.map((request) => (
                  <CollectionRow key={request.id} request={request} currency={currency} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </PageContainer>
    </div>
  );
}

/** One collection request, expandable to its per-payer items. */
function CollectionRow({
  request,
  currency,
}: {
  request: CollectionRequestSummary;
  currency: string;
}) {
  const [open, setOpen] = useState(false);
  const { mutate: refresh, isPending: isRefreshing } = useRefreshCollectionRequest();
  const { mutate: retryItem, isPending: isRetrying } = useRetryCollectionItem();

  // Items only come back on the detail endpoint, so fetch them on expand.
  const { data: detail, isLoading } = useQuery<CollectionRequest>({
    queryKey: collectionKeys.detail(request.id),
    queryFn: () => collectionsApi.getCollectionRequest(request.id),
    enabled: open,
    refetchInterval: (query) =>
      open && ['draft', 'processing'].includes(query.state.data?.status || '') ? 5_000 : false,
  });

  const items = detail?.items || [];
  const collected = parseFloat(request.collected_amount || '0');
  const total = parseFloat(request.amount || '0');

  return (
    <ContentCard noPadding>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
          <ArrowDownLeft className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {request.collection_type === 'bulk'
                ? `${request.total_payers} payers`
                : request.payers?.[0]?.phone || request.reference}
            </span>
            <StatusPill status={request.status} label={request.status_display} />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {request.reference}
            {request.description ? ` · ${request.description}` : ''}
          </p>
        </div>

        <div className="text-right shrink-0">
          <div className="text-sm font-semibold text-foreground">
            {formatCurrency(collected, request.currency || currency)}
          </div>
          <div className="text-xs text-muted-foreground">
            of {formatCurrency(total, request.currency || currency)}
          </div>
        </div>

        <ChevronDown
          className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <div className="border-t border-border px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Payers
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={isRefreshing}
              onClick={() => refresh(request.id)}
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh status
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => {
                const style = ITEM_STATUS_STYLES[item.status];
                const Icon = style.Icon;
                const canRetry = item.status === 'failed' || item.status === 'expired';
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/40"
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${style.className.split(' ')[0]}`} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-foreground truncate">
                        {item.payer_phone}
                        {item.payer_name ? ` · ${item.payer_name}` : ''}
                      </div>
                      {item.error_message && (
                        <div className="text-xs text-destructive truncate">
                          {item.error_message}
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-medium shrink-0 ${style.className}`}
                    >
                      {style.label}
                    </span>
                    <span className="text-sm font-medium text-foreground shrink-0 w-28 text-right">
                      {formatCurrency(parseFloat(item.amount), item.currency)}
                    </span>
                    {canRetry && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={isRetrying}
                        onClick={() => retryItem({ requestId: request.id, itemId: item.id })}
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </ContentCard>
  );
}

function StatusPill({ status, label }: { status: string; label: string }) {
  const styles: Record<string, string> = {
    draft: 'text-muted-foreground bg-muted',
    processing: 'text-amber-700 bg-amber-50',
    completed: 'text-primary bg-primary/5',
    partial: 'text-amber-700 bg-amber-50',
    failed: 'text-destructive bg-destructive/5',
    cancelled: 'text-muted-foreground bg-muted',
  };
  return (
    <span
      className={`text-[11px] px-1.5 py-0.5 rounded font-medium shrink-0 ${
        styles[status] || styles.draft
      }`}
    >
      {label}
    </span>
  );
}
