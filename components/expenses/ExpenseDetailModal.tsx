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
          <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <Receipt className="h-5 w-5 text-primary" />
            Expense Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status and Amount Header */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
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
              <p className="text-xs text-muted-foreground">
                {expense.type === 'advance_request' ? 'Advance Request' : 'Reimbursement'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-foreground">
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
            <div className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg">
              <User className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Employee</p>
                <p className="text-sm font-medium text-foreground">{expense.employee_name}</p>
                <p className="text-xs text-muted-foreground truncate">{expense.employee_email}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg">
              <Calendar className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Date</p>
                <p className="text-sm font-medium text-foreground">{formatDate(expense.date)}</p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg">
              <Tag className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Category</p>
                <p className="text-sm font-medium text-foreground">
                  {categoryInfo.icon} {categoryInfo.label}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2 p-3 bg-card border border-border rounded-lg">
              <Clock className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Submitted</p>
                <p className="text-sm font-medium text-foreground">{formatDate(expense.created_at)}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="p-3 bg-card border border-border rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-muted-foreground/60 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Description</p>
                <p className="text-sm text-foreground mt-1">{expense.description}</p>
              </div>
            </div>
          </div>

          {/* Approval Info */}
          {(expense.manager_approved_by || expense.finance_approved_by || expense.manager_rejection_reason || expense.finance_rejection_reason) && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Approval History</p>

              {expense.manager_approved_by && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary">
                    Manager approved {expense.manager_approved_at && `on ${formatDate(expense.manager_approved_at)}`}
                  </span>
                </div>
              )}

              {expense.manager_rejection_reason && (
                <div className="flex items-start gap-2 p-2 bg-destructive/5 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <span className="text-destructive">Manager rejected</span>
                    <p className="text-xs text-destructive mt-0.5">{expense.manager_rejection_reason}</p>
                  </div>
                </div>
              )}

              {expense.finance_approved_by && (
                <div className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg text-sm">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  <span className="text-primary">
                    Finance approved {expense.finance_approved_at && `on ${formatDate(expense.finance_approved_at)}`}
                  </span>
                </div>
              )}

              {expense.finance_rejection_reason && (
                <div className="flex items-start gap-2 p-2 bg-destructive/5 rounded-lg text-sm">
                  <XCircle className="h-4 w-4 text-destructive mt-0.5" />
                  <div>
                    <span className="text-destructive">Finance rejected</span>
                    <p className="text-xs text-destructive mt-0.5">{expense.finance_rejection_reason}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Payment Info */}
          {expense.payment_status !== 'unpaid' && expense.payment_reference && (
            <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-xs text-primary">Payment Reference</p>
                  <p className="text-sm font-medium text-primary">{expense.payment_reference}</p>
                  {expense.payment_date && (
                    <p className="text-xs text-primary mt-0.5">Paid on {formatDate(expense.payment_date)}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Receipts */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
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
                    className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg hover:bg-muted hover:border-border transition-colors"
                  >
                    <div className="p-2 bg-muted rounded-lg">
                      <Image className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="flex-1 text-sm font-medium text-foreground">
                      Receipt {index + 1}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/60" />
                  </a>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center p-6 bg-muted rounded-lg border border-dashed border-border">
                <div className="text-center">
                  <Receipt className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">No receipts attached</p>
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
              className="flex-1 h-9 border-border"
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
                className="flex-1 h-9 bg-primary hover:bg-primary/80 text-white"
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
