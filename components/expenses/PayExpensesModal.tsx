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
  const [walletType, setWalletType] = useState<'personal' | 'organizational'>('personal');
  const [departmentWallet, setDepartmentWallet] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');

  const { data: walletBalance } = useWalletBalance(currency);
  const { mutate: payExpenses, isPending } = usePayExpenses();

  // Available department wallets (this should come from an API in real implementation)
  const departmentWallets = [
    { id: 'finance', name: 'Finance Department', balance: '500000.00' },
    { id: 'operations', name: 'Operations Department', balance: '750000.00' },
    { id: 'sales', name: 'Sales Department', balance: '300000.00' },
  ];

  // Get selected wallet balance
  const getWalletBalance = () => {
    if (walletType === 'personal') {
      return parseFloat(walletBalance?.balance || '0');
    } else {
      const dept = departmentWallets.find(d => d.id === departmentWallet);
      return dept ? parseFloat(dept.balance) : 0;
    }
  };

  const currentWalletBalance = getWalletBalance();

  // Calculate total amount
  const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

  // Check if wallet has sufficient balance
  const hasSufficientBalance = currentWalletBalance >= totalAmount;

  // Reset phone/account fields when payment method changes
  useEffect(() => {
    setPhoneNumber('');
    setAccountNumber('');
    setBankName('');
    setPaymentProvider('');
    setWalletType('personal');
    setDepartmentWallet('');
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

    if (paymentMethod === 'wallet' && walletType === 'organizational' && !departmentWallet) {
      toast.error('Please select a department wallet');
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
        wallet_type: paymentMethod === 'wallet' ? walletType : undefined,
        department_wallet_id: walletType === 'organizational' ? departmentWallet : undefined,
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
          setWalletType('personal');
          setDepartmentWallet('');
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
            <CreditCard className="h-6 w-6 text-[#49a034]" />
            Pay Expenses
          </DialogTitle>
          <DialogDescription>
            Process payment for {expenses.length} approved expense{expenses.length > 1 ? 's' : ''}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Payment Summary */}
          <div className="bg-gradient-to-r from-[#49a034]/10 to-transparent rounded-xl p-6 border border-gray-200">
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
              <div className="p-3 bg-[#49a034]/10 rounded-xl">
                <DollarSign className="h-8 w-8 text-[#49a034]" />
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
              {/* Wallet Type Selection */}
              <div className="space-y-3">
                <Label className="text-sm font-medium text-gray-900">Select Wallet</Label>
                <RadioGroup value={walletType} onValueChange={(value) => setWalletType(value as 'personal' | 'organizational')}>
                  <div className="grid grid-cols-2 gap-3">
                    <label
                      htmlFor="personal-wallet"
                      className={`flex items-center space-x-3 rounded-lg p-4 cursor-pointer transition-all ${
                        walletType === 'personal'
                          ? 'bg-[#49a034]/10'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <RadioGroupItem value="personal" id="personal-wallet" />
                      <div className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-[#49a034]" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">Personal Wallet</p>
                          <p className="text-xs text-gray-500">Your individual wallet</p>
                        </div>
                      </div>
                    </label>

                    <label
                      htmlFor="org-wallet"
                      className={`flex items-center space-x-3 rounded-lg p-4 cursor-pointer transition-all ${
                        walletType === 'organizational'
                          ? 'bg-[#49a034]/10'
                          : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <RadioGroupItem value="organizational" id="org-wallet" />
                      <div className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-[#49a034]" />
                        <div>
                          <p className="font-medium text-sm text-gray-900">Department Wallet</p>
                          <p className="text-xs text-gray-500">Organization funds</p>
                        </div>
                      </div>
                    </label>
                  </div>
                </RadioGroup>
              </div>

              {/* Department Wallet Selection */}
              {walletType === 'organizational' && (
                <div className="space-y-2">
                  <Label htmlFor="dept-wallet" className="text-sm font-medium text-gray-900">
                    Select Department
                  </Label>
                  <select
                    id="dept-wallet"
                    value={departmentWallet}
                    onChange={(e) => setDepartmentWallet(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white text-gray-900 border-0 shadow-sm"
                  >
                    <option value="">Choose department...</option>
                    {departmentWallets.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} - {currency} {parseFloat(dept.balance).toLocaleString()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#49a034]/10 rounded-lg">
                      {walletType === 'personal' ? (
                        <Wallet className="h-5 w-5 text-[#49a034]" />
                      ) : (
                        <Building2 className="h-5 w-5 text-[#49a034]" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {walletType === 'personal' ? 'Personal Wallet' : 'Department Wallet'} Balance
                      </p>
                      <p className="text-xs text-gray-500">
                        {walletType === 'organizational' && departmentWallet
                          ? departmentWallets.find(d => d.id === departmentWallet)?.name
                          : 'Current available balance'
                        }
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-bold text-gray-900">
                    {currency} {currentWalletBalance.toLocaleString()}
                  </p>
                </div>

                {!hasSufficientBalance && (walletType === 'personal' || (walletType === 'organizational' && departmentWallet)) && (
                  <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">Insufficient Balance</p>
                      <p className="text-xs text-red-700 mt-1">
                        You need {currency}{' '}
                        {(totalAmount - currentWalletBalance).toLocaleString()}{' '}
                        more to complete this payment. Please load your wallet first.
                      </p>
                    </div>
                  </div>
                )}

                {walletType === 'organizational' && !departmentWallet && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
                    <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-amber-900">Select Department</p>
                      <p className="text-xs text-amber-700 mt-1">
                        Please select a department wallet to proceed with payment.
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
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-[#49a034] transition-colors cursor-pointer">
                        <RadioGroupItem value="mtn" id="mtn" />
                        <Label htmlFor="mtn" className="cursor-pointer flex-1">
                          MTN Mobile Money
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2 p-3 border border-gray-200 rounded-lg hover:border-[#49a034] transition-colors cursor-pointer">
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
              className="flex-1 bg-[#49a034] hover:bg-[#3d8a2b] text-white btn-press"
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
