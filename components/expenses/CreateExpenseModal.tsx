/**
 * Create Expense Modal
 *
 * Modal for submitting new expense requests
 */

'use client';

import { useState } from 'react';
import { useCreateExpense } from '@/hooks/use-expenses';
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
import { Upload, X, FileText, Receipt, Wallet, CreditCard } from 'lucide-react';
import { EXPENSE_CATEGORIES, type ExpenseCategory, type ExpenseType } from '@/types/expense';
import { toast } from 'sonner';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  currency?: string;
  advanceRequestId?: string; // For submitting accountability
}

export default function CreateExpenseModal({
  isOpen,
  onClose,
  organizationId,
  currency = 'UGX',
  advanceRequestId,
}: CreateExpenseModalProps) {
  const [type, setType] = useState<ExpenseType>(advanceRequestId ? 'reimbursement' : 'advance_request');
  const [category, setCategory] = useState<ExpenseCategory>('other');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'wallet'>('mobile_money');
  const [receiptFiles, setReceiptFiles] = useState<File[]>([]);

  const { mutate: createExpense, isPending } = useCreateExpense();

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

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    // Validate based on type
    if (type === 'advance_request' && paymentMethod === 'mobile_money' && !phoneNumber.trim()) {
      toast.error('Please enter a phone number for mobile money payment');
      return;
    }

    if (type === 'reimbursement' && receiptFiles.length === 0) {
      toast.error('Please upload at least one receipt for reimbursement');
      return;
    }

    createExpense(
      {
        organization_id: organizationId,
        type,
        category,
        amount,
        currency,
        description: description.trim(),
        date,
        phone_number: type === 'advance_request' && paymentMethod === 'mobile_money' ? phoneNumber : undefined,
        payment_method: type === 'advance_request' ? paymentMethod : undefined,
        receipt_files: receiptFiles.length > 0 ? receiptFiles : undefined,
        advance_request_id: advanceRequestId,
      },
      {
        onSuccess: () => {
          onClose();
          // Reset form
          setType(advanceRequestId ? 'reimbursement' : 'advance_request');
          setCategory('other');
          setAmount('');
          setDescription('');
          setDate(new Date().toISOString().split('T')[0]);
          setPhoneNumber('');
          setPaymentMethod('mobile_money');
          setReceiptFiles([]);
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Receipt className="h-6 w-6 text-[#638C80]" />
            {advanceRequestId ? 'Submit Accountability' : 'Submit Expense'}
          </DialogTitle>
          <DialogDescription>
            {advanceRequestId
              ? 'Submit receipts for your advance request'
              : 'Request advance payment or submit reimbursement claim'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Request Type - Only show if not accountability */}
          {!advanceRequestId && (
            <div className="space-y-3">
              <Label className="text-sm font-medium">Request Type</Label>
              <RadioGroup value={type} onValueChange={(value) => setType(value as ExpenseType)}>
                <div className="grid grid-cols-2 gap-4">
                  <label
                    htmlFor="advance"
                    className={`flex items-center space-x-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      type === 'advance_request'
                        ? 'border-[#638C80] bg-[#638C80]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value="advance_request" id="advance" />
                    <div className="flex items-center gap-2">
                      <Wallet className="h-5 w-5 text-[#638C80]" />
                      <div>
                        <p className="font-medium text-sm">Advance Request</p>
                        <p className="text-xs text-gray-500">Get money upfront</p>
                      </div>
                    </div>
                  </label>

                  <label
                    htmlFor="reimbursement"
                    className={`flex items-center space-x-3 border-2 rounded-xl p-4 cursor-pointer transition-all ${
                      type === 'reimbursement'
                        ? 'border-[#638C80] bg-[#638C80]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <RadioGroupItem value="reimbursement" id="reimbursement" />
                    <div className="flex items-center gap-2">
                      <Receipt className="h-5 w-5 text-[#638C80]" />
                      <div>
                        <p className="font-medium text-sm">Reimbursement</p>
                        <p className="text-xs text-gray-500">Already spent</p>
                      </div>
                    </div>
                  </label>
                </div>
              </RadioGroup>
            </div>
          )}

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
              <SelectTrigger className="w-full">
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
            <Label htmlFor="amount" className="text-sm font-medium">
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
              className="text-lg font-semibold"
              required
            />
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label htmlFor="date" className="text-sm font-medium">
              Date
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="Describe the expense (e.g., Taxi from office to client meeting)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="resize-none"
              required
            />
          </div>

          {/* Advance Request Fields */}
          {type === 'advance_request' && (
            <>
              {/* Payment Method */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Payment Method</Label>
                <RadioGroup value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'mobile_money' | 'wallet')}>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      htmlFor="mobile_money"
                      className={`flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer ${
                        paymentMethod === 'mobile_money' ? 'border-[#638C80] bg-[#638C80]/5' : 'border-gray-200'
                      }`}
                    >
                      <RadioGroupItem value="mobile_money" id="mobile_money" />
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm">Mobile Money</span>
                      </div>
                    </label>

                    <label
                      htmlFor="wallet"
                      className={`flex items-center space-x-3 border-2 rounded-lg p-3 cursor-pointer ${
                        paymentMethod === 'wallet' ? 'border-[#638C80] bg-[#638C80]/5' : 'border-gray-200'
                      }`}
                    >
                      <RadioGroupItem value="wallet" id="wallet" />
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4" />
                        <span className="text-sm">Wallet</span>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Phone Number (only for mobile money) */}
              {paymentMethod === 'mobile_money' && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium">
                    Mobile Money Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="256700000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required
                  />
                  <p className="text-xs text-gray-500">Enter your MTN or Airtel number</p>
                </div>
              )}
            </>
          )}

          {/* Receipt Upload */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Receipts {type === 'reimbursement' || advanceRequestId ? '(Required)' : '(Optional)'}
            </Label>
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-[#638C80] transition-colors">
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
                <div className="p-3 bg-gray-50 rounded-full">
                  <Upload className="h-6 w-6 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload receipts
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, PDF up to 5MB
                  </p>
                </div>
              </label>
            </div>

            {/* Uploaded Files */}
            {receiptFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Uploaded Files:</p>
                {receiptFiles.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                  >
                    <FileText className="h-5 w-5 text-gray-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors"
                    >
                      <X className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isPending}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="flex-1 bg-[#638C80] hover:bg-[#547568] text-white"
            >
              {isPending ? 'Submitting...' : 'Submit Expense'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
