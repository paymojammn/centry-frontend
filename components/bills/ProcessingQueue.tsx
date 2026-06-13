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
import { PILL_COLORS } from '@/lib/theme';
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
import { paymentEventsApi } from '@/lib/bills-api';
import { launchOneGateCheckout, openOneGateHostedModal } from '@/lib/onegate-checkout';
import { useBankAccounts } from '@/hooks/use-banking';
import { useHasPermission } from '@/hooks/use-user';
import type { PaymentEvent, PaymentEventStatus } from '@/types/bill';
import {
  Send,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  RefreshCw,
  Building2,
  Phone,
  CreditCard,
  ExternalLink,
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
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import PayBillsModal from './PayBillsModal';
import type { Bill } from '@/types/bill';
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
import { Input } from '@/components/ui/input';

// Status color constants (matching bills page)
const STATUS_COLORS = {
  pending_approval: { bg: '#fed652', text: '#7a5c00', light: '#FFF9E5' },
  processing: { bg: '#6B8FB8', text: '#ffffff', light: '#E8F2FA' },
  pending: { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7' },
  accepted: { bg: '#2A9D8F', text: '#ffffff', light: '#E6F4F1' },
  sent: { bg: '#f77f00', text: '#ffffff', light: '#FFF0E5' },
  success: { bg: '#5C8A65', text: '#ffffff', light: '#E8F5E5' },
  failed: { bg: '#dc2626', text: '#ffffff', light: '#FEE2E2' },
} as const;

interface ProcessingQueueProps {
  organizationId: string | null;
}

// Customer-facing provider names for the Provider column. Falls back to the
// backend method_display when a method isn't mapped here.
const PROVIDER_NAMES: Record<string, string> = {
  onegate_payout: 'OneGate',
  ozow_payout: 'Ozow',
  paystack_payout: 'Paystack',
  netcash_payout: 'Netcash',
};

// The provider label for a payment — used by the Provider column and filter.
const providerOf = (p: { method?: string; method_display?: string | null }): string =>
  PROVIDER_NAMES[p.method || ''] || p.method_display || p.method || '—';

export default function ProcessingQueue({ organizationId }: ProcessingQueueProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentEventStatus | 'all'>('PENDING_APPROVAL');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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
  const [isPayNowDialogOpen, setIsPayNowDialogOpen] = useState(false);
  const [payNowAmount, setPayNowAmount] = useState('');
  const [payNowLoading, setPayNowLoading] = useState(false);

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

  // Client-side search over the already-fetched (status-filtered) payments,
  // matching the bills queue: instant, no debounce. Status is filtered
  // server-side via the `filters` above; search narrows the visible rows.
  const filteredPayments = useMemo(() => {
    let list: PaymentEvent[] = payments;
    if (providerFilter !== 'all') {
      list = list.filter((p: PaymentEvent) => providerOf(p) === providerFilter);
    }
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter((p: PaymentEvent) =>
      p.vendor_name?.toLowerCase().includes(query) ||
      p.bill_number?.toLowerCase().includes(query) ||
      p.bill_reference?.toLowerCase().includes(query) ||
      p.account_name?.toLowerCase().includes(query) ||
      p.bank_name?.toLowerCase().includes(query) ||
      p.note?.toLowerCase().includes(query)
    );
  }, [payments, searchQuery, providerFilter]);

  // Providers present in the fetched payments, for the provider filter.
  const providers = useMemo(() => {
    const set = new Set<string>();
    for (const p of payments) set.add(providerOf(p));
    return Array.from(set).sort();
  }, [payments]);

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

  // Check if selected PROCESSING payments are provider payouts (Ozow, OneGate, Paystack, etc.)
  const isProviderPayout = canGenerateFile &&
    selectedPaymentsData.every((p: PaymentEvent) =>
      p.method?.endsWith('_payout') || ['ozow_payout', 'onegate_payout', 'paystack_payout', 'netcash_payout'].includes(p.method || '')
    );

  // Hosted-checkout payouts (Ozow) use a different UX: the final payer enters
  // the amount, gets a redirect URL, completes on the provider's page.
  // Restrict to a single selected event since the action opens a dialog per
  // payment. OneGate bills are OTT-Payouts (money OUT, server-to-server) — they
  // are NOT hosted checkout, so the embedded-widget / in-page "Pay Now" UX is
  // disabled for them; they go through the standard "Send payment" provider
  // payout flow instead.
  const isHostedCheckoutPayout = canGenerateFile &&
    selectedPaymentsData.length === 1 &&
    ['ozow_payout'].includes(selectedPaymentsData[0]?.method || '');

  // Check if all selected can be denied (PENDING_APPROVAL or PROCESSING status) + user has approve permission
  const canDeny = hasApprovePermission && selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) =>
      p.provider_status === 'PENDING_APPROVAL' || p.provider_status === 'PROCESSING'
    );

  // Per-row actions (single payment) so each row has Accept / Reject inline
  // (like the invoices queue), plus Send / Re-run for provider payouts. A
  // payout that dropped half-way stays in PROCESSING; Re-run sends it again —
  // the backend now mints a fresh reference per attempt, so the retry isn't
  // rejected as a duplicate.
  const [editingEvent, setEditingEvent] = useState<PaymentEvent | null>(null);

  const isRowProviderPayout = (p: PaymentEvent) =>
    !!p.method &&
    (p.method.endsWith('_payout') ||
      ['ozow_payout', 'onegate_payout', 'paystack_payout', 'netcash_payout'].includes(p.method));

  const handleApproveRow = async (id: number) => {
    try {
      await approvePayments.mutateAsync([id]);
      toast.success('Payment approved');
    } catch (e: any) {
      toast.error(e?.message || 'Approve failed');
    }
  };

  const handleRejectRow = async (id: number) => {
    try {
      await rejectPayments.mutateAsync({ ids: [id], reason: '' });
      toast.success('Payment rejected');
    } catch (e: any) {
      toast.error(e?.message || 'Reject failed');
    }
  };

  const handleSendRow = async (id: number) => {
    try {
      const result: any = await sendProviderPayout.mutateAsync([id]);
      const r = result?.results?.find((x: any) => x.id === id) || result?.results?.[0];
      if (r && r.success === false) {
        toast.error(r.error || 'Payout failed');
      } else {
        toast.success('Payout sent');
      }
    } catch (e: any) {
      toast.error(e?.message || 'Send failed');
    }
  };

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

  const handleOpenPayNow = () => {
    if (!isHostedCheckoutPayout) return;
    const event = selectedPaymentsData[0];
    // Pre-fill with whatever the submitter suggested. The dialog lets the
    // payer override before we hit the provider's create-payment-key API.
    setPayNowAmount(String(event?.amount ?? ''));
    setIsPayNowDialogOpen(true);
  };

  const handleGeneratePaymentLink = async () => {
    if (!isHostedCheckoutPayout) return;
    const event = selectedPaymentsData[0];
    if (!event) return;
    setPayNowLoading(true);
    try {
      const result = await paymentEventsApi.generatePaymentLink(
        event.id,
        payNowAmount || undefined,
      );

      // OneGate self-hosted: embed the V4 checkout widget in-page so the
      // payer never leaves Centry. Falls back to opening the hosted page
      // when the provider didn't return widget coordinates (e.g. Ozow).
      if (result.service_url && result.payment_key) {
        setIsPayNowDialogOpen(false);
        try {
          await launchOneGateCheckout({
            serviceUrl: result.service_url,
            paymentKey: result.payment_key,
          });
          // Resolved → transaction completed. The webhook reconciles the
          // authoritative status; refetch so the queue reflects it.
          toast.success('Payment completed');
          setSelectedPayments(new Set());
          refetch();
        } catch (err: any) {
          // Embedded checkout didn't complete — generating the link moved the
          // event to SENT_PAYMENT, so return it to the approved (retryable)
          // state instead of leaving it stuck as "Sent".
          try {
            await paymentEventsApi.revertToApproved(
              event.id,
              err?.cancelled ? 'checkout_cancelled' : 'checkout_failed',
            );
          } catch (revertErr) {
            console.error('Failed to revert payment to approved:', revertErr);
          }
          refetch();
          if (err?.cancelled) {
            toast.info('Payment cancelled');
          } else {
            // Surface the real reason: widget transactionError → `error`,
            // thrown/validation/timeout → `message`, plus any `reason`.
            console.error('OneGate checkout failed:', err);
            toast.error(err?.error || err?.reason || err?.message || 'Payment failed');
          }
        }
        return;
      }

      if (result.payment_link) {
        window.open(result.payment_link, '_blank', 'noopener,noreferrer');
        toast.success('Payment link opened in a new tab');
        setIsPayNowDialogOpen(false);
        setSelectedPayments(new Set());
      } else {
        toast.error('Provider did not return a payment link');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to generate payment link');
    } finally {
      setPayNowLoading(false);
    }
  };

  // Redirect flow: open OneGate's hosted checkout page in a new tab instead of
  // embedding the widget. Works without OneGate whitelisting our origin, so
  // it's the reliable path while the embedded (self-hosted) checkout is being
  // enabled. The webhook reconciles the outcome.
  const handleRedirectCheckout = async () => {
    if (!isHostedCheckoutPayout) return;
    const event = selectedPaymentsData[0];
    if (!event) return;
    setPayNowLoading(true);
    try {
      const result = await paymentEventsApi.generatePaymentLink(
        event.id,
        payNowAmount || undefined,
      );
      if (result.payment_link) {
        window.open(result.payment_link, '_blank', 'noopener,noreferrer');
        toast.success('Hosted checkout opened in a new tab');
        setIsPayNowDialogOpen(false);
        setSelectedPayments(new Set());
        refetch();
      } else {
        toast.error('Provider did not return a payment link');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to open checkout');
    } finally {
      setPayNowLoading(false);
    }
  };

  // Option B: embed OneGate's hosted checkout page (…/pay/hosted?payment_key=…)
  // in an in-page modal. Unlike the official widget (which posts to the
  // bare-origin endpoint and hits OneGate's login), the hosted URL renders the
  // real checkout today. Outcome reconciled by the webhook.
  const handleHostedModalCheckout = async () => {
    if (!isHostedCheckoutPayout) return;
    const event = selectedPaymentsData[0];
    if (!event) return;
    setPayNowLoading(true);
    try {
      const result = await paymentEventsApi.generatePaymentLink(
        event.id,
        payNowAmount || undefined,
      );
      if (result.payment_link) {
        setIsPayNowDialogOpen(false);
        await openOneGateHostedModal({ checkoutUrl: result.payment_link });
        setSelectedPayments(new Set());
        refetch();
      } else {
        toast.error('Provider did not return a payment link');
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to open checkout');
    } finally {
      setPayNowLoading(false);
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

  const getStatusIcon = (status: PaymentEventStatus) => {
    switch (status) {
      case 'PENDING_APPROVAL':
        return <ShieldCheck className="h-4 w-4 text-amber-500" />;
      case 'PROCESSING':
        return <FileText className="h-4 w-4 text-primary" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'ACCEPTED_BANK':
        return <ShieldCheck className="h-4 w-4" style={{ color: STATUS_COLORS.accepted.bg }} />;
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
      PROCESSING: { ...STATUS_COLORS.processing, label: 'Ready to Pay' },
      PENDING: { ...STATUS_COLORS.pending, label: 'File Generated' },
      ACCEPTED_BANK: { ...STATUS_COLORS.accepted, label: 'Accepted by Bank' },
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
        className="status-pill"
        style={{
          backgroundColor: config.light,
          color: config.bg !== '#bec3c6' ? config.bg : config.text,
          borderColor: 'transparent',
        }}
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
        <h3 className="text-lg font-normal text-foreground mb-2">Error Loading Queue</h3>
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
      {/* Status pills — stats + filter (mirrors the collections queue) */}
      {stats && (
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
              statusFilter === 'all' ? 'bg-foreground text-card' : 'bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            All ({stats.total})
          </button>
          {[
            { value: 'PENDING_APPROVAL', label: 'Pending Approval', count: stats.pending_approval, color: PILL_COLORS.pending_approval },
            { value: 'PROCESSING', label: 'Ready to Pay', count: stats.processing, color: PILL_COLORS.processing },
            { value: 'PENDING', label: 'File Sent', count: stats.pending, color: PILL_COLORS.pending },
            { value: 'ACCEPTED_BANK', label: 'Accepted by Bank', count: stats.accepted, color: PILL_COLORS.accepted },
            { value: 'SENT_PAYMENT', label: 'Processing', count: stats.sent, color: PILL_COLORS.sent_payment },
            { value: 'SUCCESS_PAYMENT', label: 'Successful', count: stats.success, color: PILL_COLORS.success_payment },
            { value: 'FAILED_PAYMENT', label: 'Failed', count: (stats.failed || 0) + (stats.rejected || 0), color: PILL_COLORS.failed_payment },
          ].map((p) => (
            <button
              key={p.value}
              onClick={() => setStatusFilter(statusFilter === p.value ? 'all' : (p.value as PaymentEventStatus))}
              className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                statusFilter === p.value ? 'text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
              style={statusFilter === p.value ? { backgroundColor: p.color } : undefined}
            >
              {p.label} ({p.count})
            </button>
          ))}
          {providers.length > 1 && (
            <select
              value={providerFilter}
              onChange={(ev) => setProviderFilter(ev.target.value)}
              aria-label="Filter by provider"
              className="ml-auto h-7 rounded-md border border-border bg-card px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All providers</option>
              {providers.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Toolbar - Clean horizontal layout */}
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        {/* Left: Filter and Refresh */}
        <div className="flex items-center gap-3">
          <div className="relative w-64 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search vendors, bills, accounts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-card border-border text-sm text-foreground"
            />
          </div>
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
              className="h-8 text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--foreground)' }}
            >
              <FileDown className="h-4 w-4 mr-1.5" />
              Generate File
            </Button>
          )}

          {isHostedCheckoutPayout && (
            <Button
              onClick={handleOpenPayNow}
              size="sm"
              className="h-8 text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--foreground)' }}
            >
              <CreditCard className="h-4 w-4 mr-1.5" />
              Pay Now
            </Button>
          )}

          {isProviderPayout && !isHostedCheckoutPayout && (
            <Button
              onClick={handleSendProviderPayout}
              disabled={sendProviderPayout.isPending}
              size="sm"
              className="h-8 text-white hover:opacity-90"
              style={{ backgroundColor: 'var(--foreground)' }}
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
      {!filteredPayments || filteredPayments.length === 0 ? (
        <div className="py-16 text-center">
          <Send className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-normal text-foreground">No Payments in Queue</p>
          <p className="text-sm text-muted-foreground mt-1">
            {searchQuery.trim()
              ? 'No payments match your search. Try a different term.'
              : statusFilter !== 'all'
              ? 'No payments with this status. Try a different filter.'
              : 'Payments you initiate will appear here for tracking.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-professional">
            <thead>
              <tr>
                {hasAnyActionPermission && (
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={filteredPayments.length > 0 && filteredPayments.every((p: PaymentEvent) => selectedPayments.has(p.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPayments(new Set(filteredPayments.map((p: PaymentEvent) => p.id)));
                        } else {
                          setSelectedPayments(new Set());
                        }
                      }}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </th>
                )}
                <th>Vendor</th>
                <th>Bill</th>
                <th>Provider</th>
                <th className="cell-currency">Ccy</th>
                <th className="text-right">Amount</th>
                <th>Created</th>
                <th>Reference</th>
                <th className="text-right pr-6">Actions</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((payment: PaymentEvent) => (
                <tr
                  key={payment.id}
                  className={`${selectedPayments.has(payment.id) ? 'is-selected' : ''} ${
                    hasAnyActionPermission ? 'cursor-pointer' : ''
                  }`}
                  onClick={() => hasAnyActionPermission && togglePaymentSelection(payment.id)}
                >
                  {hasAnyActionPermission && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedPayments.has(payment.id)}
                      onChange={() => togglePaymentSelection(payment.id)}
                      className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                  )}
                  <td className="cell-primary whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="cell-avatar">
                        {getInitials(payment.vendor_name)}
                      </div>
                      <div>
                        <div>{payment.vendor_name || 'Unknown Vendor'}</div>
                        {payment.account_name && (
                          <span className="cell-sub">{payment.account_name}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    <div>{payment.bill_number || '-'}</div>
                    {payment.bill_reference && (
                      <span className="cell-sub">{payment.bill_reference}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="p-1 bg-muted rounded">
                        {getMethodIcon(payment.method)}
                      </span>
                      <div>
                        <div>{PROVIDER_NAMES[payment.method] || payment.method_display}</div>
                        {payment.phone_number && (
                          <span className="cell-sub">{payment.phone_number}</span>
                        )}
                        {payment.account_number && (
                          <span className="cell-sub">
                            {payment.bank_name_display ? `${payment.bank_name_display} - ` : ''}
                            {payment.account_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="cell-currency">{payment.currency}</td>
                  <td className="cell-amount">
                    {parseFloat(payment.amount).toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </td>
                  <td className="whitespace-nowrap cell-muted">
                    <div>{formatDate(payment.created_at)}</div>
                    {payment.created_by_name && (
                      <span className="cell-sub">by {payment.created_by_name}</span>
                    )}
                    {payment.approved_by_name && (
                      <span className="cell-sub" style={{ color: STATUS_COLORS.success.bg }}>
                        Approved by {payment.approved_by_name}
                      </span>
                    )}
                  </td>
                  <td className="whitespace-nowrap cell-muted">
                    {payment.provider_reference ? (
                      <span className="text-xs font-mono" title={payment.provider_reference}>
                        {payment.provider_reference}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap text-right pr-6">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* PENDING_APPROVAL → Accept / Reject inline */}
                      {hasApprovePermission && payment.provider_status === 'PENDING_APPROVAL' && (
                        <>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleApproveRow(payment.id);
                            }}
                            disabled={approvePayments.isPending}
                            className="h-7 px-2 text-xs border-green-200 bg-green-50 text-green-700 hover:bg-green-100 hover:text-green-700"
                            title="Approve this payment"
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Accept
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRejectRow(payment.id);
                            }}
                            disabled={rejectPayments.isPending}
                            className="h-7 px-2 text-xs border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-700"
                            title="Reject this payment"
                          >
                            <X className="h-3 w-3 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                      {/* Provider payout → Send / Re-run. A dropped payout stays
                          in PROCESSING; a provider-rejected one lands in
                          ERROR_PAYMENT (bill auto-reversed). Both are re-runnable:
                          the backend re-reserves the bill and re-sends with a
                          fresh reference. */}
                      {hasApprovePermission &&
                        ['PROCESSING', 'ERROR_PAYMENT'].includes(payment.provider_status) &&
                        isRowProviderPayout(payment) && (
                          <>
                            {/* Edit recipient details before re-running — only
                                for a FAILED OneGate payout (not approved/sent or
                                successful ones, whose details are locked). */}
                            {(payment.method as string) === 'onegate_payout' &&
                              payment.provider_status === 'ERROR_PAYMENT' && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingEvent(payment);
                                }}
                                className="h-7 px-2 text-xs"
                                title="Edit the recipient payout details before re-running"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            )}
                            <Button
                              type="button"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendRow(payment.id);
                              }}
                              disabled={sendProviderPayout.isPending}
                              className="h-7 px-2 text-xs text-white hover:opacity-90"
                              style={{ backgroundColor: 'var(--foreground)' }}
                              title={
                                payment.provider_status === 'ERROR_PAYMENT'
                                  ? 'Re-run this payout (the previous attempt was rejected)'
                                  : payment.provider_reference
                                    ? 'Re-run this payout (a previous attempt did not complete)'
                                    : 'Send this payout'
                              }
                            >
                              <Send className="h-3 w-3 mr-1" />
                              {payment.provider_status === 'ERROR_PAYMENT' ||
                              payment.provider_reference
                                ? 'Re-run'
                                : 'Send'}
                            </Button>
                          </>
                        )}
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
                    </div>
                  </td>
                  <td className="whitespace-nowrap">
                    {getStatusBadge(payment.provider_status)}
                    {payment.provider_status === 'ERROR_PAYMENT' && payment.payout_error && (
                      <div
                        className="text-xs text-destructive mt-1 max-w-[160px] truncate"
                        title={payment.payout_error}
                      >
                        {payment.payout_error.replace(/^Payout failed:\s*/i, '')}
                      </div>
                    )}
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit a failed OneGate payout's details before re-run — reuses the
          bill-payments modal in edit mode (recipients step, pre-filled). */}
      <PayBillsModal
        isOpen={!!editingEvent}
        onClose={() => setEditingEvent(null)}
        organizationId={organizationId || ''}
        bills={
          editingEvent
            ? [
                {
                  id: editingEvent.id,
                  vendor_name: editingEvent.vendor_name,
                  invoice_number: editingEvent.bill_number,
                  currency_code: editingEvent.currency,
                  currency: editingEvent.currency,
                  amount_due: editingEvent.amount,
                  amount: editingEvent.amount,
                } as unknown as Bill,
              ]
            : []
        }
        editEvent={editingEvent}
        onEdited={(eventId, rerun) => {
          refetch();
          if (rerun) handleSendRow(eventId);
        }}
      />

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
            <label className="block text-sm font-normal text-foreground mb-2">
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
              <label className="block text-sm font-normal text-foreground mb-2">
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
              <label className="block text-sm font-normal text-foreground mb-2">
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
                  <div className="font-normal text-foreground text-sm">XML</div>
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
                  <div className="font-normal text-foreground text-sm">CSV</div>
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
            <label className="block text-sm font-normal text-foreground mb-2">
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

      {/* Pay Now Dialog — Ozow / OneGate hosted-checkout */}
      <Dialog open={isPayNowDialogOpen} onOpenChange={setIsPayNowDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Pay Now</DialogTitle>
            <DialogDescription>
              Confirm the amount, then pay in-page (embedded checkout) or open
              the hosted checkout page in a new tab. The payer completes card or
              EFT details either way.
            </DialogDescription>
          </DialogHeader>
          {selectedPaymentsData[0] && (
            <div className="py-2 space-y-3">
              <div className="rounded-md bg-muted px-3 py-2 text-sm">
                <div className="font-normal text-foreground">
                  {selectedPaymentsData[0].vendor_name || 'Payment'}
                </div>
                {selectedPaymentsData[0].bill_number && (
                  <div className="text-xs text-muted-foreground">
                    Bill {selectedPaymentsData[0].bill_number}
                  </div>
                )}
                <div className="text-xs text-muted-foreground mt-0.5">
                  Provider:{' '}
                  {selectedPaymentsData[0].method === 'onegate_payout'
                    ? 'CallPay / OneGate'
                    : 'Ozow'}
                </div>
              </div>
              <div>
                <label className="block text-sm font-normal text-foreground mb-2">
                  Amount ({selectedPaymentsData[0].currency})
                </label>
                <Input
                  type="number"
                  value={payNowAmount}
                  onChange={(e) => setPayNowAmount(e.target.value)}
                  step="0.01"
                  min="0"
                  className="text-sm"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Must be between 0 and the bill's outstanding amount.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            {(() => {
              // Allow amount=0 — vouchers (1Voucher / BluVoucher / OTT etc.)
              // require amount=0 on the provider's hosted page; the value is
              // captured from the PIN. Only reject empty strings, non-numeric
              // input, or strictly negative numbers.
              const amountInvalid =
                payNowAmount === '' ||
                !Number.isFinite(parseFloat(payNowAmount)) ||
                parseFloat(payNowAmount) < 0;
              return (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsPayNowDialogOpen(false)}
                    disabled={payNowLoading}
                  >
                    Cancel
                  </Button>
                  {/* Redirect flow — opens OneGate's hosted page in a new tab.
                      Works without origin whitelisting; the webhook reconciles. */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRedirectCheckout}
                    disabled={payNowLoading || amountInvalid}
                  >
                    {payNowLoading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-1.5" />
                    )}
                    Redirect checkout
                  </Button>
                  {/* Embedded flow B — in-page modal that iframes OneGate's
                      hosted checkout page. Works without origin whitelisting. */}
                  <Button
                    size="sm"
                    onClick={handleHostedModalCheckout}
                    disabled={payNowLoading || amountInvalid}
                    className="text-white"
                    style={{ backgroundColor: STATUS_COLORS.success.bg }}
                  >
                    {payNowLoading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1.5" />
                    )}
                    Pay in-page
                  </Button>
                  {/* Embedded flow A — official widget (requires OneGate to
                      whitelist this origin / enable self-hosted checkout). */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleGeneratePaymentLink}
                    disabled={payNowLoading || amountInvalid}
                  >
                    {payNowLoading ? (
                      <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-1.5" />
                    )}
                    Widget
                  </Button>
                </>
              );
            })()}
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
                <div className="font-normal text-foreground">
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
                <label className="block text-sm font-normal text-foreground mb-2">
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
