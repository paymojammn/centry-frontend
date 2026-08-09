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
import { StatCard } from '@/components/layout/stat-card';
import { ContentCard } from '@/components/layout/content-card';
import { StatusBadge } from '@/components/ui/status-badge';
import {
  BulkPartyEditor,
  createPartyRow,
  type PartyRow,
} from '@/components/payments/bulk-party-editor';
import {
  PageTabs,
  StatusPills,
  TableState,
  type StatusPill,
} from '@/components/payments/status-pills';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { paymentRequestsApi } from '@/lib/payment-requests-api';
import { paymentRequestKeys } from '@/hooks/use-payment-requests';
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
import { PILL_COLORS, formatCompactNumber } from '@/lib/theme';
import {
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
  const queryClient = useQueryClient();

  const requests = useMemo(() => allRequests?.results || [], [allRequests]);
  const pending = useMemo(() => pendingRequests?.results || [], [pendingRequests]);

  // Approvals queue: filter chips over the org's requests.
  const [statusFilter, setStatusFilter] = useState<string>('awaiting');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkApproving, setIsBulkApproving] = useState(false);
  const pendingIds = useMemo(() => new Set(pending.map((r) => r.id)), [pending]);

  const countBy = (status: PaymentRequestStatus) =>
    requests.filter((r) => r.status === status).length;

  const statusPills: StatusPill[] = [
    { value: 'all', label: 'All', count: requests.length },
    {
      value: 'awaiting',
      label: 'Awaiting me',
      count: pending.length,
      color: PILL_COLORS.awaiting_approval,
    },
    { value: 'pending', label: 'Pending Approval', count: countBy('pending'), color: PILL_COLORS.pending_approval },
    { value: 'approved', label: 'Approved', count: countBy('approved'), color: PILL_COLORS.accepted },
    { value: 'processing', label: 'Processing', count: countBy('processing') },
    { value: 'completed', label: 'Completed', count: countBy('completed'), color: PILL_COLORS.paid },
    { value: 'rejected', label: 'Rejected', count: countBy('rejected'), color: PILL_COLORS.failed },
    { value: 'failed', label: 'Failed', count: countBy('failed') },
  ];

  const visibleRequests = useMemo(() => {
    const base =
      statusFilter === 'awaiting'
        ? pending
        : statusFilter === 'all'
          ? requests
          : requests.filter((r) => r.status === statusFilter);

    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter((r) =>
      [r.recipient_name, r.recipient_phone, r.description, r.payment_reference]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(q))
    );
  }, [statusFilter, requests, pending, search]);

  const validRows = useMemo(
    () => rows.filter((r) => r.phone.trim() && parseFloat(r.amount) > 0),
    [rows]
  );
  const singleValid = single.phone.trim().length > 0 && parseFloat(single.amount) > 0;


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

  // Only requests awaiting *this* user can be approved — the backend rejects
  // self-approval, so offering a checkbox on those rows would invite a failure.
  const selectableIds = useMemo(
    () => visibleRequests.filter((r) => pendingIds.has(r.id)).map((r) => r.id),
    [visibleRequests, pendingIds]
  );
  const selectedSelectable = selectableIds.filter((id) => selectedIds.has(id));
  const allSelected = selectableIds.length > 0 && selectedSelectable.length === selectableIds.length;
  const someSelected = selectedSelectable.length > 0 && !allSelected;

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  /** Approve every selected request, one call each, reporting the tally. */
  const approveSelected = async () => {
    if (!selectedSelectable.length) return;
    setIsBulkApproving(true);
    let approved = 0;
    const failures: string[] = [];

    // Sequential rather than parallel: each approval is a money decision and
    // the backend locks the row, so a burst would just contend.
    for (const id of selectedSelectable) {
      try {
        await paymentRequestsApi.approveRequest(id, 'Bulk approved');
        approved += 1;
      } catch (error: any) {
        failures.push(error?.message || 'failed');
      }
    }

    setIsBulkApproving(false);
    setSelectedIds(new Set());
    queryClient.invalidateQueries({ queryKey: paymentRequestKeys.all });

    if (approved) {
      toast.success(`Approved ${approved} payment${approved === 1 ? '' : 's'}`);
    }
    if (failures.length) {
      toast.error(`${failures.length} could not be approved — ${failures[0]}`);
    }
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
      >
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetchRequests()}
          disabled={loadingRequests}
          className="h-9 btn-press"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loadingRequests ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      <PageTabs
        tabs={[
          { value: 'single', label: 'Single' },
          { value: 'bulk', label: 'Bulk' },
          { value: 'requests', label: 'Approvals' },
        ]}
        value={activeTab}
        onChange={setActiveTab}
      />

      <PageContainer className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard
            label="Awaiting Approval"
            value={stats?.pending ?? 0}
            subtext={`${currency} ${formatCompactNumber(parseFloat(stats?.total_pending_amount || '0'))}`}
            icon={ClipboardCheck}
            variant={(stats?.pending || 0) > 0 ? 'warning' : 'default'}
          />
          <StatCard
            label="Approved"
            value={stats?.approved ?? 0}
            subtext="Ready to process"
            icon={CheckCircle}
            variant="accent"
          />
          <StatCard
            label="Completed"
            value={stats?.completed ?? 0}
            subtext="Settled by the provider"
            icon={Send}
            variant="accent"
          />
          <StatCard
            label="Selected"
            value={selectedSelectable.length}
            icon={CheckCircle}
            variant="accent"
          >
            {selectedSelectable.length > 0 ? (
              <Button
                onClick={approveSelected}
                disabled={isBulkApproving}
                size="sm"
                className="w-full text-white btn-press hover:opacity-90"
                style={{ backgroundColor: 'var(--foreground)' }}
              >
                {isBulkApproving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve Selected
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                {selectableIds.length > 0
                  ? 'Select payments to approve'
                  : 'Nothing awaiting your approval'}
              </p>
            )}
          </StatCard>
        </div>

        {activeTab === 'single' && (
          <ContentCard className="max-w-2xl animate-fade-in">
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Send to a number</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Goes for approval first — funds only move once it is approved.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <RailSelector
                  capability="payout"
                  countries={rails.countries}
                  countryCode={rails.countryCode}
                  onCountryChange={rails.setCountryCode}
                  railId={rails.railId}
                  onRailChange={rails.setRailId}
                  country={rails.country}
                  rail={rails.rail}
                  isLoading={rails.isLoading}
                />
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
        )}

        {activeTab === 'bulk' && (
          <ContentCard className="animate-fade-in">
            <div className="space-y-5">
              <div>
                <h2 className="text-base font-semibold text-foreground">Send to many numbers</h2>
                <p className="text-sm text-muted-foreground mt-0.5">
                  One approval covers the batch; each recipient is then paid individually.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <RailSelector
                  capability="payout"
                  countries={rails.countries}
                  countryCode={rails.countryCode}
                  onCountryChange={rails.setCountryCode}
                  railId={rails.railId}
                  onRailChange={rails.setRailId}
                  country={rails.country}
                  rail={rails.rail}
                  isLoading={rails.isLoading}
                />
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="bulk-payout-description">Reason</Label>
                  <Input
                    id="bulk-payout-description"
                    value={bulkDescription}
                    placeholder="e.g. March payroll"
                    onChange={(e) => setBulkDescription(e.target.value)}
                  />
                </div>
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
        )}

        {activeTab === 'requests' && (
          <ContentCard noPadding className="animate-fade-in">
            <StatusPills
              pills={statusPills}
              value={statusFilter}
              onChange={setStatusFilter}
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder="Search recipients, references..."
            />

            {loadingRequests ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
              </div>
            ) : visibleRequests.length === 0 ? (
              <TableState
                icon={ClipboardCheck}
                title={
                  search
                    ? 'No payments match your search'
                    : statusFilter === 'awaiting'
                      ? 'Nothing waiting on you'
                      : 'No payments with this status'
                }
                hint={
                  search
                    ? 'Try a different search term'
                    : statusFilter === 'awaiting'
                      ? 'Approvals you are asked for will appear here'
                      : 'Try another status'
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full table-professional">
                  <thead>
                    <tr>
                      <th className="w-10">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          ref={(input) => {
                            if (input) input.indeterminate = someSelected;
                          }}
                          onChange={toggleAll}
                          disabled={selectableIds.length === 0}
                          className="w-4 h-4 rounded border-border text-foreground focus:ring-ring disabled:opacity-50"
                        />
                      </th>
                      <th>Recipient</th>
                      <th>Reason</th>
                      <th>Requested by</th>
                      <th className="cell-currency">Ccy</th>
                      <th className="text-right">Amount</th>
                      <th>Status</th>
                      <th className="text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRequests.map((request) => (
                      <PayoutRow
                        key={request.id}
                        request={request}
                        awaitingMe={pendingIds.has(request.id)}
                        selected={selectedIds.has(request.id)}
                        onToggleSelect={() => toggleOne(request.id)}
                        isProcessing={isProcessing}
                        onApprove={() => {
                          setReviewing(request);
                          setReviewMode('approve');
                        }}
                        onReject={() => {
                          setReviewing(request);
                          setReviewMode('reject');
                        }}
                        onProcess={() => processRequest(request.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </ContentCard>
        )}
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
  awaitingMe,
  selected,
  onToggleSelect,
  isProcessing,
  onApprove,
  onReject,
  onProcess,
}: {
  request: PaymentRequest;
  awaitingMe: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  isProcessing: boolean;
  onApprove: () => void;
  onReject: () => void;
  onProcess: () => void;
}) {
  const badge = STATUS_BADGE_MAP[request.status] || { status: 'draft', label: request.status };
  const recipient =
    request.payment_type === 'bulk'
      ? `${request.total_recipients} recipients`
      : request.recipient_name || request.recipient_phone || '—';

  return (
    <tr>
      <td onClick={(e) => e.stopPropagation()}>
        {awaitingMe ? (
          <input
            type="checkbox"
            checked={selected}
            onChange={onToggleSelect}
            className="w-4 h-4 rounded border-border text-foreground focus:ring-ring"
          />
        ) : (
          // Placeholder keeps the column aligned; only rows awaiting this
          // user can be approved, so the rest are not selectable.
          <div className="w-4 h-4 rounded border border-border bg-muted" />
        )}
      </td>
      <td>
        <div className="flex items-center gap-2">
          <span className="font-medium text-foreground">{recipient}</span>
          {request.payment_type === 'bulk' && (
            <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
          )}
        </div>
        {request.payment_type !== 'bulk' && request.recipient_name && request.recipient_phone && (
          <div className="text-xs text-muted-foreground">{request.recipient_phone}</div>
        )}
      </td>
      <td>
        <span className="text-muted-foreground">
          {request.description || request.payment_method_display}
        </span>
        {request.processing_error && (
          <div className="text-xs text-destructive truncate max-w-[220px]">
            {request.processing_error}
          </div>
        )}
      </td>
      <td className="text-muted-foreground">{request.created_by_name || '—'}</td>
      <td className="cell-currency">{request.currency}</td>
      <td className="text-right font-medium tabular-nums">
        {formatCurrency(parseFloat(request.amount), request.currency)}
      </td>
      <td>
        <StatusBadge status={badge.status} label={badge.label} size="sm" />
      </td>
      <td className="text-right">
        {awaitingMe ? (
          <div className="flex items-center justify-end gap-1.5">
            <Button size="sm" variant="outline" className="text-destructive" onClick={onReject}>
              <XCircle className="h-3.5 w-3.5 mr-1" />
              Reject
            </Button>
            <Button size="sm" onClick={onApprove}>
              <CheckCircle className="h-3.5 w-3.5 mr-1" />
              Approve
            </Button>
          </div>
        ) : request.status === 'approved' ? (
          <Button size="sm" disabled={isProcessing} onClick={onProcess}>
            <Send className="h-3.5 w-3.5 mr-1" />
            Process
          </Button>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        )}
      </td>
    </tr>
  );
}
