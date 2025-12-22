/**
 * Pay Expenses Modal
 *
 * Modal for paying approved expenses using wallet, mobile money, or bank transfer
 */

'use client';

import { useState, useEffect } from 'react';
import { usePayExpenses } from '@/hooks/use-expenses';
import { useWalletBalance } from '@/hooks/use-wallet';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Wallet,
  Smartphone,
  Building2,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  DollarSign,
} from 'lucide-react';
import type { Expense } from '@/types/expense';
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
  const [paymentMethod, setPaymentMethod] = useState<'wallet' | 'mobile_money' | 'bank'>('wallet');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const { data: walletBalance } = useWalletBalance(currency);
  const { mutate: payExpenses, isPending } = usePayExpenses();

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  // Check if wallet has sufficient balance
  const hasSufficientBalance = walletBalance
    ? parseFloat(walletBalance.balance) >= totalAmount
    : false;

  // Reset phone/account fields when payment method changes
  useEffect(() => {
    setPhoneNumber('');
    setAccountNumber('');
    setBankName('');
    setPaymentProvider('');
  }, [paymentMethod]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate based on payment method
    if (paymentMethod === 'mobile_money' && !phoneNumber) {
      toast.error('Please enter a phone number');
      return;
    }

    if (paymentMethod === 'bank' && (!accountNumber || !bankName)) {
      toast.error('Please enter account details');
      return;
    }

    if (paymentMethod === 'wallet' && !hasSufficientBalance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    payExpenses(
      {
        expense_ids: expenses.map((e) => e.id),
        payment_method: paymentMethod,
        payment_provider: paymentProvider || undefined,
        phone_number: phoneNumber || undefined,
        account_number: accountNumber || undefined,
        bank_name: bankName || undefined,
        use_wallet: paymentMethod === 'wallet',
      },
      {
        onSuccess: () => {
          onClose();
          // Reset form
          setPaymentMethod('wallet');
          setPaymentProvider('');
          setPhoneNumber('');
          setAccountNumber('');
          setBankName('');
        },
      }
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <CreditCard className="h-6 w-6 text-[#638C80]" />
            Pay Expenses
          </DialogTitle>
          <DialogDescription>
            Process payment for {expenses.length} approved expense{expenses.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-[#638C80]/10 to-transparent rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-600 font-medium">Total Amount</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {currency} {totalAmount.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </p>
              </div>
              <div className="p-3 bg-[#638C80]/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-[#638C80]" />
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Paying {expenses.length} expense{expenses.length > 1 ? 's' : ''}</span>
            </div>
          </div>

          {/* Payment Method Tabs */}
          <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="wallet" className="gap-2">
                <Wallet className="h-4 w-4" />
                Wallet
              </TabsTrigger>
              <TabsTrigger value="mobile_money" className="gap-2">
                <Smartphone className="h-4 w-4" />
                Mobile Money
              </TabsTrigger>
              <TabsTrigger value="bank" className="gap-2">
                <Building2 className="h-4 w-4" />
                Bank
              </TabsTrigger>
            </TabsList>

            {/* Wallet Payment */}
            <TabsContent value="wallet" className="space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#638C80]/10 rounded-lg">
                      <Wallet className="h-5 w-5 text-[#638C80]" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">Wallet Balance</p>
                      <p className="text-xs text-gray-500">Current available balance</p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {currency} {parseFloat(walletBalance?.balance || '0').toLocaleString()}
                  </p>
                </div>

                {!hasSufficientBalance && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Insufficient Balance</p>
                      <p className="text-xs text-red-700 mt-1">
                        You need {currency}{' '}
                        {(totalAmount - parseFloat(walletBalance?.balance || '0')).toLocaleString()}{' '}
                        more to complete this payment. Please load your wallet first.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Mobile Money Payment */}
            <TabsContent value="mobile_money" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">Mobile Money Provider</Label>
                  <RadioGroup value={paymentProvider} onValueChange={setPaymentProvider}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-[#638C80] transition-colors cursor-pointer">
                        <RadioGroupItem value="mtn" id="mtn" />
                        <Label htmlFor="mtn" className="cursor-pointer flex-1">
                          MTN Mobile Money
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-[#638C80] transition-colors cursor-pointer">
                        <RadioGroupItem value="airtel" id="airtel" />
                        <Label htmlFor="airtel" className="cursor-pointer flex-1">
                          Airtel Money
                        </Label>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Recipient Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., 0700000000"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    required={paymentMethod === 'mobile_money'}
                  />
                  <p className="text-xs text-gray-500">
                    Payments will be sent to each employee's registered phone number
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Bank Payment */}
            <TabsContent value="bank" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank Name</Label>
                  <Input
                    id="bank-name"
                    type="text"
                    placeholder="e.g., Stanbic Bank Uganda"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    required={paymentMethod === 'bank'}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Account Number</Label>
                  <Input
                    id="account"
                    type="text"
                    placeholder="e.g., 1234567890"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    required={paymentMethod === 'bank'}
                  />
                  <p className="text-xs text-gray-500">
                    Payments will be sent to each employee's registered bank account
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Expenses List */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Expenses to be paid:</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {expenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {expense.employee_name}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{expense.description}</p>
                  </div>
                  <p className="text-sm font-bold text-gray-900 ml-4">
                    {currency} {parseFloat(expense.amount).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
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
              disabled={isPending || (paymentMethod === 'wallet' && !hasSufficientBalance)}
              className="flex-1 bg-[#638C80] hover:bg-[#547568] text-white"
            >
              {isPending
                ? 'Processing...'
                : `Pay ${currency} ${totalAmount.toLocaleString()}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
