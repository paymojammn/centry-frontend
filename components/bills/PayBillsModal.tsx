'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { X, Loader2, CheckCircle2, XCircle, AlertCircle, Download, FileText, Sparkles, Building2, Smartphone } from 'lucide-react';
import type { Bill } from '@/types/bill';
import { usePaymentSources } from '@/hooks/use-payment-sources';
import type { PaymentSource } from '@/types/payment-sources';
import PaymentSourceSelector from './PaymentSourceSelector';
import RecipientDetailsStep from './RecipientDetailsStep';
import { billsApi } from '@/lib/bills-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface PayBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  organizationId: string;
  countryCode?: string;
}

type PaymentStep = 'source' | 'recipients' | 'confirm' | 'processing' | 'export' | 'result';

interface PaymentResult {
  success: boolean;
  bill_id: string;
  reference?: string;
  payment_event_id?: number;
  error_message?: string;
}

interface RecipientDetails {
  bill_id: number;
  recipient_type: 'mobile' | 'bank';
  // For mobile money
  phone_number?: string;
  contact_id?: number;
  contact_name?: string;
  // For bank account
  recipient_bank_id?: number;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
}

export default function PayBillsModal({
  isOpen,
  onClose,
  bills,
  organizationId,
  countryCode
}: PayBillsModalProps) {
  const queryClient = useQueryClient();

  // Payment sources - pass organizationId to fetch sources for selected tenant
  const { data: sourcesData, isLoading: sourcesLoading, error: sourcesError } = usePaymentSources(organizationId);
  const allSources = useMemo(() => {
    if (!sourcesData) return [];
    return [
      ...(sourcesData.mobile_money_accounts || []),
      ...(sourcesData.bank_accounts || [])
    ];
  }, [sourcesData]);

  // Log for debugging
  useEffect(() => {
    if (sourcesData) {
      console.log('📊 Payment sources data:', sourcesData);
      console.log('📋 All sources merged:', allSources);
    }
    if (sourcesError) {
      console.error('❌ Payment sources error:', sourcesError);
    }
  }, [sourcesData, allSources, sourcesError]);

  // State
  const [step, setStep] = useState<PaymentStep>('source');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [recipients, setRecipients] = useState<Map<number, RecipientDetails>>(new Map());
  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, string>>(new Map());
  const [note, setNote] = useState('');
  const [results, setResults] = useState<PaymentResult[]>([]);
  const [paymentEventIds, setPaymentEventIds] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  // Get currency from first bill (assuming all same currency)
  const currency = bills[0]?.currency_code ? String(bills[0].currency_code).split('.').pop() || 'UGX' : 'UGX';

  // Calculate total
  const totalAmount = useMemo(() => {
    return bills.reduce((sum, bill) => {
      const customAmount = paymentAmounts.get(bill.id);
      const amount = customAmount ? parseFloat(customAmount) : parseFloat(bill.amount_due);
      return sum + amount;
    }, 0);
  }, [bills, paymentAmounts]);

  // Check if selected source has sufficient balance
  // Note: For cross-currency payments, we'll do the conversion check on the backend
  const hasSufficientBalance = useMemo(() => {
    if (!selectedSource) return false;
    // If same currency, check balance directly
    if (selectedSource.currency === currency) {
      return parseFloat(selectedSource.balance) >= totalAmount;
    }
    // For different currencies, we'll allow the payment and do conversion on backend
    // Just check that there's some balance
    return parseFloat(selectedSource.balance) > 0;
  }, [selectedSource, totalAmount, currency]);

  // Payment mutation
  const payBillsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSource) throw new Error('No payment source selected');

      // Build payment request based on source type
      const paymentData: any = {
        organization_id: organizationId,
        bill_ids: bills.map(b => b.id),
        amounts: Object.fromEntries(
          bills.map(bill => [
            bill.id.toString(),
            paymentAmounts.get(bill.id) || bill.amount_due
          ])
        ),
        currency_code: currency,
        note: note || undefined
      };

      // Add source-specific fields
      if (selectedSource.type === 'mobile_money') {
        paymentData.payment_method = 'mobile_money';
        paymentData.mobile_money_account_id = selectedSource.id;
        // Backend will get provider from MobileMoneyAccount.provider
      } else if (selectedSource.type === 'bank_account') {
        paymentData.payment_method = 'bank';
        paymentData.bank_account_id = selectedSource.id;
        paymentData.account_number = selectedSource.account_number;
        paymentData.bank_name = selectedSource.bank_name;
      }

      // Add recipient details for each bill
      if (recipients.size > 0) {
        console.log('📦 Recipients before mapping:', Array.from(recipients.entries()));
        paymentData.recipients = Array.from(recipients.values()).map(recipient => ({
          bill_id: recipient.bill_id,
          recipient_type: recipient.recipient_type,
          // Mobile money fields
          phone_number: recipient.phone_number,
          // Bank transfer fields
          recipient_bank_id: recipient.recipient_bank_id,
          bank_name: recipient.bank_name,
          swift_code: recipient.swift_code,
          account_number: recipient.account_number,
          account_name: recipient.account_name,
        }));
        console.log('📤 Recipients after mapping:', paymentData.recipients);
      }

      const response = await billsApi.payBills(paymentData);
      return response;
    },
    onSuccess: (data) => {
      console.log('💰 Payment response:', data);
      console.log('📋 Payment results details:', data.results);
      setResults(data.results || []);
      const eventIds = data.results
        ?.filter((r: PaymentResult) => r.success && r.payment_event_id)
        .map((r: PaymentResult) => r.payment_event_id!) || [];
      console.log('🎫 Extracted payment event IDs:', eventIds);
      console.log('❌ Failed results:', data.results?.filter((r: PaymentResult) => !r.success));
      setPaymentEventIds(eventIds);

      // If bank transfer, go to export step
      if (selectedSource?.type === 'bank_account') {
        setStep('export');
      } else {
        setStep('result');
      }

      // Refresh bills
      queryClient.invalidateQueries({ queryKey: ['bills'] });
    },
    onError: (error: any) => {
      console.error('Payment error:', error);
      setResults([{
        success: false,
        bill_id: 'all',
        error_message: error.message || 'Payment failed'
      }]);
      setStep('result');
    }
  });

  // Handlers
  const handleSourceSelect = (source: PaymentSource) => {
    setSelectedSource(source);
  };

  const handleAmountChange = (billId: number, value: string) => {
    const newAmounts = new Map(paymentAmounts);
    newAmounts.set(billId, value);
    setPaymentAmounts(newAmounts);
  };

  const handleConfirm = () => {
    setStep('processing');
    payBillsMutation.mutate();
  };

  const handleBack = () => {
    if (step === 'confirm') setStep('recipients');
    else if (step === 'recipients') setStep('source');
  };

  const handleClose = () => {
    // Reset state
    setStep('source');
    setSelectedSource(null);
    setRecipients(new Map());
    setPaymentAmounts(new Map());
    setNote('');
    setResults([]);
    setPaymentEventIds([]);
    onClose();
  };

  const handleExportPayment = async (allowConversion = false) => {
    setIsExporting(true);
    console.log('🚀 Exporting payment file with:', { paymentEventIds, exportFormat, allowConversion });
    try {
      const sourceAccountId = selectedSource?.type === 'bank_account' ? selectedSource.id : undefined;
      const result = await billsApi.exportBillPayment(
        paymentEventIds,
        exportFormat,
        allowConversion,
        sourceAccountId
      );
      
      // Check if currency conversion is required
      if (result.requires_conversion && !allowConversion) {
        console.log('💱 Currency conversion required:', result.mismatched_payments);
        
        const mismatchedPayments = result.mismatched_payments || [];
        const conversionDetails = mismatchedPayments.map(p => 
          `• Bill ${p.bill_number || p.bill_id}: ${p.amount} ${p.from_currency} → ${p.to_currency}`
        ).join('\n');
        
        const userConfirmed = confirm(
          `${result.message}\n\n${conversionDetails}\n\n${result.prompt}`
        );
        
        if (userConfirmed) {
          // Retry with conversion allowed
          return handleExportPayment(true);
        } else {
          setIsExporting(false);
          return;
        }
      }
      
      console.log('✅ Export successful:', result);
      
      // Show success message with file details
      alert(`Payment file generated successfully!\n\nFilename: ${result.filename}\nPayments: ${result.payment_count}\n\nFile saved to server.`);
      
      setStep('result');
    } catch (error: any) {
      console.error('Export error:', error);
      
      // Check if error response contains conversion info
      const errorMessage = error?.message || error?.toString() || 'Failed to export payment file';
      
      if (errorMessage.includes('conversion') || errorMessage.includes('currency')) {
        alert(`Currency Conversion Required\n\n${errorMessage}\n\nPlease ensure all payments use the same currency as your bank account.`);
      } else {
        alert(`Failed to export payment file\n\n${errorMessage}`);
      }
    } finally {
      setIsExporting(false);
    }
  };

  const handleSkipExport = () => {
    setStep('result');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-br from-[#638C80]/5 to-white">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-[#638C80]" />
              Pay Bills
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {bills.length} bill{bills.length > 1 ? 's' : ''} • {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Payment Source */}
          {step === 'source' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Choose Payment Source
                </h3>
                <p className="text-sm text-gray-600">
                  Select where you want to pay from
                </p>
              </div>

              {sourcesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-10 h-10 animate-spin text-[#638C80]" />
                </div>
              ) : sourcesError ? (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6 text-center">
                  <AlertCircle className="w-10 h-10 text-red-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-red-900 mb-2">Error Loading Payment Sources</h4>
                  <p className="text-sm text-red-700">
                    {sourcesError instanceof Error ? sourcesError.message : 'Failed to load payment sources. Please check your connection and try again.'}
                  </p>
                </div>
              ) : (
                <PaymentSourceSelector
                  sources={allSources}
                  selectedSource={selectedSource}
                  onSelect={handleSourceSelect}
                  billCurrency={currency}
                  billAmount={totalAmount}
                />
              )}

              {selectedSource && !hasSufficientBalance && (
                <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-900">Insufficient Balance</h4>
                    <p className="text-sm text-red-700 mt-1">
                      This payment source doesn't have enough balance. Please top up or select another source.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep('recipients')}
                disabled={!selectedSource || !hasSufficientBalance}
                className="w-full bg-gradient-to-r from-[#638C80] to-[#4f7068] text-white py-4 rounded-xl hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
              >
                Continue to Recipients
              </button>
            </div>
          )}

          {/* Step 2: Recipient Details */}
          {step === 'recipients' && selectedSource && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Step 2: Recipient Details
                </h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068] font-medium"
                >
                  ← Back
                </button>
              </div>

              <RecipientDetailsStep
                bills={bills}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                paymentMethod={selectedSource.type}
              />

              <button
                onClick={() => setStep('confirm')}
                disabled={recipients.size !== bills.length}
                className="w-full bg-gradient-to-r from-[#638C80] to-[#4f7068] text-white py-4 rounded-xl hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed font-semibold text-lg"
              >
                Continue to Review
              </button>
            </div>
          )}

          {/* Step 3: Confirm Payment */}
          {step === 'confirm' && selectedSource && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Review & Confirm
                </h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068] font-medium"
                >
                  ← Back
                </button>
              </div>

              {/* Selected Payment Source Card */}
              <div className="bg-gradient-to-br from-[#638C80] to-[#4f7068] rounded-xl p-6 text-white">
                <div className="flex items-center gap-3 mb-4">
                  {selectedSource.type === 'mobile_money' && <Smartphone className="w-6 h-6" />}
                  {selectedSource.type === 'bank_account' && <Building2 className="w-6 h-6" />}
                  <div>
                    <div className="font-semibold text-lg">{selectedSource.name}</div>
                    <div className="text-sm text-white/80">
                      {selectedSource.type === 'mobile_money' ? (
                        `${selectedSource.provider_name} • ${selectedSource.environment}`
                      ) : selectedSource.type === 'bank_account' ? (
                        selectedSource.bank_name
                      ) : (
                        'Payment Source'
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-white/20">
                  <span className="text-sm text-white/80">Available Balance</span>
                  <span className="text-xl font-bold">
                    {selectedSource.currency} {parseFloat(selectedSource.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>

              {/* Currency Conversion Notice */}
              {selectedSource.currency !== currency && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-xl">💱</span>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-blue-900 mb-1">Currency Conversion</h4>
                      <p className="text-sm text-blue-700">
                        Paying <span className="font-semibold">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span> from 
                        a <span className="font-semibold">{selectedSource.currency}</span> account. 
                        The current exchange rate will be applied automatically.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Bills List */}
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">
                    Bills to Pay ({bills.length})
                  </h4>
                </div>
                <div className="divide-y divide-gray-200 max-h-60 overflow-y-auto">
                  {bills.map((bill) => {
                    const customAmount = paymentAmounts.get(bill.id) || '';
                    const isPartial = customAmount && parseFloat(customAmount) < parseFloat(bill.amount_due);
                    
                    return (
                      <div key={bill.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="font-medium text-gray-900">{bill.vendor_name}</div>
                            <div className="text-xs text-gray-500 mt-1">
                              Invoice: {bill.invoice_number || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Due: {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-gray-600">
                            Pay amount
                          </label>
                          <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center gap-2 pointer-events-none">
                                <span className="text-sm font-bold text-gray-700 min-w-[40px]">
                                  {String(bill.currency_code).split('.').pop()}
                                </span>
                                <span className="text-gray-300 font-light">|</span>
                              </div>
                              <input
                                type="number"
                                value={customAmount}
                                onChange={(e) => handleAmountChange(bill.id, e.target.value)}
                                placeholder={bill.amount_due}
                                min="0"
                                max={bill.amount_due}
                                step="0.01"
                                className="w-full pl-[180px] pr-4 py-2.5 text-base font-medium border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent placeholder:text-gray-400"
                              />
                            </div>
                            {isPartial && (
                              <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1.5 rounded-full font-semibold whitespace-nowrap">
                                Partial
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                <div className="bg-gradient-to-r from-gray-50 to-white px-6 py-4 border-t-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-700">Total Payment</span>
                    <span className="text-2xl font-bold text-gray-900">
                      {currency} {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  {bills.some(bill => parseFloat(paymentAmounts.get(bill.id) || bill.amount_due) < parseFloat(bill.amount_due)) && (
                    <div className="mt-2 text-xs text-amber-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Partial payment - remaining balance will stay open
                    </div>
                  )}
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a note for this payment..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-[#638C80] focus:border-transparent resize-none"
                />
              </div>

              {/* Confirm Button */}
              <button
                onClick={handleConfirm}
                className="w-full bg-gradient-to-r from-[#638C80] to-[#4f7068] text-white py-4 rounded-xl hover:shadow-lg transition-all font-semibold text-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Confirm Payment
              </button>
            </div>
          )}

          {/* Step 3: Processing */}
          {step === 'processing' && (
            <div className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-[#638C80]/10 rounded-full mb-6">
                <Loader2 className="w-10 h-10 animate-spin text-[#638C80]" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Processing Payment...
              </h3>
              <p className="text-gray-600">
                Please wait while we process your payment
              </p>
            </div>
          )}

          {/* Step 4: Export (Bank Transfers Only) */}
          {step === 'export' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Download Payment File
                </h3>
                <p className="text-gray-600">
                  {results.filter(r => r.success).length} payment{results.filter(r => r.success).length > 1 ? 's' : ''} ready for bank processing
                </p>
              </div>

              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-900 mb-3">
                  Select File Format
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setExportFormat('csv')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      exportFormat === 'csv'
                        ? 'border-[#638C80] bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">CSV Format</div>
                    <div className="text-xs text-gray-600 mt-1">
                      For Stanbic and most banks
                    </div>
                  </button>
                  <button
                    onClick={() => setExportFormat('xml')}
                    className={`p-4 border-2 rounded-xl transition-all ${
                      exportFormat === 'xml'
                        ? 'border-[#638C80] bg-white shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-semibold text-gray-900">XML Format</div>
                    <div className="text-xs text-gray-600 mt-1">
                      ISO 20022 (pain.001)
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSkipExport}
                  className="flex-1 border-2 border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-all font-semibold"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => handleExportPayment(false)}
                  disabled={isExporting}
                  className="flex-1 bg-gradient-to-r from-[#638C80] to-[#4f7068] text-white py-3 rounded-xl hover:shadow-lg transition-all disabled:from-gray-300 disabled:to-gray-300 font-semibold flex items-center justify-center gap-2"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-5 h-5" />
                      Download {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 5: Results */}
          {step === 'result' && (
            <div className="space-y-6">
              <div className="text-center py-8">
                {results.every(r => r.success) ? (
                  <>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                      <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Payment Successful!
                    </h3>
                    <p className="text-gray-600">
                      {results.length} bill{results.length > 1 ? 's' : ''} paid successfully
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-red-100 rounded-full mb-4">
                      <XCircle className="w-10 h-10 text-red-600" />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">
                      Payment Issues
                    </h3>
                    <p className="text-gray-600">
                      Some payments could not be processed
                    </p>
                  </>
                )}
              </div>

              {/* Results List */}
              <div className="border-2 border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-200">
                {results.map((result) => {
                  const bill = bills.find(b => b.id.toString() === result.bill_id);
                  return (
                    <div key={result.bill_id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">
                          {bill?.vendor_name || `Bill #${result.bill_id}`}
                        </div>
                        {result.reference && (
                          <div className="text-xs text-gray-500 mt-1">
                            Reference: {result.reference}
                          </div>
                        )}
                        {result.error_message && (
                          <div className="text-sm text-red-600 mt-1">
                            {result.error_message}
                          </div>
                        )}
                      </div>
                      <div>
                        {result.success ? (
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-5 h-5 text-red-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-gradient-to-r from-[#638C80] to-[#4f7068] text-white py-4 rounded-xl hover:shadow-lg transition-all font-semibold text-lg"
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
