/**
 * Pay Expenses Modal
 *
 * Compact modal for creating payment requests for approved expenses.
 */

'use client';

import { useState, useEffect } from 'react';
import { useCreatePaymentRequest } from '@/hooks/use-expenses';
import { useDepartmentWallets } from '@/hooks/use-wallet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Wallet,
  Smartphone,
  Building2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Expense, PaymentRequestMethod } from '@/types/expense';
import { toast } from 'sonner';

interface PayExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  organizationId: string;
  currency?: string;
}

export default function PayExpensesModal({
  isOpen,
  onClose,
  expenses,
  organizationId,
  currency = 'UGX',
}: PayExpensesModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentRequestMethod>('wallet');
  const [selectedWalletId, setSelectedWalletId] = useState<string>('');
  const [destinationPhone, setDestinationPhone] = useState('');
  const [destinationBankName, setDestinationBankName] = useState('');
  const [destinationAccountName, setDestinationAccountName] = useState('');
  const [destinationAccountNumber, setDestinationAccountNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});
  const [showAmountEditor, setShowAmountEditor] = useState(false);

  const { data: walletsData, isLoading: walletsLoading } = useDepartmentWallets(organizationId);
  const departmentWallets = walletsData?.results || [];
  const { mutate: createPaymentRequest, isPending } = useCreatePaymentRequest();

  const selectedWallet = departmentWallets.find((w: any) => w.id === selectedWalletId);

  const getPayableAmount = (expense: Expense): number => {
    if (expense.payment_status === 'partial' && expense.remaining_amount) {
      return parseFloat(expense.remaining_amount);
    }
    return parseFloat(expense.amount);
  };

  const getPaymentAmount = (expense: Expense): number => {
    const customAmount = customAmounts[expense.id];
    if (customAmount && !isNaN(parseFloat(customAmount))) {
      return parseFloat(customAmount);
    }
    return getPayableAmount(expense);
  };

  const totalAmount = expenses.reduce((sum, expense) => sum + getPaymentAmount(expense), 0);
  const hasPartialPayments = expenses.some((e) => e.payment_status === 'partial');
  const hasCustomAmounts = Object.values(customAmounts).some((v) => v && v.trim() !== '');

  const hasSufficientBalance = selectedWallet
    ? parseFloat(selectedWallet.balance) >= totalAmount
    : false;

  // Reset on method change
  useEffect(() => {
    setDestinationPhone('');
    setDestinationBankName('');
    setDestinationAccountName('');
    setDestinationAccountNumber('');
    if (paymentMethod !== 'wallet') setSelectedWalletId('');
  }, [paymentMethod]);

  // Reset custom amounts on expense change
  useEffect(() => {
    setCustomAmounts({});
    setShowAmountEditor(false);
  }, [expenses]);

  // Set default phone
  useEffect(() => {
    if (expenses.length > 0 && expenses[0].phone_number) {
      setDestinationPhone(expenses[0].phone_number);
    }
  }, [expenses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (paymentMethod === 'wallet' && !selectedWalletId) {
      toast.error('Please select a wallet');
      return;
    }
    if (paymentMethod === 'wallet' && !hasSufficientBalance) {
      toast.error('Insufficient balance');
      return;
    }
    if (paymentMethod === 'mobile_money' && !destinationPhone) {
      toast.error('Please enter a phone number');
      return;
    }
    if (paymentMethod === 'bank' && (!destinationBankName || !destinationAccountName || !destinationAccountNumber)) {
      toast.error('Please enter all bank details');
      return;
    }

    let successCount = 0;
    let failCount = 0;

    for (const expense of expenses) {
      const paymentAmount = getPaymentAmount(expense);
      const payableAmount = getPayableAmount(expense);
      const customAmount = paymentAmount !== payableAmount ? paymentAmount.toString() : undefined;

      try {
        await new Promise<void>((resolve, reject) => {
          createPaymentRequest(
            {
              expense_id: expense.id,
              payment_method: paymentMethod,
              amount: customAmount,
              source_wallet_id: paymentMethod === 'wallet' ? selectedWalletId : undefined,
              destination_phone: paymentMethod === 'mobile_money' || paymentMethod === 'wallet'
                ? destinationPhone || expense.phone_number
                : undefined,
              destination_bank_name: paymentMethod === 'bank' ? destinationBankName : undefined,
              destination_bank_account_name: paymentMethod === 'bank' ? destinationAccountName : undefined,
              destination_bank_account_number: paymentMethod === 'bank' ? destinationAccountNumber : undefined,
              notes: notes || undefined,
            },
            {
              onSuccess: () => { successCount++; resolve(); },
              onError: () => { failCount++; reject(); },
            }
          );
        });
      } catch {
        // counted
      }
    }

    if (successCount > 0) {
      toast.success(`${successCount} payment request${successCount > 1 ? 's' : ''} submitted`);
      onClose();
      setPaymentMethod('wallet');
      setSelectedWalletId('');
      setDestinationPhone('');
      setDestinationBankName('');
      setDestinationAccountName('');
      setDestinationAccountNumber('');
      setNotes('');
      setCustomAmounts({});
    }
    if (failCount > 0) {
      toast.error(`Failed: ${failCount} request${failCount > 1 ? 's' : ''}`);
    }
  };

  const methodOptions = [
    { value: 'wallet', label: 'Wallet', icon: Wallet },
    { value: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
    { value: 'bank', label: 'Bank', icon: Building2 },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            Request Payment
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Summary Bar */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="text-sm text-muted-foreground">
              {expenses.length} expense{expenses.length > 1 ? 's' : ''}
              {hasPartialPayments && <span className="text-amber-600 ml-1">(partial)</span>}
            </div>
            <div className="text-lg font-bold text-foreground">
              {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Payment Method</Label>
            <div className="grid grid-cols-3 gap-2">
              {methodOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setPaymentMethod(opt.value as PaymentRequestMethod)}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    paymentMethod === opt.value
                      ? 'bg-primary text-white'
                      : 'bg-muted text-foreground hover:bg-muted'
                  }`}
                >
                  <opt.icon className="h-4 w-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Wallet Selection */}
          {paymentMethod === 'wallet' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Select Wallet</Label>
              {walletsLoading ? (
                <div className="p-3 text-center text-sm text-muted-foreground">Loading...</div>
              ) : departmentWallets.length === 0 ? (
                <div className="flex items-center gap-2 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  No wallets available
                </div>
              ) : (
                <>
                  <select
                    value={selectedWalletId}
                    onChange={(e) => setSelectedWalletId(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg bg-card text-foreground text-sm border border-border focus:border-primary focus:ring-1 focus:ring-primary"
                  >
                    <option value="">Choose wallet...</option>
                    {departmentWallets.map((wallet: any) => (
                      <option key={wallet.id} value={wallet.id}>
                        {wallet.name} - {currency} {parseFloat(wallet.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                  {selectedWallet && !hasSufficientBalance && (
                    <div className="flex items-center gap-2 p-2 bg-destructive/5 rounded-lg text-xs text-destructive">
                      <AlertCircle className="h-3.5 w-3.5" />
                      Insufficient balance (need {currency} {(totalAmount - parseFloat(selectedWallet.balance)).toLocaleString()} more)
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Mobile Money Fields */}
          {paymentMethod === 'mobile_money' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Phone Number</Label>
              <Input
                type="tel"
                placeholder="e.g., 0700000000"
                value={destinationPhone}
                onChange={(e) => setDestinationPhone(e.target.value)}
                className="h-9 border-border focus:border-primary"
              />
            </div>
          )}

          {/* Bank Fields */}
          {paymentMethod === 'bank' && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground">Bank Name</Label>
                <Input
                  placeholder="e.g., Stanbic Bank"
                  value={destinationBankName}
                  onChange={(e) => setDestinationBankName(e.target.value)}
                  className="h-9 border-border focus:border-primary"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Account Name</Label>
                  <Input
                    placeholder="John Doe"
                    value={destinationAccountName}
                    onChange={(e) => setDestinationAccountName(e.target.value)}
                    className="h-9 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-foreground">Account Number</Label>
                  <Input
                    placeholder="1234567890"
                    value={destinationAccountNumber}
                    onChange={(e) => setDestinationAccountNumber(e.target.value)}
                    className="h-9 border-border focus:border-primary"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Optional Phone for Wallet Disbursement */}
          {paymentMethod === 'wallet' && selectedWalletId && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-foreground">Recipient Phone (optional)</Label>
              <Input
                type="tel"
                placeholder="For mobile money disbursement"
                value={destinationPhone}
                onChange={(e) => setDestinationPhone(e.target.value)}
                className="h-9 border-border focus:border-primary"
              />
            </div>
          )}

          {/* Expenses List (Collapsible) */}
          <div className="border border-border rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAmountEditor(!showAmountEditor)}
              className="w-full flex items-center justify-between px-3 py-2 bg-muted text-sm text-foreground hover:bg-muted"
            >
              <span>
                {expenses.length} expense{expenses.length > 1 ? 's' : ''}
                {hasCustomAmounts && <span className="text-amber-600 ml-1">(custom amounts)</span>}
              </span>
              {showAmountEditor ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>

            {showAmountEditor && (
              <div className="max-h-48 overflow-y-auto divide-y divide-border">
                {expenses.map((expense) => {
                  const payableAmount = getPayableAmount(expense);
                  const isPartial = expense.payment_status === 'partial';
                  const customAmount = customAmounts[expense.id] || '';

                  return (
                    <div key={expense.id} className="px-3 py-2 bg-card">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{expense.employee_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{expense.description}</p>
                        </div>
                        <div className="ml-3 text-right">
                          <p className="text-sm font-semibold text-foreground">
                            {currency} {payableAmount.toLocaleString()}
                          </p>
                          {isPartial && <span className="text-xs text-amber-600">remaining</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">Pay:</span>
                        <div className="relative flex-1">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">{currency}</span>
                          <Input
                            type="number"
                            placeholder={payableAmount.toString()}
                            value={customAmount}
                            onChange={(e) => setCustomAmounts((prev) => ({ ...prev, [expense.id]: e.target.value }))}
                            max={payableAmount}
                            min={0}
                            step="0.01"
                            className="h-7 pl-10 text-xs border-border focus:border-primary"
                          />
                        </div>
                        {customAmount && parseFloat(customAmount) < payableAmount && (
                          <span className="text-xs text-amber-600">Partial</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-foreground">Notes (optional)</Label>
            <Input
              placeholder="Add a note for the approver..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-9 border-border focus:border-primary"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isPending} className="flex-1 h-9">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending || (paymentMethod === 'wallet' && (!selectedWalletId || !hasSufficientBalance))}
              className="flex-1 h-9 bg-primary hover:bg-primary/80 text-white"
            >
              {isPending ? 'Submitting...' : `Pay ${currency} ${totalAmount.toLocaleString()}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
