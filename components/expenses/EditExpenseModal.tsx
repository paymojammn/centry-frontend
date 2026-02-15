/**
 * Edit Expense Modal
 *
 * Modal for editing expenses and uploading receipts.
 * - Draft/Rejected expenses: Can edit all fields
 * - Manager Approved expenses: Can only upload receipts (accountability)
 */

'use client';

import { useState, useEffect } from 'react';
import { useUpdateExpense, useUploadReceipts } from '@/hooks/use-expenses';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Upload,
  X,
  FileText,
  Receipt,
  Image,
  ExternalLink,
  AlertCircle,
  Info,
} from 'lucide-react';
import {
  EXPENSE_CATEGORIES,
  type Expense,
  type ExpenseCategory,
} from '@/types/expense';
import { toast } from 'sonner';
import { StatusBadge } from '@/components/layout/status-badge';
import { buildMediaUrl } from '@/config/api';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  currency?: string;
}

export default function EditExpenseModal({
  isOpen,
  onClose,
  expense,
  currency = 'UGX',
}: EditExpenseModalProps) {
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  const { mutate: updateExpense, isPending: isUpdating } = useUpdateExpense();
  const { mutate: uploadReceipts, isPending: isUploading } = useUploadReceipts();

  const isPending = isUpdating || isUploading;

  // Determine what actions are allowed based on status
  const canEditFields = expense?.status === 'draft' || expense?.status === 'rejected';
  const canUploadReceipts =
    expense?.status === 'manager_approved' ||
    expense?.status === 'draft' ||
    expense?.status === 'rejected';
  const isAccountabilityMode = expense?.status === 'manager_approved';

  // Initialize form with expense data
  useEffect(() => {
    if (expense) {
      setCategory(expense.category);
      setAmount(expense.amount);
      setDescription(expense.description);
      setDate(expense.date);
      setReceiptFiles([]);
    }
  }, [expense]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter((file) => {
      // Validate file type (images and PDFs)
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type. Please upload images or PDFs.`);
        return false;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum file size is 5MB.`);
        return false;
      }
      return true;
    });

    setReceiptFiles((prev) => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setReceiptFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!expense) return;

    // For accountability mode, only upload receipts
    if (isAccountabilityMode) {
      if (receiptFiles.length === 0) {
        toast.error('Please upload at least one receipt');
        return;
      }

      uploadReceipts(
        { expenseId: expense.id, files: receiptFiles },
        {
          onSuccess: () => {
            onClose();
            setReceiptFiles([]);
          },
        }
      );
      return;
    }

    // For edit mode, update expense fields
    if (canEditFields) {
      if (!amount || parseFloat(amount) <= 0) {
        toast.error('Please enter a valid amount');
        return;
      }

      if (!description.trim()) {
        toast.error('Please enter a description');
        return;
      }

      // First update the expense
      updateExpense(
        {
          expenseId: expense.id,
          request: {
            category,
            amount,
            description: description.trim(),
            date,
          },
        },
        {
          onSuccess: () => {
            // If there are receipts to upload, do that too
            if (receiptFiles.length > 0) {
              uploadReceipts(
                { expenseId: expense.id, files: receiptFiles },
                {
                  onSuccess: () => {
                    onClose();
                    setReceiptFiles([]);
                  },
                }
              );
            } else {
              onClose();
            }
          },
        }
      );
    }
  };

  if (!expense) return null;

  // Get existing receipts
  const existingReceipts = expense.receipt_urls || (expense.receipt_url ? [expense.receipt_url] : []);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold text-foreground">
            <Receipt className="h-5 w-5 text-primary" />
            {isAccountabilityMode ? 'Submit Accountability' : 'Edit Expense'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isAccountabilityMode
              ? 'Upload receipts to complete your expense accountability'
              : 'Update expense details and upload receipts'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Expense Summary Card */}
          <div className="bg-gradient-to-r from-primary/10 to-transparent rounded-xl p-4 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Status:</span>
                <StatusBadge status={expense.status} />
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Amount</p>
                <p className="text-xl font-bold text-foreground">
                  {expense.currency} {parseFloat(expense.amount).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">{expense.employee_name}</span> &bull; {expense.description}
            </div>
          </div>

          {/* Accountability Info Banner */}
          {isAccountabilityMode && (
            <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-xl border border-primary/20">
              <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-primary">Accountability Required</p>
                <p className="text-xs text-primary/80 mt-1">
                  This advance has been approved. Upload receipts to submit your accountability.
                  Once submitted, it will go to finance for final approval.
                </p>
              </div>
            </div>
          )}

          {/* Editable Fields - Only for draft/rejected */}
          {canEditFields && (
            <>
              {/* Category */}
              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium text-foreground">
                  Category
                </Label>
                <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
                  <SelectTrigger className="w-full bg-card text-foreground border border-border focus:border-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <span>{cat.icon}</span>
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Amount */}
              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm font-medium text-foreground">
                  Amount ({currency})
                </Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-lg font-semibold bg-card text-foreground border-border focus:border-primary"
                  required
                />
              </div>

              {/* Date */}
              <div className="space-y-2">
                <Label htmlFor="date" className="text-sm font-medium text-foreground">
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  className="bg-card text-foreground border-border focus:border-primary"
                  onChange={(e) => setDate(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe the expense"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="resize-none bg-card text-foreground border-border focus:border-primary"
                  required
                />
              </div>
            </>
          )}

          {/* Existing Receipts */}
          {existingReceipts.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Existing Receipts</Label>
              <div className="space-y-2">
                {existingReceipts.map((url, index) => (
                  <a
                    key={index}
                    href={buildMediaUrl(url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-muted rounded-lg hover:bg-muted transition-colors"
                  >
                    <Image className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="flex-1 text-sm text-foreground truncate">
                      Receipt {index + 1}
                    </span>
                    <ExternalLink className="h-4 w-4 text-muted-foreground/60" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Receipt Upload */}
          {canUploadReceipts && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                {isAccountabilityMode ? 'Upload Receipts (Required)' : 'Add More Receipts'}
              </Label>
              <div className="rounded-lg p-6 bg-muted hover:bg-muted transition-colors">
                <input
                  type="file"
                  id="receipt-upload"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <label
                  htmlFor="receipt-upload"
                  className="cursor-pointer flex flex-col items-center gap-2 text-center"
                >
                  <div className="p-3 bg-card rounded-full shadow-sm">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Click to upload receipts
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PNG, JPG, PDF up to 5MB
                    </p>
                  </div>
                </label>
              </div>

              {/* New Files to Upload */}
              {receiptFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-foreground">Files to Upload:</p>
                  {receiptFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-3 p-3 bg-primary/5 rounded-lg border border-primary/20"
                    >
                      <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Read-only notice for non-editable statuses */}
          {!canEditFields && !canUploadReceipts && (
            <div className="flex items-start gap-3 p-4 bg-muted rounded-xl border border-border">
              <AlertCircle className="h-5 w-5 text-muted-foreground/60 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">View Only</p>
                <p className="text-xs text-muted-foreground mt-1">
                  This expense cannot be edited in its current status.
                </p>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 border-0 bg-muted text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            {(canEditFields || (isAccountabilityMode && receiptFiles.length > 0)) && (
              <Button
                type="submit"
                disabled={isPending || (isAccountabilityMode && receiptFiles.length === 0)}
                className="flex-1 bg-primary hover:bg-primary/80 text-white shadow-sm"
              >
                {isPending
                  ? 'Saving...'
                  : isAccountabilityMode
                  ? 'Submit Receipts'
                  : 'Save Changes'
                }
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
