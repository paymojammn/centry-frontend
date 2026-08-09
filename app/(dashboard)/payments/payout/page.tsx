/**
 * Pay Out — send money to one number or disburse to many at once.
 *
 * Backed by PaymentRequest, so every send goes through the existing approval
 * workflow before it reaches a provider. Bulk sends fan out one provider call
 * per recipient.
 */

'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { StatsBar } from '@/components/layout/stats-bar';
import { ContentCard } from '@/components/layout/content-card';
import { StatusBadge } from '@/components/layout/status-badge';
import {
  BulkPartyEditor,
  createPartyRow,
  type PartyRow,
} from '@/components/payments/bulk-party-editor';
import { StatusPills, type StatusPill } from '@/components/payments/status-pills';
import { useOrganizations } from '@/hooks/use-organization';
import { useRailSelection } from '@/hooks/use-payment-rails';
import { RailSelector } from '@/components/payments/rail-selector';
import {
  useApprovePaymentRequest,
  useCreatePaymentRequest,
  usePaymentRequestStats,
  usePaymentRequests,
  usePendingPaymentRequests,
  useProcessPaymentRequest,
  useRejectPaymentRequest,
  useSubmitPaymentRequest,
} from '@/hooks/use-payment-requests';
import type { PaymentRequest, PaymentRequestStatus } from '@/types/payment-request';
import { formatCurrency } from '@/lib/utils';
import {
  ArrowUpRight,
  CheckCircle,
  ClipboardCheck,
  Loader2,
  RefreshCw,
  Send,
  Users,
  XCircle,
} from 'lucide-react';

const STATUS_BADGE_MAP: Record<string, { status: string; label: string }> = {
  draft: { status: 'draft', label: 'Draft' },
  pending: { status: 'pending_approval', label: 'Pending approval' },
  approved: { status: 'approved', label: 'Approved' },
  rejected: { status: 'rejected', label: 'Rejected' },
  processing: { status: 'processing', label: 'Processing' },
  completed: { status: 'paid', label: 'Completed' },
  failed: { status: 'failed', label: 'Failed' },
};

export default function PayOutPage() {
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
  const rails = useRailSelection(organizationId, 'payout', orgCurrency);
  const currency = rails.currency;

  const [activeTab, setActiveTab] = useState('single');
  const [single, setSingle] = useState({ name: '', phone: '', amount: '', description: '' });
  const [rows, setRows] = useState<PartyRow[]>([]);
  const [bulkDescription, setBulkDescription] = useState('');
  const [reviewing, setReviewing] = useState<PaymentRequest | null>(null);
  const [reviewMode, setReviewMode] = useState<'approve' | 'reject'>('approve');
  const [reviewNote, setReviewNote] = useState('');

  const { data: stats } = usePaymentRequestStats(organizationId);
  const {
    data: allRequests,
    isLoading: loadingRequests,
    refetch: refetchRequests,
  } = usePaymentRequests({ organization_id: organizationId });
  const { data: pendingRequests } = usePendingPaymentRequests(organizationId);
  const { mutate: createRequest, isPending: isCreating } = useCreatePaymentRequest();
  const { mutate: submitRequest } = useSubmitPaymentRequest();
  const { mutate: approveRequest, isPending: isApproving } = useApprovePaymentRequest();
  const { mutate: rejectRequest, isPending: isRejecting } = useRejectPaymentRequest();
  const { mutate: processRequest, isPending: isProcessing } = useProcessPaymentRequest();

  const requests = useMemo(() => allRequests?.results || [], [allRequests]);
  const pending = useMemo(() => pendingRequests?.results || [], [pendingRequests]);

  // Approvals queue: filter chips over the org's requests.
  const [statusFilter, setStatusFilter] = useState<string>('awaiting');
  const pendingIds = useMemo(() => new Set(pending.map((r) => r.id)), [pending]);

  const countBy = (status: PaymentRequestStatus) =>
    requests.filter((r) => r.status === status).length;

  const statusPills: StatusPill[] = [
    { value: 'awaiting', label: 'Awaiting me', count: pending.length, tone: 'warning' },
    { value: 'all', label: 'All', count: requests.length, tone: 'neutral' },
    { value: 'pending', label: 'Pending approval', count: countBy('pending'), tone: 'warning' },
    { value: 'approved', label: 'Approved', count: countBy('approved'), tone: 'info' },
    { value: 'processing', label: 'Processing', count: countBy('processing'), tone: 'info' },
    { value: 'completed', label: 'Completed', count: countBy('completed'), tone: 'success' },
    { value: 'rejected', label: 'Rejected', count: countBy('rejected'), tone: 'danger' },
    { value: 'failed', label: 'Failed', count: countBy('failed'), tone: 'danger' },
  ];

  const visibleRequests = useMemo(() => {
    if (statusFilter === 'awaiting') return pending;
    if (statusFilter === 'all') return requests;
    return requests.filter((r) => r.status === statusFilter);
  }, [statusFilter, requests, pending]);

  const validRows = useMemo(
    () => rows.filter((r) => r.phone.trim() && parseFloat(r.amount) > 0),
    [rows]
  );
  const singleValid = single.phone.trim().length > 0 && parseFloat(single.amount) > 0;

  const statsBarData = [
    {
      label: 'Pending approval',
      value: stats?.pending ?? 0,
      color: '#f59e0b',
      variant: (stats?.pending || 0) > 0 ? ('warning' as const) : ('default' as const),
    },
    {
      label: 'Pending amount',
      value: formatCurrency(parseFloat(stats?.total_pending_amount || '0'), currency),
      color: '#f59e0b',
    },
    { label: 'Approved', value: stats?.approved ?? 0, color: 'rgb(var(--brand-primary))' },
    { label: 'Completed', value: stats?.completed ?? 0, color: 'rgb(var(--brand-primary))' },
  ];

  const handleSingle = () => {
    if (!organizationId || !singleValid || !rails.ready) return;
    createRequest(
      {
        organization_id: organizationId,
        payment_type: 'single',
        payment_method: 'mobile_money',
        recipient_name: single.name,
        recipient_phone: single.phone.trim(),
        amount: parseFloat(single.amount),
        currency,
        description: single.description,
        ...(rails.railId ? { source_provider_account_id: rails.railId } : {}),
      },
      {
        onSuccess: (request) => {
          submitRequest(request.id);
          setSingle({ name: '', phone: '', amount: '', description: '' });
          setActiveTab('requests');
        },
      }
    );
  };

  const handleBulk = () => {
    if (!organizationId || validRows.length === 0 || !rails.ready) return;
    createRequest(
      {
        organization_id: organizationId,
        payment_type: 'bulk',
        payment_method: 'mobile_money',
        recipients: validRows.map((r) => ({
          name: r.name,
          phone: r.phone.trim(),
          amount: parseFloat(r.amount),
        })),
        currency,
        description: bulkDescription || `Bulk payment to ${validRows.length} recipients`,
        ...(rails.railId ? { source_provider_account_id: rails.railId } : {}),
      },
      {
        onSuccess: (request) => {
          submitRequest(request.id);
          setRows([]);
          setBulkDescription('');
          setActiveTab('requests');
        },
      }
    );
  };

  const submitReview = () => {
    if (!reviewing) return;
    if (reviewMode === 'approve') {
      approveRequest(
        { requestId: reviewing.id, notes: reviewNote },
        { onSuccess: () => closeReview() }
      );
    } else {
      if (!reviewNote.trim()) return;
      rejectRequest(
        { requestId: reviewing.id, reason: reviewNote },
        { onSuccess: () => closeReview() }
      );
    }
  };

  const closeReview = () => {
    setReviewing(null);
    setReviewNote('');
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Pay Out"
        subtitle="Send money to a single number, or disburse to many at once"
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Pay Out' }]}
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={loadingOrgs}
      />

      <StatsBar stats={statsBarData} />

      <PageContainer className="space-y-6">
        <RailSelector
          capability="payout"
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
          <TabsList className="grid w-full grid-cols-3 lg:w-[560px] bg-muted p-1">
            <TabsTrigger value="single" className="flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Single
            </TabsTrigger>
            <TabsTrigger value="bulk" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Bulk
            </TabsTrigger>
            <TabsTrigger value="requests" className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Approvals {pending.length > 0 ? `(${pending.length})` : ''}
            </TabsTrigger>
          </TabsList>

          {/* ---------------- Single ---------------- */}
          <TabsContent value="single">
            <ContentCard className="max-w-2xl">
              <div className="space-y-5">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Send to a number</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Goes for approval first — funds only move once it is approved.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-phone">
                      Phone number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="recipient-phone"
                      value={single.phone}
                      placeholder="256700000000"
                      onChange={(e) => setSingle({ ...single, phone: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-name">Recipient name</Label>
                    <Input
                      id="recipient-name"
                      value={single.name}
                      placeholder="Optional"
                      onChange={(e) => setSingle({ ...single, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="recipient-amount">
                      Amount ({currency}) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="recipient-amount"
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
                  <Label htmlFor="payout-description">Reason</Label>
                  <Textarea
                    id="payout-description"
                    rows={2}
                    value={single.description}
                    placeholder="e.g. Supplier payment for INV-1042"
                    onChange={(e) => setSingle({ ...single, description: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm text-muted-foreground">
                    {!rails.ready
                      ? 'Select a country and rail to continue'
                      : singleValid
                        ? `Sending ${formatCurrency(parseFloat(single.amount), currency)} via ${rails.rail?.provider_display}`
                        : 'Enter a phone number and amount'}
                  </p>
                  <Button onClick={handleSingle} disabled={!singleValid || !rails.ready || isCreating}>
                    {isCreating ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-1.5" />
                    )}
                    Submit for approval
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
                  <h2 className="text-base font-semibold text-foreground">Send to many numbers</h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    One approval covers the batch; each recipient is then paid individually.
                  </p>
                </div>

                <div className="space-y-1.5 max-w-md">
                  <Label htmlFor="bulk-payout-description">Reason</Label>
                  <Input
                    id="bulk-payout-description"
                    value={bulkDescription}
                    placeholder="e.g. March payroll"
                    onChange={(e) => setBulkDescription(e.target.value)}
                  />
                </div>

                <BulkPartyEditor
                  rows={rows}
                  onChange={setRows}
                  currency={currency}
                  partyLabel="Recipient"
                  emptyHint="Add a row, paste a list, or import a CSV of numbers to pay"
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
                      <Send className="h-4 w-4 mr-1.5" />
                    )}
                    Submit {validRows.length || 0}{' '}
                    {validRows.length === 1 ? 'payment' : 'payments'}
                  </Button>
                </div>
              </div>
            </ContentCard>
          </TabsContent>

          {/* ---------------- Requests ---------------- */}
          <TabsContent value="requests" className="space-y-4">
            <ContentCard>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <StatusPills
                  pills={statusPills}
                  value={statusFilter}
                  onChange={setStatusFilter}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={loadingRequests}
                  onClick={() => refetchRequests()}
                >
                  <RefreshCw
                    className={`h-3.5 w-3.5 mr-1.5 ${loadingRequests ? 'animate-spin' : ''}`}
                  />
                  Refresh
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                {statusFilter === 'awaiting'
                  ? 'Payments submitted by others that need your approval. You cannot approve your own.'
                  : 'Statuses past “approved” are driven by the provider — webhooks settle them as they land.'}
              </p>
            </ContentCard>

            {loadingRequests ? (
              <ContentCard>
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              </ContentCard>
            ) : visibleRequests.length === 0 ? (
              <ContentCard>
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <ClipboardCheck className="h-6 w-6 text-muted-foreground/60" />
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {statusFilter === 'awaiting'
                      ? 'Nothing waiting on you'
                      : 'No payments with this status'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {statusFilter === 'awaiting'
                      ? 'Approvals you are asked for will appear here'
                      : 'Try another status'}
                  </p>
                </div>
              </ContentCard>
            ) : (
              <div className="space-y-3 animate-stagger">
                {visibleRequests.map((request) => (
                  <PayoutRow
                    key={request.id}
                    request={request}
                    currency={currency}
                    actions={
                      pendingIds.has(request.id) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive"
                            onClick={() => {
                              setReviewing(request);
                              setReviewMode('reject');
                            }}
                          >
                            <XCircle className="h-3.5 w-3.5 mr-1.5" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              setReviewing(request);
                              setReviewMode('approve');
                            }}
                          >
                            <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                            Approve
                          </Button>
                        </>
                      ) : request.status === 'approved' ? (
                        <Button
                          size="sm"
                          disabled={isProcessing}
                          onClick={() => processRequest(request.id)}
                        >
                          <Send className="h-3.5 w-3.5 mr-1.5" />
                          Process
                        </Button>
                      ) : null
                    }
                  />
                ))}
              </div>
            )}
          </TabsContent>

        </Tabs>
      </PageContainer>

      {/* Approve / reject */}
      <Dialog open={!!reviewing} onOpenChange={(open) => !open && closeReview()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewMode === 'approve' ? 'Approve payment' : 'Reject payment'}
            </DialogTitle>
            <DialogDescription>
              {reviewing &&
                `${formatCurrency(parseFloat(reviewing.amount), reviewing.currency)} to ${
                  reviewing.payment_type === 'bulk'
                    ? `${reviewing.total_recipients} recipients`
                    : reviewing.recipient_name || reviewing.recipient_phone
                }`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="review-note">
              {reviewMode === 'approve' ? 'Notes (optional)' : 'Reason'}
              {reviewMode === 'reject' && <span className="text-destructive"> *</span>}
            </Label>
            <Textarea
              id="review-note"
              rows={3}
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder={
                reviewMode === 'approve' ? 'Add a note for the audit trail' : 'Why is this rejected?'
              }
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeReview}>
              Cancel
            </Button>
            <Button
              variant={reviewMode === 'reject' ? 'destructive' : 'primary'}
              disabled={
                isApproving || isRejecting || (reviewMode === 'reject' && !reviewNote.trim())
              }
              onClick={submitReview}
            >
              {(isApproving || isRejecting) && (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              )}
              {reviewMode === 'approve' ? 'Approve' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PayoutRow({
  request,
  currency,
  actions,
}: {
  request: PaymentRequest;
  currency: string;
  actions?: React.ReactNode;
}) {
  const badge = STATUS_BADGE_MAP[request.status] || { status: 'draft', label: request.status };

  return (
    <ContentCard>
      <div className="flex items-center gap-4">
        <div className="w-9 h-9 rounded-full bg-primary/5 flex items-center justify-center shrink-0">
          <ArrowUpRight className="h-4 w-4 text-primary" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground truncate">
              {request.payment_type === 'bulk'
                ? `${request.total_recipients} recipients`
                : request.recipient_name || request.recipient_phone}
            </span>
            <StatusBadge status={badge.status} label={badge.label} size="sm" />
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {request.description || request.payment_method_display}
            {request.created_by_name ? ` · by ${request.created_by_name}` : ''}
          </p>
          {request.processing_error && (
            <p className="text-xs text-destructive mt-0.5 truncate">{request.processing_error}</p>
          )}
        </div>

        <div className="text-sm font-semibold text-foreground shrink-0">
          {formatCurrency(parseFloat(request.amount), request.currency || currency)}
        </div>

        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </ContentCard>
  );
}
