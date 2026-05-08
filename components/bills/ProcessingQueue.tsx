/**
 * Processing Queue Component
 *
 * Displays payments in various stages of the approval workflow:
 * - PENDING_APPROVAL: Awaiting approval from another user
 * - PROCESSING: Approved, ready for file generation
 * - PENDING: File generated, sent to bank
 * - SENT_PAYMENT/SUCCESS_PAYMENT/FAILED_PAYMENT: Final states
 *
 * Color Scheme:
 * - #6B8FB8 Blue - Draft
 * - #fed652 Mustard – Awaiting Approval
 * - #f77f00 Orange – Awaiting Payment
 * - #5C8A65 Green – Paid
 * - #bec3c6 Grey - Repeating
 */

'use client';

import { useState, useMemo } from 'react';
import {
  usePaymentEvents,
  usePaymentEventStats,
  useApprovePayments,
  useRejectPayments,
  useGeneratePaymentFile,
  useSendProviderPayout,
  useDenyPayments,
  useReversePayment,
} from '@/hooks/use-bills';
import { useBankAccounts } from '@/hooks/use-banking';
import { useHasPermission } from '@/hooks/use-user';
import type { PaymentEvent, PaymentEventStatus } from '@/types/bill';
import {
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Building2,
  Phone,
  CreditCard,
  Banknote,
  Check,
  X,
  FileDown,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Ban,
  ThumbsDown,
  RotateCcw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

// Status color constants (matching bills page)
const STATUS_COLORS = {
  pending_approval: { bg: '#fed652', text: '#7a5c00', light: '#FFF9E5' },
  processing: { bg: '#6B8FB8', text: '#ffffff', light: '#E8F2FA' },
  pending: { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7' },
  sent: { bg: '#f77f00', text: '#ffffff', light: '#FFF0E5' },
  success: { bg: '#5C8A65', text: '#ffffff', light: '#E8F5E5' },
  failed: { bg: '#dc2626', text: '#ffffff', light: '#FEE2E2' },
} as const;

interface ProcessingQueueProps {
  organizationId: string | null;
}

export default function ProcessingQueue({ organizationId }: ProcessingQueueProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentEventStatus | 'all'>('all');
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [isReverseDialogOpen, setIsReverseDialogOpen] = useState(false);
  const [reverseTarget, setReverseTarget] = useState<PaymentEvent | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [reverseReason, setReverseReason] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
  const [selectedFileFormat, setSelectedFileFormat] = useState<'csv' | 'xml'>('xml');

  // Permission checks (must be before data hooks that depend on them)
  const hasApprovePermission = useHasPermission('payments.approve');
  const hasExportPermission = useHasPermission('payments.export');
  const hasAnyActionPermission = hasApprovePermission || hasExportPermission;

  const filters = {
    organization: organizationId || undefined,
    direction: 'OUT' as const,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: paymentsResponse, isLoading, error, refetch } = usePaymentEvents(filters);
  const { data: stats } = usePaymentEventStats(organizationId || undefined);
  // Only fetch bank accounts if user can generate files (avoids 403 for users without banking.view)
  const { data: bankAccountsData } = useBankAccounts(
    hasExportPermission ? (organizationId || undefined) : undefined
  );

  const approvePayments = useApprovePayments();
  const rejectPayments = useRejectPayments();
  const generateFile = useGeneratePaymentFile();
  const sendProviderPayout = useSendProviderPayout();
  const denyPayments = useDenyPayments();
  const reversePayment = useReversePayment();

  const payments = Array.isArray(paymentsResponse)
    ? paymentsResponse
    : (paymentsResponse as any)?.results || [];

  const bankAccounts = Array.isArray(bankAccountsData)
    ? bankAccountsData
    : (bankAccountsData as any)?.results || [];

  // Get selected payments data
  const selectedPaymentsData = useMemo(() => {
    return payments.filter((p: PaymentEvent) => selectedPayments.has(p.id));
  }, [payments, selectedPayments]);

  // Check if all selected are PENDING_APPROVAL + user has approve permission
  const canApprove = hasApprovePermission && selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) => p.provider_status === 'PENDING_APPROVAL');

  // Check if all selected are PROCESSING + user has export permission
  const canGenerateFile = hasExportPermission && selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) => p.provider_status === 'PROCESSING');

  // Did the user already pick a source when paying these bills? If every selected
  // event agrees on source_bank_account, skip the picker and use that directly.
  const consensusSourceBankAccountId: number | null = useMemo(() => {
    if (!canGenerateFile) return null;
    const sources = new Set(
      selectedPaymentsData
        .map((p: PaymentEvent) => p.source_bank_account)
        .filter((id): id is number => typeof id === 'number')
    );
    return sources.size === 1 && sources.size === selectedPaymentsData.length
      ? Array.from(sources)[0]
      : null;
  }, [canGenerateFile, selectedPaymentsData]);

  // Check if selected PROCESSING payments are provider payouts (Ozow, Paystack, etc.)
  const isProviderPayout = canGenerateFile &&
    selectedPaymentsData.every((p: PaymentEvent) =>
      p.method?.endsWith('_payout') || ['ozow_payout', 'paystack_payout', 'netcash_payout'].includes(p.method || '')
    );

  // Check if all selected can be denied (PENDING_APPROVAL or PROCESSING status) + user has approve permission
  const canDeny = hasApprovePermission && selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) =>
      p.provider_status === 'PENDING_APPROVAL' || p.provider_status === 'PROCESSING'
    );

  const handleApprove = async () => {
    if (!canApprove) return;
    try {
      const result = await approvePayments.mutateAsync(Array.from(selectedPayments));
      const failed = result.results?.filter((r: { success: boolean; error?: string }) => !r.success) || [];
      if (failed.length > 0) {
        const errors = failed.map((f: { error?: string }) => f.error).join('\n');
        alert(errors);
        return;
      }
      setSelectedPayments(new Set());
    } catch (error: any) {
      alert(error?.message || 'Failed to approve payments. You may not have permission.');
    }
  };

  const handleReject = async () => {
    if (!canApprove) return;
    try {
      const result = await rejectPayments.mutateAsync({
        ids: Array.from(selectedPayments),
        reason: rejectionReason,
      });
      const failed = result.results?.filter((r: { success: boolean; error?: string }) => !r.success) || [];
      if (failed.length > 0) {
        const errors = failed.map((f: { error?: string }) => f.error).join('\n');
        alert(errors);
        return;
      }
      setSelectedPayments(new Set());
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error: any) {
      alert(error?.message || 'Failed to reject payments. You may not have permission.');
    }
  };

  const handleGenerateFile = async (overrideSourceId?: number) => {
    if (!canGenerateFile) return;
    const sourceId = overrideSourceId ?? selectedBankAccountId;
    if (!sourceId) return;
    try {
      const result = await generateFile.mutateAsync({
        paymentEventIds: Array.from(selectedPayments),
        sourceBankAccountId: sourceId,
        fileFormat: selectedFileFormat,
      });
      setSelectedPayments(new Set());
      setIsGenerateDialogOpen(false);
      alert(`Payment file generated: ${result.filename}\nPayments: ${result.payment_count}\nTotal: ${result.total_amount}`);
    } catch (error: any) {
      alert(error?.message || 'Failed to generate file. You may not have permission.');
    }
  };

  // Click on "Generate File": if the source was already chosen at bill-payment time
  // (consensus across all selected events), skip the picker. Otherwise open the dialog
  // so the user can resolve mixed/missing sources.
  const handleGenerateFileClick = () => {
    if (consensusSourceBankAccountId) {
      handleGenerateFile(consensusSourceBankAccountId);
    } else {
      setIsGenerateDialogOpen(true);
    }
  };

  const handleSendProviderPayout = async () => {
    if (!isProviderPayout) return;
    try {
      const result = await sendProviderPayout.mutateAsync(Array.from(selectedPayments));
      const results: any[] = result.results || [];
      const failed = results.filter((r) => !r.success);
      const successful = results.filter((r) => r.success);

      if (failed.length > 0) {
        // Show each rejection with the per-event reason. Sonner renders
        // multi-line descriptions cleanly and keeps the toast on screen long
        // enough to copy the error (e.g. Ozow "Payout amount below minimum").
        const description = failed
          .map((f) => `Payment #${f.id}: ${f.error || 'Unknown error'}`)
          .join('\n');
        toast.error(
          `${failed.length} payout${failed.length > 1 ? 's' : ''} failed${
            successful.length ? ` (${successful.length} succeeded)` : ''
          }`,
          { description, duration: 12000 },
        );
      } else if (successful.length > 0) {
        toast.success(`${successful.length} payout${successful.length > 1 ? 's' : ''} sent`);
      }
      setSelectedPayments(new Set());
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send payout');
    }
  };

  const handleDeny = async () => {
    if (!canDeny) return;
    try {
      await denyPayments.mutateAsync({
        ids: Array.from(selectedPayments),
        reason: denyReason,
      });
      setSelectedPayments(new Set());
      setIsDenyDialogOpen(false);
      setDenyReason('');
    } catch (error: any) {
      alert(error?.message || 'Failed to deny payments. You may not have permission.');
    }
  };

  const openReverseDialog = (payment: PaymentEvent) => {
    setReverseTarget(payment);
    setReverseReason('');
    setIsReverseDialogOpen(true);
  };

  const handleReverse = async () => {
    if (!reverseTarget || !reverseReason.trim()) return;
    try {
      await reversePayment.mutateAsync({
        id: reverseTarget.id,
        reason: reverseReason.trim(),
      });
      setIsReverseDialogOpen(false);
      setReverseTarget(null);
      setReverseReason('');
    } catch (error: any) {
      alert(
        error?.message
          || 'Failed to reverse payment. You may not have permission, or the payment cannot be reversed from its current state.'
      );
    }
  };

  const togglePaymentSelection = (id: number) => {
    setSelectedPayments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const selectAllByStatus = (status: PaymentEventStatus) => {
    const matching = payments.filter((p: PaymentEvent) => p.provider_status === status);
    setSelectedPayments(new Set(matching.map((p: PaymentEvent) => p.id)));
  };

  const getStatusIcon = (status: PaymentEventStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case 'PROCESSING':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'SENT_PAYMENT':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'SUCCESS_PAYMENT':
        return <CheckCircle2 className="h-4 w-4 text-primary" />;
      case 'FAILED_PAYMENT':
      case 'ERROR_PAYMENT':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'REJECTED':
        return <ThumbsDown className="h-4 w-4 text-destructive" />;
      case 'REVERSED':
        return <RotateCcw className="h-4 w-4 text-muted-foreground" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: PaymentEventStatus) => {
    const statusMap: Record<string, { bg: string; text: string; label: string }> = {
      PENDING_APPROVAL: { ...STATUS_COLORS.pending_approval, label: 'Pending Approval' },
      PROCESSING: { ...STATUS_COLORS.processing, label: 'Ready for File' },
      PENDING: { ...STATUS_COLORS.pending, label: 'File Generated' },
      SENT_PAYMENT: { ...STATUS_COLORS.sent, label: 'Processing' },
      SUCCESS_PAYMENT: { ...STATUS_COLORS.success, label: 'Successful' },
      FAILED_PAYMENT: { ...STATUS_COLORS.failed, label: 'Failed' },
      ERROR_PAYMENT: { ...STATUS_COLORS.failed, label: 'Error' },
      REJECTED: { ...STATUS_COLORS.failed, label: 'Rejected' },
      REVERSED: { ...STATUS_COLORS.pending, label: 'Reversed' },
    };

    const config = statusMap[status] || { ...STATUS_COLORS.pending, label: status };

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-medium"
        style={{ backgroundColor: config.light, color: config.bg !== '#bec3c6' ? config.bg : config.text }}
      >
        {config.label}
      </span>
    );
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'mtn_momo':
      case 'airtel_momo':
        return <Phone className="h-4 w-4" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />;
      case 'ozow_payout':
      case 'paystack_payout':
      case 'netcash_payout':
        return <CreditCard className="h-4 w-4" />;
      case 'card':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Banknote className="h-4 w-4" />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return '??';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };


  if (isLoading) {
    return <ProcessingQueueSkeleton />;
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="p-4 bg-destructive/5 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
          <XCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground mb-2">Error Loading Queue</h3>
        <p className="text-muted-foreground text-sm mb-4">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Row - Compact inline pills */}
      {stats && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-6 flex-wrap">
          <button
            onClick={() => { setStatusFilter('PENDING_APPROVAL'); selectAllByStatus('PENDING_APPROVAL'); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.pending_approval.bg }}
            />
            <span className="text-sm text-muted-foreground">Pending Approval</span>
            <span className="text-sm font-semibold text-foreground">{stats.pending_approval}</span>
          </button>

          <button
            onClick={() => { setStatusFilter('PROCESSING'); selectAllByStatus('PROCESSING'); }}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.processing.bg }}
            />
            <span className="text-sm text-muted-foreground">Ready for File</span>
            <span className="text-sm font-semibold text-foreground">{stats.processing}</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.pending.bg }}
            />
            <span className="text-sm text-muted-foreground">File Sent</span>
            <span className="text-sm font-semibold text-foreground">{stats.pending}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.sent.bg }}
            />
            <span className="text-sm text-muted-foreground">Processing</span>
            <span className="text-sm font-semibold text-foreground">{stats.sent}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.success.bg }}
            />
            <span className="text-sm text-muted-foreground">Successful</span>
            <span className="text-sm font-semibold text-foreground">{stats.success}</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: STATUS_COLORS.failed.bg }}
            />
            <span className="text-sm text-muted-foreground">Failed</span>
            <span className="text-sm font-semibold text-foreground">{(stats.failed || 0) + (stats.rejected || 0)}</span>
          </div>
        </div>
      )}

      {/* Toolbar - Clean horizontal layout */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        {/* Left: Filter and Refresh */}
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as PaymentEventStatus | 'all')}
          >
            <SelectTrigger className="w-[160px] h-9 bg-card border-border text-sm">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING_APPROVAL">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.pending_approval.bg }} />
                  Pending Approval
                </span>
              </SelectItem>
              <SelectItem value="PROCESSING">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.processing.bg }} />
                  Ready for File
                </span>
              </SelectItem>
              <SelectItem value="PENDING">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.pending.bg }} />
                  File Sent
                </span>
              </SelectItem>
              <SelectItem value="SENT_PAYMENT">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.sent.bg }} />
                  Processing
                </span>
              </SelectItem>
              <SelectItem value="SUCCESS_PAYMENT">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.success.bg }} />
                  Successful
                </span>
              </SelectItem>
              <SelectItem value="FAILED_PAYMENT">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.failed.bg }} />
                  Failed
                </span>
              </SelectItem>
              <SelectItem value="REJECTED">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.failed.bg }} />
                  Rejected
                </span>
              </SelectItem>
              <SelectItem value="REVERSED">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS_COLORS.pending.bg }} />
                  Reversed
                </span>
              </SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="ghost" size="sm" className="h-9 px-2">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Right: Action Buttons - Grouped together */}
        <div className="flex items-center gap-2">
          {selectedPayments.size > 0 && (
            <span className="text-sm text-muted-foreground mr-2">{selectedPayments.size} selected</span>
          )}

          {canApprove && (
            <>
              <Button
                onClick={handleApprove}
                disabled={approvePayments.isPending}
                size="sm"
                className="h-8 text-white"
                style={{ backgroundColor: STATUS_COLORS.success.bg }}
              >
                {approvePayments.isPending ? (
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1.5" />
                )}
                Approve
              </Button>
              <Button
                onClick={() => setIsRejectDialogOpen(true)}
                size="sm"
                className="h-8 text-white"
                style={{ backgroundColor: STATUS_COLORS.failed.bg }}
              >
                <X className="h-4 w-4 mr-1.5" />
                Reject
              </Button>
            </>
          )}

          {canGenerateFile && !isProviderPayout && (
            <Button
              onClick={handleGenerateFileClick}
              disabled={generateFile.isPending}
              size="sm"
              className="h-8 text-white"
              style={{ backgroundColor: STATUS_COLORS.processing.bg }}
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              Generate File
            </Button>
          )}

          {isProviderPayout && (
            <Button
              onClick={handleSendProviderPayout}
              disabled={sendProviderPayout.isPending}
              size="sm"
              className="h-8 text-white"
              style={{ backgroundColor: STATUS_COLORS.success.bg }}
            >
              {sendProviderPayout.isPending ? (
                <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Sending...</>
              ) : (
                <><Send className="h-4 w-4 mr-1.5" /> Send Payment</>
              )}
            </Button>
          )}

          {canDeny && !canApprove && !canGenerateFile && (
            <Button
              onClick={() => setIsDenyDialogOpen(true)}
              variant="outline"
              size="sm"
              className="h-8"
              style={{ borderColor: STATUS_COLORS.sent.bg, color: STATUS_COLORS.sent.bg }}
            >
              <Ban className="h-4 w-4 mr-1.5" />
              Deny
            </Button>
          )}

          {selectedPayments.size > 0 && (
            <Button
              onClick={() => setSelectedPayments(new Set())}
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Payments List */}
      {!payments || payments.length === 0 ? (
        <div className="py-16 text-center">
          <Send className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-medium text-foreground">No Payments in Queue</p>
          <p className="text-sm text-muted-foreground mt-1">
            {statusFilter !== 'all'
              ? 'No payments with this status. Try a different filter.'
              : 'Payments you initiate will appear here for tracking.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted">
                {hasAnyActionPermission && (
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={payments.length > 0 && selectedPayments.size === payments.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments(new Set(payments.map((p: PaymentEvent) => p.id)));
                        } else {
                          setSelectedPayments(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Vendor</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Bill</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Method</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Created</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {payments.map((payment: PaymentEvent) => (
                <tr
                  key={payment.id}
                  className={`transition-colors ${
                    hasAnyActionPermission ? 'cursor-pointer' : ''
                  } ${
                    selectedPayments.has(payment.id) ? 'bg-primary/5' : 'hover:bg-muted'
                  }`}
                  onClick={() => hasAnyActionPermission && togglePaymentSelection(payment.id)}
                >
                  {hasAnyActionPermission && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedPayments.has(payment.id)}
                      onChange={() => togglePaymentSelection(payment.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                        {getInitials(payment.vendor_name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {payment.vendor_name || 'Unknown Vendor'}
                        </div>
                        {payment.account_name && (
                          <div className="text-xs text-muted-foreground">{payment.account_name}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-foreground">{payment.bill_number || '-'}</div>
                    {payment.bill_reference && (
                      <div className="text-xs text-muted-foreground">{payment.bill_reference}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    <div className="text-sm font-medium text-foreground">
                      {payment.currency}{' '}
                      {parseFloat(payment.amount).toLocaleString(undefined, {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      })}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-muted rounded">
                        {getMethodIcon(payment.method)}
                      </span>
                      <div>
                        <div className="text-sm text-foreground">{payment.method_display}</div>
                        {payment.phone_number && (
                          <div className="text-xs text-muted-foreground">{payment.phone_number}</div>
                        )}
                        {payment.account_number && (
                          <div className="text-xs text-muted-foreground">
                            {payment.bank_name_display ? `${payment.bank_name_display} - ` : ''}
                            {payment.account_number}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {getStatusBadge(payment.provider_status)}
                    {payment.rejection_reason && (
                      <div className="text-xs text-destructive mt-1 max-w-[120px] truncate" title={payment.rejection_reason}>
                        {payment.rejection_reason}
                      </div>
                    )}
                    {payment.bank_status_description && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate" title={payment.bank_status_description}>
                        {payment.bank_status_code ? `${payment.bank_status_code}: ` : ''}
                        {payment.bank_status_description}
                      </div>
                    )}
                    {payment.retry_of && (
                      <div className="text-xs text-amber-600 mt-1">
                        Retry #{payment.retry_count} of #{payment.retry_of}
                      </div>
                    )}
                    {payment.reversal_reason && (
                      <div className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate" title={payment.reversal_reason}>
                        Reversed: {payment.reversal_reason}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-muted-foreground">{formatDate(payment.created_at)}</div>
                    {payment.created_by_name && (
                      <div className="text-xs text-muted-foreground">by {payment.created_by_name}</div>
                    )}
                    {payment.approved_by_name && (
                      <div className="text-xs" style={{ color: STATUS_COLORS.success.bg }}>
                        Approved by {payment.approved_by_name}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-right">
                    {hasApprovePermission && payment.provider_status !== 'REVERSED' && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openReverseDialog(payment);
                        }}
                        className="h-7 px-2 text-xs"
                        title="Reverse this payment — restores the bill to payable status"
                      >
                        <RotateCcw className="h-3 w-3 mr-1" />
                        Reverse
                      </Button>
                    )}
                    {payment.provider_status === 'REVERSED' && (
                      <span className="text-[11px] text-muted-foreground">Reversed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Payments</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedPayments.size} payment(s)?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason (optional)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReject}
              disabled={rejectPayments.isPending}
              className="text-white"
              style={{ backgroundColor: STATUS_COLORS.failed.bg }}
            >
              {rejectPayments.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <X className="h-4 w-4 mr-1.5" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate File Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Payment File</DialogTitle>
            <DialogDescription>
              Generate a payment file for {selectedPayments.size} approved payment(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Source Bank Account
              </label>
              <Select
                value={selectedBankAccountId?.toString() || ''}
                onValueChange={(val) => setSelectedBankAccountId(parseInt(val))}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select bank account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_name} - {account.bank_name || account.bank_provider?.name}
                      {account.currency && ` (${account.currency})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                File Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFileFormat('xml')}
                  className={`p-3 border rounded-lg transition-all text-left ${
                    selectedFileFormat === 'xml'
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="font-medium text-foreground text-sm">XML</div>
                  <div className="text-xs text-muted-foreground mt-0.5">ISO 20022</div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFileFormat('csv')}
                  className={`p-3 border rounded-lg transition-all text-left ${
                    selectedFileFormat === 'csv'
                      ? 'border-primary bg-muted'
                      : 'border-border hover:border-border'
                  }`}
                >
                  <div className="font-medium text-foreground text-sm">CSV</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Standard</div>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => handleGenerateFile()}
              disabled={!selectedBankAccountId || generateFile.isPending}
              className="text-white"
              style={{ backgroundColor: STATUS_COLORS.processing.bg }}
            >
              {generateFile.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-1.5" />
              )}
              Generate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Deny Payments</DialogTitle>
            <DialogDescription>
              Deny {selectedPayments.size} payment(s) and restore the bill(s) to payable status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-foreground mb-2">
              Reason (optional)
            </label>
            <Textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Enter reason for denial..."
              rows={3}
              className="text-sm"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleDeny}
              disabled={denyPayments.isPending}
              className="text-white"
              style={{ backgroundColor: STATUS_COLORS.sent.bg }}
            >
              {denyPayments.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-1.5" />
              )}
              Deny
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reverse Dialog */}
      <Dialog open={isReverseDialogOpen} onOpenChange={setIsReverseDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reverse Payment</DialogTitle>
            <DialogDescription>
              Restore the bill to payable status and mark this payment event as reversed.
              The bill will re-sync to Xero without this payment.
            </DialogDescription>
          </DialogHeader>
          {reverseTarget && (
            <div className="py-2 space-y-3">
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <div className="font-medium text-foreground">
                  {reverseTarget.vendor_name || 'Payment'} &middot; {reverseTarget.currency}{' '}
                  {parseFloat(reverseTarget.amount).toLocaleString()}
                </div>
                {reverseTarget.bill_number && (
                  <div className="text-xs text-muted-foreground">
                    Bill {reverseTarget.bill_number}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Reason (required)
                </label>
                <Textarea
                  value={reverseReason}
                  onChange={(e) => setReverseReason(e.target.value)}
                  placeholder="e.g. Duplicate payment, paid vendor twice, wrong amount..."
                  rows={3}
                  className="text-sm"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReverseDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleReverse}
              disabled={reversePayment.isPending || !reverseReason.trim()}
              className="text-white"
              style={{ backgroundColor: STATUS_COLORS.failed.bg }}
            >
              {reversePayment.isPending ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <RotateCcw className="h-4 w-4 mr-1.5" />
              )}
              Reverse Payment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProcessingQueueSkeleton() {
  return (
    <div>
      {/* Stats skeleton */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 bg-muted animate-pulse rounded-full" />
            <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            <div className="h-4 w-6 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      {/* Toolbar skeleton */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="h-9 w-40 bg-muted animate-pulse rounded" />
        <div className="h-8 w-24 bg-muted animate-pulse rounded" />
      </div>

      {/* Table skeleton */}
      <div className="p-4">
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
              <div className="h-8 w-8 bg-muted animate-pulse rounded" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
                <div className="h-3 bg-muted animate-pulse rounded w-1/6" />
              </div>
              <div className="h-5 bg-muted animate-pulse rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
