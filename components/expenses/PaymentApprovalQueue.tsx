/**
 * Payment Approval Queue Component
 *
 * Shows pending payment requests for manager/finance approval.
 * Matches the Centry design system used across the application.
 */

'use client';

import { useState } from 'react';
import {
  usePendingPaymentRequests,
  usePaymentRequestStats,
  useApprovePaymentRequest,
  useRejectPaymentRequest,
  useProcessPaymentRequest,
} from '@/hooks/use-expenses';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Clock,
  CheckCircle2,
  XCircle,
  Wallet,
  Smartphone,
  Building2,
  DollarSign,
  User,
  Calendar,
  AlertCircle,
  Play,
  RefreshCw,
  CreditCard,
  Loader2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { StatusBadge } from '@/components/layout/status-badge';
import { EmptyState } from '@/components/layout/empty-state';
import type { ExpensePaymentRequest } from '@/types/expense';
import { formatDistanceToNow } from 'date-fns';

interface PaymentApprovalQueueProps {
  organizationId?: string;
  currency?: string;
}

// Status colors matching expenses page
const PAYMENT_STATUS_COLORS = {
  pending: { bg: '#fed652', text: '#7a5c00' },
  approved: { bg: '#4E97D1', text: '#ffffff' },
  processing: { bg: '#9b59b6', text: '#ffffff' },
  completed: { bg: '#49a034', text: '#ffffff' },
  failed: { bg: '#dc2626', text: '#ffffff' },
  rejected: { bg: '#bec3c6', text: '#4a5568' },
} as const;

export default function PaymentApprovalQueue({
  organizationId,
  currency = 'UGX',
}: PaymentApprovalQueueProps) {
  const [selectedRequest, setSelectedRequest] = useState<ExpensePaymentRequest | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('pending');

  const {
    data: pendingData,
    isLoading,
    refetch,
  } = usePendingPaymentRequests(organizationId);
  const { data: stats } = usePaymentRequestStats(organizationId);

  const { mutate: approveRequest, isPending: isApproving } = useApprovePaymentRequest();
  const { mutate: rejectRequest, isPending: isRejecting } = useRejectPaymentRequest();
  const { mutate: processRequest, isPending: isProcessing } = useProcessPaymentRequest();

  const pendingRequests = pendingData?.results || [];

  // Filter requests based on status filter
  const filteredRequests =
    statusFilter === 'all'
      ? pendingRequests
      : pendingRequests.filter((r: ExpensePaymentRequest) => r.status === statusFilter);

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'wallet':
        return <Wallet className="h-4 w-4" />;
      case 'mobile_money':
        return <Smartphone className="h-4 w-4" />;
      case 'bank':
        return <Building2 className="h-4 w-4" />;
      default:
        return <DollarSign className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'wallet':
        return 'Wallet';
      case 'mobile_money':
        return 'Mobile Money';
      case 'bank':
        return 'Bank';
      default:
        return method;
    }
  };

  const handleApprove = () => {
    if (!selectedRequest) return;
    approveRequest(
      { requestId: selectedRequest.id, notes: approvalNotes },
      {
        onSuccess: () => {
          setShowApproveDialog(false);
          setSelectedRequest(null);
          setApprovalNotes('');
        },
      }
    );
  };

  const handleReject = () => {
    if (!selectedRequest || !rejectReason.trim()) return;
    rejectRequest(
      { requestId: selectedRequest.id, reason: rejectReason },
      {
        onSuccess: () => {
          setShowRejectDialog(false);
          setSelectedRequest(null);
          setRejectReason('');
        },
      }
    );
  };

  const handleProcess = (request: ExpensePaymentRequest) => {
    processRequest(request.id);
  };

  // Tab options for filtering
  const tabOptions = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Ready to Pay' },
    { value: 'processing', label: 'Processing' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All' },
  ];

  // Stats bar data
  const statsBarData = [
    {
      label: 'Pending',
      value: stats?.pending?.count || 0,
      amount: stats?.pending?.amount || '0',
      color: PAYMENT_STATUS_COLORS.pending.bg,
    },
    {
      label: 'Ready',
      value: stats?.approved?.count || 0,
      amount: stats?.approved?.amount || '0',
      color: PAYMENT_STATUS_COLORS.approved.bg,
    },
    {
      label: 'Completed',
      value: stats?.completed?.count || 0,
      amount: stats?.completed?.amount || '0',
      color: PAYMENT_STATUS_COLORS.completed.bg,
    },
    {
      label: 'Failed',
      value: (stats?.failed?.count || 0) + (stats?.rejected?.count || 0),
      amount: String(
        parseFloat(stats?.failed?.amount || '0') + parseFloat(stats?.rejected?.amount || '0')
      ),
      color: PAYMENT_STATUS_COLORS.failed.bg,
    },
  ];

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Stats Bar */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm p-4">
        <div className="flex items-center gap-6 flex-wrap">
          {statsBarData.map((stat, index) => (
            <div key={index} className="flex items-center gap-2">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: stat.color }}
              />
              <span className="text-sm text-muted-foreground">{stat.label}:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-muted text-foreground">
                {stat.value}
              </span>
              <span className="text-xs text-muted-foreground/60">
                ({currency} {parseFloat(stat.amount).toLocaleString()})
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        {/* Header with Tabs */}
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            {/* Tabs */}
            <div className="flex items-center gap-1">
              {tabOptions.map((tab) => (
                <button
                  key={tab.value}
                  onClick={() => setStatusFilter(tab.value)}
                  className={`px-3 py-1.5 rounded text-sm font-medium transition-colors btn-press ${
                    statusFilter === tab.value
                      ? 'bg-primary text-white'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="h-8 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No Payment Requests"
            description={
              statusFilter === 'pending'
                ? 'All payment requests have been processed'
                : `No ${statusFilter} payment requests found`
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="table-professional w-full">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Expense
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Method
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Requested
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="animate-stagger">
                {filteredRequests.map((request: ExpensePaymentRequest) => (
                  <tr key={request.id} className="row-interactive">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {request.expense.employee_name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {request.expense.employee_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-foreground max-w-[200px] truncate">
                        {request.expense.description}
                      </div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {request.expense.category.replace(/_/g, ' ')}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-muted rounded">
                          {getPaymentMethodIcon(request.payment_method)}
                        </span>
                        <span className="text-sm text-foreground">
                          {getPaymentMethodLabel(request.payment_method)}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-medium text-foreground">
                        {request.currency} {parseFloat(request.amount).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {request.requested_at
                          ? formatDistanceToNow(new Date(request.requested_at), {
                              addSuffix: true,
                            })
                          : '-'}
                      </div>
                      <div className="text-xs text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3" />
                        {request.requested_by?.name || 'Unknown'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-1">
                        {request.status === 'pending' && (
                          <>
                            <Button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowRejectDialog(true);
                              }}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:bg-destructive/5"
                            >
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                            <Button
                              onClick={() => {
                                setSelectedRequest(request);
                                setShowApproveDialog(true);
                              }}
                              size="sm"
                              className="h-7 px-2 bg-primary/50 hover:bg-primary/80 text-white"
                            >
                              <ThumbsUp className="h-3 w-3" />
                            </Button>
                          </>
                        )}
                        {request.status === 'approved' && (
                          <Button
                            size="sm"
                            onClick={() => handleProcess(request)}
                            disabled={isProcessing}
                            className="h-7 px-3 bg-[#4E97D1] hover:bg-[#3d7ab0] text-white"
                          >
                            <Play className="h-3 w-3 mr-1" />
                            Pay
                          </Button>
                        )}
                        {request.status === 'completed' && (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Paid
                          </span>
                        )}
                        {request.status === 'failed' && (
                          <span className="text-xs text-destructive flex items-center gap-1">
                            <XCircle className="h-3 w-3" />
                            Failed
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Approve Dialog */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-primary" />
              Approve Payment
            </DialogTitle>
            <DialogDescription>
              Approve payment for {selectedRequest?.expense.employee_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-xl font-bold text-foreground">
                  {selectedRequest?.currency}{' '}
                  {parseFloat(selectedRequest?.amount || '0').toLocaleString()}
                </span>
              </div>
              <div className="text-sm text-muted-foreground mt-2">
                {selectedRequest?.expense.description}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Notes (Optional)</label>
              <Input
                placeholder="Add approval notes..."
                value={approvalNotes}
                onChange={(e) => setApprovalNotes(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setApprovalNotes('');
              }}
            >
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/80 text-white"
              onClick={handleApprove}
              disabled={isApproving}
            >
              {isApproving ? 'Approving...' : 'Approve'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Reject Payment
            </DialogTitle>
            <DialogDescription>
              Reject payment for {selectedRequest?.expense.employee_name}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="bg-muted rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Amount</span>
                <span className="text-xl font-bold text-foreground">
                  {selectedRequest?.currency}{' '}
                  {parseFloat(selectedRequest?.amount || '0').toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Rejection Reason <span className="text-destructive">*</span>
              </label>
              <Input
                placeholder="Enter reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                required
              />
              {!rejectReason.trim() && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Rejection reason is required
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setRejectReason('');
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={isRejecting || !rejectReason.trim()}
            >
              {isRejecting ? 'Rejecting...' : 'Reject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
