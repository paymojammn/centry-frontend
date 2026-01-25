/**
 * Expense Detail Modal
 *
 * View expense details and receipts.
 */

'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Receipt,
  User,
  Calendar,
  Tag,
  FileText,
  Image,
  ExternalLink,
  DollarSign,
  Clock,
  CheckCircle,
  XCircle,
  Upload,
} from 'lucide-react';
import type { Expense } from '@/types/expense';
import { EXPENSE_CATEGORIES } from '@/types/expense';
import { StatusBadge } from '@/components/layout/status-badge';
import { buildMediaUrl } from '@/config/api';

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  onEdit?: () => void;
  currency?: string;
}

export default function ExpenseDetailModal({
  isOpen,
  onClose,
  expense,
  onEdit,
  currency = 'UGX',
}: ExpenseDetailModalProps) {
  if (!expense) return null;

  const categoryInfo = EXPENSE_CATEGORIES.find((c) => c.value === expense.category) || {
    icon: '📝',
    label: expense.category,
  };

  const existingReceipts = expense.receipt_urls || (expense.receipt_url ? [expense.receipt_url] : []);

  const canEdit =
    expense.status === 'draft' ||
    expense.status === 'rejected' ||
    expense.status === 'manager_approved';

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Receipt className="h-5 w-5 text-[#49a034]" />
            Expense Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status and Amount Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <StatusBadge status={expense.status} />
                <StatusBadge
                  status={
                    expense.payment_status === 'paid' ? 'paid' :
                    expense.payment_status === 'partial' ? 'warning' :
                    expense.payment_status === 'processing' ? 'processing' : 'pending'
                  }
                  label={
                    expense.payment_status === 'paid' ? 'Paid' :
                    expense.payment_status === 'partial' ? 'Partial' :
                    expense.payment_status === 'processing' ? 'Processing' : 'Unpaid'
                  }
                />
              </div>
              <p className="text-xs text-gray-500">
                {expense.type === 'advance_request' ? 'Advance Request' : 'Reimbursement'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                {expense.currency} {parseFloat(expense.amount).toLocaleString()}
              </p>
              {expense.payment_status === 'partial' && expense.remaining_amount && (
                <p className="text-xs text-amber-600">
                  Remaining: {expense.currency} {parseFloat(expense.remaining_amount).toLocaleString()}
                </p>
              )}
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
              <User className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Employee</p>
                <p className="text-sm font-medium text-gray-900">{expense.employee_name}</p>
                <p className="text-xs text-gray-500 truncate">{expense.employee_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
              <Calendar className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Date</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(expense.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
              <Tag className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Category</p>
                <p className="text-sm font-medium text-gray-900">
                  {categoryInfo.icon} {categoryInfo.label}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-white border border-gray-100 rounded-lg">
              <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
              <div>
                <p className="text-xs text-gray-500">Submitted</p>
                <p className="text-sm font-medium text-gray-900">{formatDate(expense.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-3 bg-white border border-gray-100 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-gray-500">Description</p>
                <p className="text-sm text-gray-900 mt-1">{expense.description}</p>
              </div>
            </div>
          </div>

          {/* Approval Info */}
          {(expense.manager_approved_by || expense.finance_approved_by || expense.manager_rejection_reason || expense.finance_rejection_reason) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Approval History</p>

              {expense.manager_approved_by && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">
                    Manager approved {expense.manager_approved_at && `on ${formatDate(expense.manager_approved_at)}`}
                  </span>
                </div>
              )}

              {expense.manager_rejection_reason && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="text-red-800">Manager rejected</span>
                    <p className="text-xs text-red-600 mt-0.5">{expense.manager_rejection_reason}</p>
                  </div>
                </div>
              )}

              {expense.finance_approved_by && (
                <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-green-800">
                    Finance approved {expense.finance_approved_at && `on ${formatDate(expense.finance_approved_at)}`}
                  </span>
                </div>
              )}

              {expense.finance_rejection_reason && (
                <div className="flex items-start gap-2 p-2 bg-red-50 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-red-600 mt-0.5" />
                  <div>
                    <span className="text-red-800">Finance rejected</span>
                    <p className="text-xs text-red-600 mt-0.5">{expense.finance_rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Info */}
          {expense.payment_status !== 'unpaid' && expense.payment_reference && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-xs text-blue-600">Payment Reference</p>
                  <p className="text-sm font-medium text-blue-900">{expense.payment_reference}</p>
                  {expense.payment_date && (
                    <p className="text-xs text-blue-600 mt-0.5">Paid on {formatDate(expense.payment_date)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Receipts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Receipts {existingReceipts.length > 0 && `(${existingReceipts.length})`}
            </p>

            {existingReceipts.length > 0 ? (
              <div className="space-y-2">
                {existingReceipts.map((url, index) => (
                  <a
                    key={index}
                    href={buildMediaUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors"
                  >
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <Image className="h-4 w-4 text-gray-600" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-gray-700">
                      Receipt {index + 1}
                    </span>
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                <div className="text-center">
                  <Receipt className="h-6 w-6 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No receipts attached</p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 h-9 border-gray-200"
            >
              Close
            </Button>
            {canEdit && onEdit && (
              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit();
                }}
                className="flex-1 h-9 bg-[#49a034] hover:bg-[#3d8a2b] text-white"
              >
                {expense.status === 'manager_approved' ? (
                  <>
                    <Upload className="h-4 w-4 mr-1.5" />
                    Upload Receipts
                  </>
                ) : (
                  'Edit Expense'
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
