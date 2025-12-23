'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  FileText,
  Building2,
  Smartphone,
  ArrowLeft,
  CreditCard,
  Users,
  ClipboardCheck
} from 'lucide-react';
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
  phone_number?: string;
  contact_id?: number;
  contact_name?: string;
  recipient_bank_id?: number;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
}

const STEPS = [
  { key: 'source', label: 'Source', icon: CreditCard },
  { key: 'recipients', label: 'Recipients', icon: Users },
  { key: 'confirm', label: 'Review', icon: ClipboardCheck },
];

export default function PayBillsModal({
  isOpen,
  onClose,
  bills,
  organizationId,
  countryCode
}: PayBillsModalProps) {
  const queryClient = useQueryClient();

  const { data: sourcesData, isLoading: sourcesLoading, error: sourcesError } = usePaymentSources(organizationId);
  const allSources = useMemo(() => {
    if (!sourcesData) return [];
    return [
      ...(sourcesData.mobile_money_accounts || []),
      ...(sourcesData.bank_accounts || [])
    ];
  }, [sourcesData]);

  useEffect(() => {
    if (sourcesData) {
      console.log('📊 Payment sources data:', sourcesData);
      console.log('📋 All sources merged:', allSources);
    }
    if (sourcesError) {
      console.error('❌ Payment sources error:', sourcesError);
    }
  }, [sourcesData, allSources, sourcesError]);

  const [step, setStep] = useState<PaymentStep>('source');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [recipients, setRecipients] = useState<Map<number, RecipientDetails>>(new Map());
  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, string>>(new Map());
  const [note, setNote] = useState('');
  const [results, setResults] = useState<PaymentResult[]>([]);
  const [paymentEventIds, setPaymentEventIds] = useState<number[]>([]);
  const [exportFormat, setExportFormat] = useState<'csv' | 'xml'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const currency = bills[0]?.currency_code ? String(bills[0].currency_code).split('.').pop() || 'UGX' : 'UGX';

  const totalAmount = useMemo(() => {
    return bills.reduce((sum, bill) => {
      const customAmount = paymentAmounts.get(bill.id);
      const amount = customAmount ? parseFloat(customAmount) : parseFloat(bill.amount_due);
      return sum + amount;
    }, 0);
  }, [bills, paymentAmounts]);

  const hasSufficientBalance = useMemo(() => {
    if (!selectedSource) return false;
    if (selectedSource.currency === currency) {
      return parseFloat(selectedSource.balance) >= totalAmount;
    }
    return parseFloat(selectedSource.balance) > 0;
  }, [selectedSource, totalAmount, currency]);

  const payBillsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSource) throw new Error('No payment source selected');

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

      if (selectedSource.type === 'mobile_money') {
        paymentData.payment_method = 'mobile_money';
        paymentData.mobile_money_account_id = selectedSource.id;
      } else if (selectedSource.type === 'bank_account') {
        paymentData.payment_method = 'bank';
        paymentData.bank_account_id = selectedSource.id;
        paymentData.account_number = selectedSource.account_number;
        paymentData.bank_name = selectedSource.bank_name;
      }

      if (recipients.size > 0) {
        console.log('📦 Recipients before mapping:', Array.from(recipients.entries()));
        paymentData.recipients = Array.from(recipients.values()).map(recipient => ({
          bill_id: recipient.bill_id,
          recipient_type: recipient.recipient_type,
          phone_number: recipient.phone_number,
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
      setResults(data.results || []);
      const eventIds = data.results
        ?.filter((r: PaymentResult) => r.success && r.payment_event_id)
        .map((r: PaymentResult) => r.payment_event_id!) || [];
      setPaymentEventIds(eventIds);

      if (selectedSource?.type === 'bank_account') {
        setStep('export');
      } else {
        setStep('result');
      }

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
          return handleExportPayment(true);
        } else {
          setIsExporting(false);
          return;
        }
      }

      console.log('✅ Export successful:', result);
      alert(`Payment file generated successfully!\n\nFilename: ${result.filename}\nPayments: ${result.payment_count}\n\nFile saved to server.`);
      setStep('result');
    } catch (error: any) {
      console.error('Export error:', error);
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

  const getCurrentStepIndex = () => {
    const stepMap: Record<PaymentStep, number> = {
      source: 0,
      recipients: 1,
      confirm: 2,
      processing: 2,
      export: 2,
      result: 2
    };
    return stepMap[step];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Pay Bills</h2>
                <p className="text-sm text-gray-500">
                  {bills.length} bill{bills.length > 1 ? 's' : ''} • <span className="font-medium text-[#638C80]">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Progress Steps */}
          {!['processing', 'export', 'result'].includes(step) && (
            <div className="flex items-center gap-1">
              {STEPS.map((s, index) => {
                const isActive = getCurrentStepIndex() === index;
                const isComplete = getCurrentStepIndex() > index;

                return (
                  <div key={s.key} className="flex-1 flex items-center">
                    <div className={`
                      flex items-center gap-2 px-3 py-2 rounded-lg transition-all flex-1
                      ${isActive
                        ? 'bg-[#638C80]/10'
                        : isComplete
                          ? 'bg-green-50'
                          : 'bg-gray-50'
                      }
                    `}>
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isActive
                          ? 'bg-[#638C80] text-white shadow-md shadow-[#638C80]/30'
                          : isComplete
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-500'
                        }
                      `}>
                        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-sm font-medium hidden sm:inline ${
                        isActive ? 'text-[#638C80]' : isComplete ? 'text-green-600' : 'text-gray-400'
                      }`}>{s.label}</span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 mx-0.5 rounded-full ${isComplete ? 'bg-green-300' : 'bg-gray-200'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Payment Source */}
          {step === 'source' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-gray-900 mb-1">
                  Select Payment Source
                </h3>
                <p className="text-sm text-gray-500">
                  Choose where to pay from
                </p>
              </div>

              {sourcesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-[#638C80]/10 flex items-center justify-center mb-3">
                    <Loader2 className="w-6 h-6 animate-spin text-[#638C80]" />
                  </div>
                  <p className="text-sm text-gray-500">Loading payment sources...</p>
                </div>
              ) : sourcesError ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                  </div>
                  <h4 className="font-medium text-red-900 mb-1">Error Loading Sources</h4>
                  <p className="text-sm text-red-600">
                    {sourcesError instanceof Error ? sourcesError.message : 'Failed to load payment sources'}
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
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <h4 className="font-medium text-red-900 text-sm">Insufficient Balance</h4>
                    <p className="text-sm text-red-600 mt-0.5">
                      Please top up or select another source.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Recipient Details */}
          {step === 'recipients' && selectedSource && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Recipient Details
                  </h3>
                  <p className="text-sm text-gray-500">
                    Enter payment recipient info
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-[#638C80] hover:text-[#4a6b62] font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              <RecipientDetailsStep
                bills={bills}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                paymentMethod={selectedSource.type}
              />
            </div>
          )}

          {/* Step 3: Confirm Payment */}
          {step === 'confirm' && selectedSource && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-semibold text-gray-900 mb-1">
                    Review Payment
                  </h3>
                  <p className="text-sm text-gray-500">
                    Confirm details before payment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-[#638C80] hover:text-[#4a6b62] font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Selected Payment Source Card */}
              <div className="bg-gradient-to-br from-[#638C80] to-[#4a6b62] rounded-xl p-5 text-white shadow-lg shadow-[#638C80]/20">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    {selectedSource.type === 'mobile_money' ? (
                      <Smartphone className="w-5 h-5" />
                    ) : (
                      <Building2 className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{selectedSource.name}</div>
                    <div className="text-sm text-white/70">
                      {selectedSource.type === 'mobile_money'
                        ? `${selectedSource.provider_name} • ${selectedSource.environment}`
                        : selectedSource.bank_name
                      }
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/20">
                  <span className="text-sm text-white/70">Available Balance</span>
                  <span className="text-lg font-bold">
                    {selectedSource.currency} {parseFloat(selectedSource.balance).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>

              {/* Currency Conversion Notice */}
              {selectedSource.currency !== currency && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-base">💱</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-900 text-sm">Currency Conversion</h4>
                    <p className="text-sm text-blue-700 mt-0.5">
                      {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} from {selectedSource.currency} account
                    </p>
                  </div>
                </div>
              )}

              {/* Bills List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="font-medium text-gray-900 text-sm">
                    Bills ({bills.length})
                  </h4>
                </div>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {bills.map((bill) => {
                    const customAmount = paymentAmounts.get(bill.id) || '';
                    const isPartial = customAmount && parseFloat(customAmount) < parseFloat(bill.amount_due);

                    return (
                      <div key={bill.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-gray-900 text-sm">{bill.vendor_name}</div>
                            <div className="text-xs text-gray-500">
                              {bill.invoice_number || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-gray-500">
                              Due: {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                              {String(bill.currency_code).split('.').pop()}
                            </span>
                            <input
                              type="number"
                              value={customAmount}
                              onChange={(e) => handleAmountChange(bill.id, e.target.value)}
                              placeholder={bill.amount_due}
                              min="0"
                              max={bill.amount_due}
                              step="0.01"
                              className="w-full pl-14 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent placeholder:text-gray-400 transition-all"
                            />
                          </div>
                          {isPartial && (
                            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                              Partial
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="bg-gradient-to-r from-gray-50 to-white px-4 py-3 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700 text-sm">Total</span>
                    <span className="text-lg font-bold text-gray-900">
                      {currency} {totalAmount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a payment note..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#638C80] focus:border-transparent resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-[#638C80]/20 to-[#638C80]/10 rounded-full mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-[#638C80]" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                Processing Payment
              </h3>
              <p className="text-sm text-gray-500">
                Please wait...
              </p>
            </div>
          )}

          {/* Export (Bank Transfers Only) */}
          {step === 'export' && (
            <div className="space-y-5">
              <div className="text-center py-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-3 shadow-lg shadow-blue-100">
                  <FileText className="w-7 h-7 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Download Payment File
                </h3>
                <p className="text-sm text-gray-500">
                  {results.filter(r => r.success).length} payment{results.filter(r => r.success).length > 1 ? 's' : ''} ready
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-900 text-sm mb-3">
                  Select Format
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportFormat('csv')}
                    className={`p-3 border rounded-xl transition-all text-left ${
                      exportFormat === 'csv'
                        ? 'border-[#638C80] bg-white shadow-md ring-2 ring-[#638C80]/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm">CSV</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      Stanbic & most banks
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExportFormat('xml')}
                    className={`p-3 border rounded-xl transition-all text-left ${
                      exportFormat === 'xml'
                        ? 'border-[#638C80] bg-white shadow-md ring-2 ring-[#638C80]/20'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900 text-sm">XML</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      ISO 20022 (pain.001)
                    </div>
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleSkipExport}
                  className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-50 transition-all font-medium text-sm"
                >
                  Skip
                </button>
                <button
                  type="button"
                  onClick={() => handleExportPayment(false)}
                  disabled={isExporting}
                  className="flex-1 bg-[#638C80] text-white py-2.5 rounded-xl hover:bg-[#4a6b62] transition-all disabled:bg-gray-300 font-medium text-sm flex items-center justify-center gap-2 shadow-md shadow-[#638C80]/20"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download {exportFormat.toUpperCase()}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {step === 'result' && (
            <div className="space-y-5">
              <div className="text-center py-6">
                {results.every(r => r.success) ? (
                  <>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-3 shadow-lg shadow-green-100">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Payment Successful
                    </h3>
                    <p className="text-sm text-gray-500">
                      {results.length} bill{results.length > 1 ? 's' : ''} paid
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-3 shadow-lg shadow-red-100">
                      <XCircle className="w-8 h-8 text-red-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                      Payment Issues
                    </h3>
                    <p className="text-sm text-gray-500">
                      Some payments failed
                    </p>
                  </>
                )}
              </div>

              {/* Results List */}
              <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                {results.map((result) => {
                  const bill = bills.find(b => b.id.toString() === result.bill_id);
                  return (
                    <div key={result.bill_id} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm">
                          {bill?.vendor_name || `Bill #${result.bill_id}`}
                        </div>
                        {result.reference && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            Ref: {result.reference}
                          </div>
                        )}
                        {result.error_message && (
                          <div className="text-xs text-red-600 mt-0.5">
                            {result.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        {result.success ? (
                          <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="w-4 h-4 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-red-600" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          {step === 'source' && (
            <button
              type="button"
              onClick={() => setStep('recipients')}
              disabled={!selectedSource || !hasSufficientBalance}
              className="w-full bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-[#638C80]/20 transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed font-semibold text-sm"
            >
              Continue
            </button>
          )}

          {step === 'recipients' && (
            <button
              type="button"
              onClick={() => setStep('confirm')}
              disabled={recipients.size !== bills.length}
              className="w-full bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-[#638C80]/20 transition-all disabled:from-gray-300 disabled:to-gray-300 disabled:shadow-none disabled:cursor-not-allowed font-semibold text-sm"
            >
              Continue to Review
            </button>
          )}

          {step === 'confirm' && (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-[#638C80]/20 transition-all font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Payment
            </button>
          )}

          {step === 'result' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white py-3 rounded-xl hover:shadow-lg hover:shadow-[#638C80]/20 transition-all font-semibold text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
