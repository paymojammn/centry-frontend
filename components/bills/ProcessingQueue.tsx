/**
 * Processing Queue Component
 *
 * Displays payments that have been sent for processing
 */

'use client';

import { useState } from 'react';
import { usePaymentEvents, usePaymentEventStats } from '@/hooks/use-bills';
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
  ArrowUpRight,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ProcessingQueueProps {
  organizationId: string | null;
}

export default function ProcessingQueue({ organizationId }: ProcessingQueueProps) {
  const [statusFilter, setStatusFilter] = useState<PaymentEventStatus | 'all'>('all');

  const filters = {
    organization: organizationId || undefined,
    direction: 'OUT' as const, // Only show outgoing payments (bill payments)
    status: statusFilter !== 'all' ? statusFilter : undefined,
  };

  const { data: paymentsResponse, isLoading, error, refetch } = usePaymentEvents(filters);
  const { data: stats } = usePaymentEventStats(organizationId || undefined);

  // Handle both array format and paginated format
  const payments = Array.isArray(paymentsResponse)
    ? paymentsResponse
    : (paymentsResponse as any)?.results || [];

  const getStatusIcon = (status: PaymentEventStatus) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-4 w-4 text-gray-500" />;
      case 'SENT_PAYMENT':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'SUCCESS_PAYMENT':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'FAILED_PAYMENT':
      case 'ERROR_PAYMENT':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: PaymentEventStatus) => {
    const styles = {
      PENDING: 'bg-gray-100 text-gray-700 border-gray-200',
      SENT_PAYMENT: 'bg-blue-100 text-blue-700 border-blue-200',
      SUCCESS_PAYMENT: 'bg-green-100 text-green-700 border-green-200',
      FAILED_PAYMENT: 'bg-red-100 text-red-700 border-red-200',
      ERROR_PAYMENT: 'bg-red-100 text-red-700 border-red-200',
    };

    const labels = {
      PENDING: 'Pending',
      SENT_PAYMENT: 'Processing',
      SUCCESS_PAYMENT: 'Successful',
      FAILED_PAYMENT: 'Failed',
      ERROR_PAYMENT: 'Error',
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
        <div className="grid gap-4 md:grid-cols-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Clock className="h-5 w-5 text-gray-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{stats.pending}</div>
                <div className="text-sm text-gray-500">Pending</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Loader2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-900">{stats.sent}</div>
                <div className="text-sm text-blue-600">Processing</div>
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
                <div className="text-2xl font-bold text-red-900">{stats.failed}</div>
                <div className="text-sm text-red-600">Failed</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter and Refresh */}
      <div className="flex items-center justify-between">
        <Select
          value={statusFilter}
          onValueChange={(val) => setStatusFilter(val as PaymentEventStatus | 'all')}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SENT_PAYMENT">Processing</SelectItem>
            <SelectItem value="SUCCESS_PAYMENT">Successful</SelectItem>
            <SelectItem value="FAILED_PAYMENT">Failed</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
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
                    Sent At
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                    Reference
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.map((payment: PaymentEvent) => (
                  <tr
                    key={payment.id}
                    className="group hover:bg-gradient-to-r hover:from-gray-50/50 hover:to-transparent transition-all duration-200"
                  >
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
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
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
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="text-sm text-gray-600">{formatDate(payment.created_at)}</div>
                      {payment.created_by_name && (
                        <div className="text-xs text-gray-500">by {payment.created_by_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      {payment.provider_reference ? (
                        <div className="flex items-center gap-1">
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                            {payment.provider_reference}
                          </code>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                      {payment.synced_to_xero && (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-xs text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Synced to Xero
                          </span>
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
    </div>
  );
}

function ProcessingQueueSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
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
              <div className="h-10 w-10 bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 animate-pulse rounded w-1/3" />
                <div className="h-3 bg-gray-100 animate-pulse rounded w-1/4" />
              </div>
              <div className="h-6 bg-gray-200 animate-pulse rounded-full w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
