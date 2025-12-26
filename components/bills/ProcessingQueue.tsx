/**
 * Processing Queue Component
 *
 * Displays payments in various stages of the approval workflow:
 * - PENDING_APPROVAL: Awaiting approval from another user
 * - PROCESSING: Approved, ready for file generation
 * - PENDING: File generated, sent to bank
 * - SENT_PAYMENT/SUCCESS_PAYMENT/FAILED_PAYMENT: Final states
 */

'use client';

import { useState, useMemo } from 'react';
import {
  usePaymentEvents,
  usePaymentEventStats,
  useApprovePayments,
  useRejectPayments,
  useGeneratePaymentFile,
  useDenyPayments,
} from '@/hooks/use-bills';
import { useBankAccounts } from '@/hooks/use-banking';
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
  ThumbsUp,
  ThumbsDown,
  FileDown,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

interface ProcessingQueueProps {
  organizationId: string | null;
}

export default function ProcessingQueue({ organizationId }: ProcessingQueueProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentEventStatus | 'all'>('all');
  const [selectedPayments, setSelectedPayments] = useState<Set<number>>(new Set());
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [isDenyDialogOpen, setIsDenyDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [denyReason, setDenyReason] = useState('');
  const [selectedBankAccountId, setSelectedBankAccountId] = useState<number | null>(null);
  const [selectedFileFormat, setSelectedFileFormat] = useState<'csv' | 'xml'>('xml');

  const filters = {
    organization: organizationId || undefined,
    direction: 'OUT' as const,
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: paymentsResponse, isLoading, error, refetch } = usePaymentEvents(filters);
  const { data: stats } = usePaymentEventStats(organizationId || undefined);
  const { data: bankAccountsData } = useBankAccounts(organizationId || undefined);

  const approvePayments = useApprovePayments();
  const rejectPayments = useRejectPayments();
  const generateFile = useGeneratePaymentFile();
  const denyPayments = useDenyPayments();

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

  // Check if all selected are PENDING_APPROVAL
  const canApprove = selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) => p.provider_status === 'PENDING_APPROVAL');

  // Check if all selected are PROCESSING
  const canGenerateFile = selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) => p.provider_status === 'PROCESSING');

  // Check if all selected can be denied (PENDING_APPROVAL or PROCESSING status)
  const canDeny = selectedPaymentsData.length > 0 &&
    selectedPaymentsData.every((p: PaymentEvent) =>
      p.provider_status === 'PENDING_APPROVAL' || p.provider_status === 'PROCESSING'
    );

  const handleApprove = async () => {
    if (!canApprove) return;
    try {
      await approvePayments.mutateAsync(Array.from(selectedPayments));
      setSelectedPayments(new Set());
    } catch (error) {
      console.error('Failed to approve payments:', error);
    }
  };

  const handleReject = async () => {
    if (!canApprove) return;
    try {
      await rejectPayments.mutateAsync({
        ids: Array.from(selectedPayments),
        reason: rejectionReason,
      });
      setSelectedPayments(new Set());
      setIsRejectDialogOpen(false);
      setRejectionReason('');
    } catch (error) {
      console.error('Failed to reject payments:', error);
    }
  };

  const handleGenerateFile = async () => {
    if (!canGenerateFile || !selectedBankAccountId) return;
    try {
      const result = await generateFile.mutateAsync({
        paymentEventIds: Array.from(selectedPayments),
        sourceBankAccountId: selectedBankAccountId,
        fileFormat: selectedFileFormat,
      });
      setSelectedPayments(new Set());
      setIsGenerateDialogOpen(false);
      alert(`Payment file generated: ${result.filename}\nPayments: ${result.payment_count}\nTotal: ${result.total_amount}`);
    } catch (error) {
      console.error('Failed to generate file:', error);
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
    } catch (error) {
      console.error('Failed to deny payments:', error);
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
        return <FileText className="h-4 w-4 text-blue-500" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'SENT_PAYMENT':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'SUCCESS_PAYMENT':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED_PAYMENT':
      case 'ERROR_PAYMENT':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'REJECTED':
        return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: PaymentEventStatus) => {
    const styles: Record<string, string> = {
      PENDING_APPROVAL: 'bg-amber-100 text-amber-700 border-amber-200',
      PROCESSING: 'bg-blue-100 text-blue-700 border-blue-200',
      PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
      SENT_PAYMENT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      SUCCESS_PAYMENT: 'bg-green-100 text-green-700 border-green-200',
      FAILED_PAYMENT: 'bg-red-100 text-red-700 border-red-200',
      ERROR_PAYMENT: 'bg-red-100 text-red-700 border-red-200',
      REJECTED: 'bg-red-100 text-red-700 border-red-200',
    };

    const labels: Record<string, string> = {
      PENDING_APPROVAL: 'Pending Approval',
      PROCESSING: 'Ready for File',
      PENDING: 'File Generated',
      SENT_PAYMENT: 'Processing',
      SUCCESS_PAYMENT: 'Successful',
      FAILED_PAYMENT: 'Failed',
      ERROR_PAYMENT: 'Error',
      REJECTED: 'Rejected',
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${styles[status] || styles.PENDING}`}
      >
        {getStatusIcon(status)}
        {labels[status] || status}
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
      hour: '2-digit',
      minute: '2-digit',
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

  const getGradientColor = (name: string | null) => {
    const colors = [
      'from-[#638C80] to-[#547568]',
      'from-[#7BA895] to-[#638C80]',
      'from-[#456050] to-[#3A5043]',
      'from-[#8BA89E] to-[#6D9686]',
      'from-[#5A7C72] to-[#4A6B61]',
      'from-[#729284] to-[#5E7D71]',
    ];
    if (!name) return colors[0];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  if (isLoading) {
    return <ProcessingQueueSkeleton />;
  }

  if (error) {
    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
        <div className="p-4 bg-red-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
          <XCircle className="h-10 w-10 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">Error Loading Queue</h3>
        <p className="text-gray-600">{error.message}</p>
        <Button onClick={() => refetch()} className="mt-4" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-6">
          <button
            onClick={() => { setStatusFilter('PENDING_APPROVAL'); selectAllByStatus('PENDING_APPROVAL'); }}
            className="bg-white rounded-xl border border-amber-200 p-4 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-amber-900">{stats.pending_approval}</div>
                <div className="text-sm text-amber-600">Pending Approval</div>
              </div>
            </div>
          </button>

          <button
            onClick={() => { setStatusFilter('PROCESSING'); selectAllByStatus('PROCESSING'); }}
            className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow text-left"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{stats.processing}</div>
                <div className="text-sm text-blue-600">Ready for File</div>
              </div>
            </div>
          </button>

          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-500">File Sent</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-indigo-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Loader2 className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-indigo-900">{stats.sent}</div>
                <div className="text-sm text-indigo-600">Processing</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-green-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-green-900">{stats.success}</div>
                <div className="text-sm text-green-600">Successful</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-red-900">{(stats.failed || 0) + (stats.rejected || 0)}</div>
                <div className="text-sm text-red-600">Failed/Rejected</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Select
            value={statusFilter}
            onValueChange={(val) => setStatusFilter(val as PaymentEventStatus | 'all')}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="PENDING_APPROVAL">Pending Approval</SelectItem>
              <SelectItem value="PROCESSING">Ready for File</SelectItem>
              <SelectItem value="PENDING">File Sent</SelectItem>
              <SelectItem value="SENT_PAYMENT">Processing</SelectItem>
              <SelectItem value="SUCCESS_PAYMENT">Successful</SelectItem>
              <SelectItem value="FAILED_PAYMENT">Failed</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={() => refetch()} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Action Buttons */}
        {selectedPayments.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {selectedPayments.size} selected
            </span>

            {canApprove && (
              <>
                <Button
                  onClick={handleApprove}
                  disabled={approvePayments.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {approvePayments.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ThumbsUp className="h-4 w-4 mr-2" />
                  )}
                  Approve
                </Button>
                <Button
                  onClick={() => setIsRejectDialogOpen(true)}
                  variant="destructive"
                >
                  <ThumbsDown className="h-4 w-4 mr-2" />
                  Reject
                </Button>
              </>
            )}

            {canGenerateFile && (
              <Button
                onClick={() => setIsGenerateDialogOpen(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Generate File
              </Button>
            )}

            {canDeny && (
              <Button
                onClick={() => setIsDenyDialogOpen(true)}
                variant="outline"
                className="border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Ban className="h-4 w-4 mr-2" />
                Deny
              </Button>
            )}

            <Button
              onClick={() => setSelectedPayments(new Set())}
              variant="ghost"
              size="sm"
            >
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Payments List */}
      {!payments || payments.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-12 text-center">
          <div className="p-4 bg-gray-50 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <Send className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Payments in Queue</h3>
          <p className="text-gray-600">
            {statusFilter !== 'all'
              ? 'No payments with this status. Try a different filter.'
              : 'Payments you initiate will appear here for tracking.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                <tr>
                  <th className="px-4 py-4 w-12">
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
                      className="w-4 h-4 rounded border-gray-300 text-[#638C80] focus:ring-[#638C80]"
                    />
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Bill
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment: PaymentEvent) => (
                  <tr
                    key={payment.id}
                    className={`group hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-200 cursor-pointer ${
                      selectedPayments.has(payment.id) ? 'bg-[#638C80]/5' : ''
                    }`}
                    onClick={() => togglePaymentSelection(payment.id)}
                  >
                    <td className="px-4 py-5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedPayments.has(payment.id)}
                        onChange={() => togglePaymentSelection(payment.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#638C80] focus:ring-[#638C80]"
                      />
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-10 w-10 rounded-lg bg-gradient-to-br ${getGradientColor(payment.vendor_name)} flex items-center justify-center text-white font-bold text-xs shadow-sm`}
                        >
                          {getInitials(payment.vendor_name)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {payment.vendor_name || 'Unknown Vendor'}
                          </div>
                          {payment.account_name && (
                            <div className="text-xs text-gray-500">{payment.account_name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {payment.bill_number || '-'}
                      </div>
                      {payment.bill_reference && (
                        <div className="text-xs text-gray-500">{payment.bill_reference}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-base font-bold text-gray-900">
                        {payment.currency}{' '}
                        {parseFloat(payment.amount).toLocaleString(undefined, {
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 0,
                        })}
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-gray-100 rounded-md">
                          {getMethodIcon(payment.method)}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {payment.method_display}
                          </div>
                          {payment.phone_number && (
                            <div className="text-xs text-gray-500">{payment.phone_number}</div>
                          )}
                          {payment.account_number && (
                            <div className="text-xs text-gray-500">
                              {payment.bank_name_display ? `${payment.bank_name_display} - ` : ''}
                              {payment.account_number}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {getStatusBadge(payment.provider_status)}
                      {payment.rejection_reason && (
                        <div className="text-xs text-red-500 mt-1 max-w-[150px] truncate" title={payment.rejection_reason}>
                          {payment.rejection_reason}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatDate(payment.created_at)}</div>
                      {payment.created_by_name && (
                        <div className="text-xs text-gray-500">by {payment.created_by_name}</div>
                      )}
                      {payment.approved_by_name && (
                        <div className="text-xs text-green-600">
                          Approved by {payment.approved_by_name}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Reject Payments
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to reject {selectedPayments.size} payment(s)?
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for rejection (optional)
            </label>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={rejectPayments.isPending}
            >
              {rejectPayments.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ThumbsDown className="h-4 w-4 mr-2" />
              )}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate File Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={setIsGenerateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileDown className="h-5 w-5 text-blue-500" />
              Generate Payment File
            </DialogTitle>
            <DialogDescription>
              Generate a payment file for {selectedPayments.size} approved payment(s).
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Source Bank Account *
              </label>
              <Select
                value={selectedBankAccountId?.toString() || ''}
                onValueChange={(val) => setSelectedBankAccountId(parseInt(val))}
              >
                <SelectTrigger>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                File Format
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFileFormat('xml')}
                  className={`p-3 border rounded-xl transition-all text-left ${
                    selectedFileFormat === 'xml'
                      ? 'border-[#638C80] bg-[#638C80]/5 ring-2 ring-[#638C80]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">XML</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    ISO 20022 (pain.001)
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFileFormat('csv')}
                  className={`p-3 border rounded-xl transition-all text-left ${
                    selectedFileFormat === 'csv'
                      ? 'border-[#638C80] bg-[#638C80]/5 ring-2 ring-[#638C80]/20'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="font-medium text-gray-900 text-sm">CSV</div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    Stanbic & most banks
                  </div>
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGenerateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleGenerateFile}
              disabled={!selectedBankAccountId || generateFile.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {generateFile.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="h-4 w-4 mr-2" />
              )}
              Generate File
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Deny Dialog */}
      <Dialog open={isDenyDialogOpen} onOpenChange={setIsDenyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5 text-orange-500" />
              Deny Payments
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deny {selectedPayments.size} payment(s)?
              This will cancel the payment and restore the bill(s) to payable status.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for denial (optional)
            </label>
            <Textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="Enter reason for denial..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDenyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleDeny}
              disabled={denyPayments.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {denyPayments.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Ban className="h-4 w-4 mr-2" />
              )}
              Deny & Restore Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProcessingQueueSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gray-200 animate-pulse rounded-lg" />
              <div className="space-y-2">
                <div className="h-6 w-12 bg-gray-200 animate-pulse rounded" />
                <div className="h-4 w-16 bg-gray-100 animate-pulse rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table skeleton */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
        <div className="space-y-6">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="h-4 w-4 bg-gray-200 animate-pulse rounded" />
              <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-200 animate-pulse rounded-full w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
