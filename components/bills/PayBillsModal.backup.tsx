'use client';

import { useState } from 'react';
import { X, Smartphone, Building2, Loader2, CheckCircle2, XCircle, Wallet, Download, FileText } from 'lucide-react';
import type { Bill, PaymentProvider, BillPaymentRequest, BillPaymentResult } from '@/types/bill';
import { billsApi } from '@/lib/bills-api';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PayBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  organizationId: number;
  countryCode?: string;
}

// Custom payment amounts per bill
interface BillPaymentAmount {
  billId: number;
  amount: string;
  originalAmount: string;
}

export default function PayBillsModal({ 
  isOpen, 
  onClose, 
  bills, 
  organizationId,
  countryCode = 'UG' 
}: PayBillsModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'method' | 'provider' | 'details' | 'processing' | 'result' | 'export'>('method');
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank' | 'wallet' | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [note, setNote] = useState('');
  const [results, setResults] = useState<BillPaymentResult[]>([]);
  const [paymentEventIds, setPaymentEventIds] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml'>('csv');
  const [isExporting, setIsExporting] = useState(false);
  
  // Track custom payment amounts for each bill
  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, string>>(
    new Map(bills.map(bill => [bill.id, bill.amount_due]))
  );

  // Fetch payment providers
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['payment-providers', countryCode],
    queryFn: () => billsApi.getPaymentProviders(countryCode),
    enabled: isOpen,
  });

  // Check wallet balance
  const { data: walletBalanceData } = useQuery({
    queryKey: ['wallet-balance-check', bills.map(b => b.id), bills[0]?.currency_code],
    queryFn: () => billsApi.checkWalletBalance(
      bills.map(b => ({ bill_id: b.id.toString(), amount: b.amount_due })),
      bills[0]?.currency_code || 'UGX'
    ),
    enabled: isOpen && bills.length > 0,
  });

  // Payment mutation
  const paymentMutation = useMutation({
    mutationFn: billsApi.payBills,
    onSuccess: (data) => {
      setResults(data.results);
      
      // Extract payment event IDs from results
      const eventIds = data.results
        .filter(r => r.success && r.payment_event_id)
        .map(r => r.payment_event_id!);
      
      setPaymentEventIds(eventIds);
      
      // For bank transfers with successful payments, show export option
      if (paymentMethod === 'bank' && eventIds.length > 0) {
        setStep('export');
      } else {
        setStep('result');
      }
      
      // Invalidate bills queries to refresh the list
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['bill-stats'] });
    },
    onError: (error: Error) => {
      console.error('Payment error:', error);
      setResults([{
        bill_id: bills[0]?.id.toString() || '',
        success: false,
        error_message: error.message || 'Payment failed'
      }]);
      setStep('result');
    },
  });

  const handleClose = () => {
    setStep('method');
    setPaymentMethod(null);
    setPaymentProvider(null);
    setPhoneNumber('');
    setAccountNumber('');
    setBankName('');
    setNote('');
    setResults([]);
    setPaymentEventIds([]);
    setExportFormat('csv');
    setIsExporting(false);
    // Reset payment amounts to original values
    setPaymentAmounts(new Map(bills.map(bill => [bill.id, bill.amount_due])));
    onClose();
  };

  const handleExportPayment = async () => {
    if (paymentEventIds.length === 0) return;
    
    setIsExporting(true);
    
    try {
      const blob = await billsApi.exportPaymentFile(
        paymentEventIds,
        exportFormat,
        bills[0]?.org_name || 'Company',
        'UG12SBIC1234567890', // You can make this configurable
        'SBICUGKA' // You can make this configurable
      );
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bank_payments_${new Date().toISOString().split('T')[0]}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Go to result step
      setStep('result');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export payment file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSkipExport = () => {
    setStep('result');
  };

  const handleMethodSelect = (method: 'mobile_money' | 'bank' | 'wallet') => {
    setPaymentMethod(method);
    if (method === 'wallet') {
      // For wallet, go directly to details/confirmation
      setStep('details');
    } else {
      setStep('provider');
    }
  };

  const handleProviderSelect = (provider: string) => {
    setPaymentProvider(provider);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'provider') {
      setStep('method');
      setPaymentMethod(null);
    } else if (step === 'details') {
      if (paymentMethod === 'wallet') {
        setStep('method');
        setPaymentMethod(null);
      } else {
        setStep('provider');
        setPaymentProvider(null);
      }
    }
  };

  const handleAmountChange = (billId: number, amount: string) => {
    setPaymentAmounts(new Map(paymentAmounts.set(billId, amount)));
  };

  const handleSubmit = async () => {
    // For wallet payments, provider is not required
    if (!paymentMethod) return;
    if (paymentMethod !== 'wallet' && !paymentProvider) return;

    setStep('processing');

    // Prepare bill payment requests with custom amounts
    const billRequests: BillPaymentRequest[] = bills.map(bill => ({
      bill_id: bill.id.toString(),
      amount: paymentAmounts.get(bill.id) || bill.amount_due, // Use custom amount if set
      phone_number: paymentMethod === 'mobile_money' ? phoneNumber : paymentMethod === 'wallet' && paymentProvider === 'mtn' ? phoneNumber : undefined,
      account_number: paymentMethod === 'bank' ? accountNumber : paymentMethod === 'wallet' && paymentProvider !== 'mtn' && paymentProvider !== 'airtel' ? accountNumber : undefined,
      bank_name: paymentMethod === 'bank' ? bankName : paymentMethod === 'wallet' && paymentProvider !== 'mtn' && paymentProvider !== 'airtel' ? bankName : undefined,
    }));

    // Submit payment
    paymentMutation.mutate({
      bills: billRequests,
      payment_method: paymentMethod === 'wallet' ? (paymentProvider === 'mtn' || paymentProvider === 'airtel' ? 'mobile_money' : 'bank') : paymentMethod,
      payment_provider: paymentMethod === 'wallet' ? paymentProvider || 'mtn' : paymentProvider || '',
      organization_id: organizationId,
      note,
      use_wallet: paymentMethod === 'wallet',
    });
  };

  // Calculate total from custom amounts
  const totalAmount = bills.reduce((sum, bill) => {
    const customAmount = paymentAmounts.get(bill.id);
    return sum + parseFloat(customAmount || bill.amount_due || '0');
  }, 0);

  const currency = bills[0]?.currency_code || 'UGX';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Pay {bills.length} Bill{bills.length > 1 ? 's' : ''}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Total: {currency} {totalAmount.toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 1: Select Payment Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                How would you like to pay?
              </h3>
              
              {/* Wallet Balance Display */}
              {walletBalanceData && walletBalanceData.currency === currency && (
                <div className={`p-4 rounded-lg border-2 ${
                  walletBalanceData.has_sufficient_balance 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-amber-50 border-amber-200'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-gray-600" />
                      <span className="text-sm font-medium text-gray-700">Wallet Balance ({walletBalanceData.currency}):</span>
                    </div>
                    <span className="text-lg font-bold text-gray-900">
                      {currency} {parseFloat(walletBalanceData.wallet_balance).toLocaleString()}
                    </span>
                  </div>
                  {!walletBalanceData.has_sufficient_balance && (
                    <p className="text-xs text-amber-700 mt-2">
                      Insufficient balance for tracking. Required: {currency} {parseFloat(walletBalanceData.total_required).toLocaleString()}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 mt-2">
                    Note: Payment will be made from organization's mobile money account
                  </p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <button
                  onClick={() => handleMethodSelect('wallet')}
                  disabled={!walletBalanceData?.has_sufficient_balance}
                  className={`p-6 border-2 rounded-lg transition-all group ${
                    walletBalanceData?.has_sufficient_balance
                      ? 'border-gray-200 hover:border-[#638C80] hover:bg-[#638C80]/5'
                      : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
                  }`}
                >
                  <Wallet className={`w-8 h-8 mb-3 ${
                    walletBalanceData?.has_sufficient_balance
                      ? 'text-gray-400 group-hover:text-[#638C80]'
                      : 'text-gray-300'
                  }`} />
                  <h4 className="font-medium text-gray-900">Pay from Wallet</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Use wallet balance
                  </p>
                </button>

                <button
                  onClick={() => handleMethodSelect('mobile_money')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                >
                  <Smartphone className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                  <h4 className="font-medium text-gray-900">Mobile Money</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Pay via MTN, Airtel
                  </p>
                </button>

                <button
                  onClick={() => handleMethodSelect('bank')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                >
                  <Building2 className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                  <h4 className="font-medium text-gray-900">Bank Transfer</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Pay via bank account
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Provider */}
          {step === 'provider' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select {paymentMethod === 'mobile_money' ? 'Mobile Money Provider' : 'Bank'}
                </h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068]"
                >
                  Back
                </button>
              </div>

              {providersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#638C80]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {paymentMethod === 'mobile_money' && providers?.mobile_money.map((provider: PaymentProvider) => (
                    <button
                      key={provider.code}
                      onClick={() => handleProviderSelect(provider.code)}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-left"
                    >
                      <div className="font-medium text-gray-900">{provider.name}</div>
                    </button>
                  ))}

                  {paymentMethod === 'bank' && providers?.bank.map((provider: PaymentProvider) => (
                    <button
                      key={provider.code}
                      onClick={() => handleProviderSelect(provider.code)}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-left"
                    >
                      <div className="font-medium text-gray-900">{provider.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Payment Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Payment Details</h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068]"
                >
                  Back
                </button>
              </div>

              {/* Selected provider or wallet */}
              {paymentMethod !== 'wallet' && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Paying via</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {providers?.[paymentMethod === 'mobile_money' ? 'mobile_money' : 'bank']
                      .find((p: PaymentProvider) => p.code === paymentProvider)?.name}
                  </div>
                </div>
              )}

              {paymentMethod === 'wallet' && (
                <div className="bg-[#638C80]/10 rounded-lg p-4 border-2 border-[#638C80]">
                  <div className="flex items-center gap-2 mb-3">
                    <Wallet className="w-5 h-5 text-[#638C80]" />
                    <div className="text-sm font-medium text-gray-700">Paying from Wallet</div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div className="text-gray-600">Current Balance</div>
                      <div className="font-bold text-gray-900">
                        {currency} {walletBalanceData ? parseFloat(walletBalanceData.wallet_balance).toLocaleString() : '0'}
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-600">After Payment</div>
                      <div className="font-bold text-green-600">
                        {currency} {walletBalanceData ? parseFloat(walletBalanceData.remaining_balance).toLocaleString() : '0'}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bills summary with editable amounts */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">Bills to pay ({bills.length})</h4>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {bills.map((bill) => {
                    const customAmount = paymentAmounts.get(bill.id) || bill.amount_due;
                    const isPartialPayment = parseFloat(customAmount) < parseFloat(bill.amount_due);
                    
                    return (
                      <div key={bill.id} className="flex flex-col gap-2 pb-3 border-b border-gray-100 last:border-0">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-900">{bill.vendor_name}</span>
                            <div className="text-xs text-gray-500 mt-0.5">
                              Invoice: {bill.invoice_number || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">Due: {bill.currency_code} {parseFloat(bill.amount_due).toLocaleString()}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-gray-600 whitespace-nowrap">Pay amount:</label>
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
                              {bill.currency_code}
                            </span>
                            <input
                              type="number"
                              value={customAmount}
                              onChange={(e) => handleAmountChange(bill.id, e.target.value)}
                              min="0"
                              max={bill.amount_due}
                              step="0.01"
                              className="w-full pl-12 pr-3 py-1.5 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                            />
                          </div>
                          {isPartialPayment && (
                            <span className="text-xs text-amber-600 font-medium whitespace-nowrap">Partial</span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex justify-between font-medium text-gray-900">
                    <span>Total Payment</span>
                    <span>{currency} {totalAmount.toLocaleString()}</span>
                  </div>
                  {bills.some(bill => parseFloat(paymentAmounts.get(bill.id) || bill.amount_due) < parseFloat(bill.amount_due)) && (
                    <div className="mt-2 text-xs text-amber-600">
                      ⚠️ Partial payment detected - remaining balance will stay open
                    </div>
                  )}
                </div>
              </div>

              {/* Payment fields */}
              {paymentMethod === 'wallet' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      How should we disburse to vendors?
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {providers?.mobile_money.map((provider: PaymentProvider) => (
                        <button
                          key={provider.code}
                          onClick={() => setPaymentProvider(provider.code)}
                          className={`p-4 border-2 rounded-lg transition-all text-left ${
                            paymentProvider === provider.code
                              ? 'border-[#638C80] bg-[#638C80]/5'
                              : 'border-gray-200 hover:border-[#638C80]'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{provider.name}</div>
                        </button>
                      ))}
                      {providers?.bank.slice(0, 2).map((provider: PaymentProvider) => (
                        <button
                          key={provider.code}
                          onClick={() => setPaymentProvider(provider.code)}
                          className={`p-4 border-2 rounded-lg transition-all text-left ${
                            paymentProvider === provider.code
                              ? 'border-[#638C80] bg-[#638C80]/5'
                              : 'border-gray-200 hover:border-[#638C80]'
                          }`}
                        >
                          <div className="font-medium text-gray-900">{provider.name}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Vendor payment details */}
                  {paymentProvider && (paymentProvider === 'mtn' || paymentProvider === 'airtel') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Vendor Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g., 256700000000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Money will be sent to vendor's mobile money account
                      </p>
                    </div>
                  )}

                  {paymentProvider && paymentProvider !== 'mtn' && paymentProvider !== 'airtel' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Vendor Account Number
                        </label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g., 1234567890"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g., Stanbic Bank"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {paymentMethod === 'mobile_money' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="e.g., 256700000000"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                  />
                </div>
              )}

              {paymentMethod === 'bank' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g., 1234567890"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Bank Name
                    </label>
                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      placeholder="e.g., Stanbic Bank"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                    />
                  </div>
                </>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for this payment..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                />
              </div>

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={
                  (paymentMethod === 'wallet' && (!paymentProvider || 
                    ((paymentProvider === 'mtn' || paymentProvider === 'airtel') && !phoneNumber) ||
                    (paymentProvider !== 'mtn' && paymentProvider !== 'airtel' && (!accountNumber || !bankName))
                  )) ||
                  (paymentMethod === 'mobile_money' && !phoneNumber) ||
                  (paymentMethod === 'bank' && (!accountNumber || !bankName))
                }
                className="w-full bg-[#638C80] text-white py-3 rounded-lg hover:bg-[#4f7068] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                {paymentMethod === 'wallet' ? 'Pay from Wallet & Disburse' : 'Process Payment'}
              </button>
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#638C80] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Payment...</h3>
              <p className="text-sm text-gray-500">
                Please wait while we process your payment
              </p>
            </div>
          )}

          {/* Step 5: Export Payment File (Bank Transfer Only) */}
          {step === 'export' && (
            <div className="space-y-6">
              <div className="text-center py-6">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Payment Instructions Created
                </h3>
                <p className="text-sm text-gray-500">
                  {results.filter(r => r.success).length} payment{results.filter(r => r.success).length > 1 ? 's' : ''} ready for bank processing
                </p>
              </div>

              {/* Export format selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Download Payment File
                </h4>
                <p className="text-sm text-blue-700 mb-4">
                  Generate a file to upload to your bank's system to process these payments
                </p>
                
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    File Format
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setExportFormat('csv')}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        exportFormat === 'csv'
                          ? 'border-[#638C80] bg-[#638C80]/5'
                          : 'border-gray-200 hover:border-[#638C80]'
                      }`}
                    >
                      <div className="font-medium text-gray-900">CSV Format</div>
                      <div className="text-xs text-gray-500 mt-1">
                        For Stanbic and most banks
                      </div>
                    </button>
                    <button
                      onClick={() => setExportFormat('xml')}
                      className={`p-4 border-2 rounded-lg transition-all text-left ${
                        exportFormat === 'xml'
                          ? 'border-[#638C80] bg-[#638C80]/5'
                          : 'border-gray-200 hover:border-[#638C80]'
                      }`}
                    >
                      <div className="font-medium text-gray-900">XML Format</div>
                      <div className="text-xs text-gray-500 mt-1">
                        ISO 20022 (pain.001)
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Payment summary */}
              <div className="border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-3">
                  Payments to Export ({paymentEventIds.length})
                </h4>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {results.filter(r => r.success).map((result) => {
                    const bill = bills.find(b => b.id.toString() === result.bill_id);
                    return (
                      <div key={result.bill_id} className="flex justify-between text-sm">
                        <span className="text-gray-600">{bill?.vendor_name}</span>
                        <span className="font-medium text-gray-900">
                          {bill?.currency_code} {bill ? parseFloat(bill.amount_due).toLocaleString() : ''}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleSkipExport}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  Skip for Now
                </button>
                <button
                  onClick={handleExportPayment}
                  disabled={isExporting}
                  className="flex-1 bg-[#638C80] text-white py-3 rounded-lg hover:bg-[#4f7068] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download {exportFormat.toUpperCase()} File
                    </>
                  )}
                </button>
              </div>

              <p className="text-xs text-gray-500 text-center">
                You can download this file later from the payment history
              </p>
            </div>
          )}

          {/* Step 6: Results */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {results.every(r => r.success) ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Payment Successful!
                    </h3>
                    <p className="text-sm text-gray-500">
                      {results.length} bill{results.length > 1 ? 's' : ''} paid successfully
                    </p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Payment Issues
                    </h3>
                    <p className="text-sm text-gray-500">
                      Some payments could not be processed
                    </p>
                  </>
                )}
              </div>

              {/* Results list */}
              <div className="border border-gray-200 rounded-lg divide-y divide-gray-200">
                {results.map((result) => {
                  const bill = bills.find(b => b.id.toString() === result.bill_id);
                  return (
                    <div key={result.bill_id} className="p-4 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {bill?.vendor_name || `Bill #${result.bill_id}`}
                        </div>
                        {result.reference && (
                          <div className="text-xs text-gray-500 mt-1">
                            Ref: {result.reference}
                          </div>
                        )}
                        {result.error_message && (
                          <div className="text-xs text-red-600 mt-1">
                            {result.error_message}
                          </div>
                        )}
                      </div>
                      <div>
                        {result.success ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-500" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-[#638C80] text-white py-3 rounded-lg hover:bg-[#4f7068] transition-colors font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
