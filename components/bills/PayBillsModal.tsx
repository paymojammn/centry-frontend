'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
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

type PaymentStep = 'source' | 'recipients' | 'confirm' | 'processing' | 'result';

interface PaymentResult {
  success: boolean;
  bill_id: string;
  reference?: string;
  payment_event_id?: number;
  error_message?: string;
}

interface RecipientDetails {
  bill_id: number;
  recipient_type: 'bank' | 'international';
  phone_number?: string;
  contact_id?: number;
  contact_name?: string;
  recipient_bank_id?: number;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
  // International remittance fields
  iban?: string;
  intermediary_bank_id?: number;
  beneficiary_street?: string;
  beneficiary_city?: string;
  beneficiary_country?: string;
  purpose_code?: string;
  charges_bearer?: string;
  regulatory_code?: string;
  regulatory_info?: string;
  transfer_currency?: string;
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
    // Use unified sources array (includes Ozow, Paystack, Netcash + mobile money + bank)
    if (sourcesData.sources?.length) {
      return sourcesData.sources.filter((s: any) => s.supports_disbursement !== false);
    }
    // Fallback to legacy format
    return [
      ...(sourcesData.mobile_money_accounts || []),
      ...(sourcesData.bank_accounts || [])
    ];
  }, [sourcesData]);


  const [step, setStep] = useState<PaymentStep>('source');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [recipients, setRecipients] = useState<Map<number, RecipientDetails>>(new Map());
  const [paymentAmounts, setPaymentAmounts] = useState<Map<number, string>>(new Map());
  const [note, setNote] = useState('');
  const [results, setResults] = useState<PaymentResult[]>([]);
  const [paymentEventIds, setPaymentEventIds] = useState<number[]>([]);

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

      // Determine if any recipient is international
      const hasInternational = Array.from(recipients.values()).some(
        r => r.recipient_type === 'international'
      );

      if (selectedSource.type === 'mobile_money') {
        paymentData.payment_method = 'mobile_money';
        paymentData.mobile_money_account_id = selectedSource.id;
      } else if (selectedSource.type === 'bank_account') {
        paymentData.payment_method = hasInternational ? 'international_remittance' : 'bank';
        paymentData.bank_account_id = selectedSource.id;
        paymentData.account_number = selectedSource.account_number;
        paymentData.bank_name = selectedSource.bank_name;
      }

      if (recipients.size > 0) {
        paymentData.recipients = Array.from(recipients.values()).map(recipient => ({
          bill_id: recipient.bill_id,
          recipient_type: recipient.recipient_type,
          phone_number: recipient.phone_number,
          recipient_bank_id: recipient.recipient_bank_id,
          bank_name: recipient.bank_name,
          swift_code: recipient.swift_code,
          account_number: recipient.account_number,
          account_name: recipient.account_name,
          // International remittance fields
          iban: recipient.iban,
          intermediary_bank_id: recipient.intermediary_bank_id,
          beneficiary_street: recipient.beneficiary_street,
          beneficiary_city: recipient.beneficiary_city,
          beneficiary_country: recipient.beneficiary_country,
          purpose_code: recipient.purpose_code,
          charges_bearer: recipient.charges_bearer,
          regulatory_code: recipient.regulatory_code,
          regulatory_info: recipient.regulatory_info,
          transfer_currency: recipient.transfer_currency,
        }));
      }

      const response = await billsApi.payBills(paymentData);
      return response;
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      const eventIds = data.results
        ?.filter((r: PaymentResult) => r.success && r.payment_event_id)
        .map((r: PaymentResult) => r.payment_event_id!) || [];
      setPaymentEventIds(eventIds);

      // Always go to result - file generation now happens in processing queue after approval
      setStep('result');

      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
    },
    onError: (error: Error) => {
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

  const getCurrentStepIndex = () => {
    const stepMap: Record<PaymentStep, number> = {
      source: 0,
      recipients: 1,
      confirm: 2,
      processing: 2,
      result: 2
    };
    return stepMap[step];
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex-shrink-0 px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-foreground">Pay Bills</h2>
                <p className="text-sm text-muted-foreground">
                  {bills.length} bill{bills.length > 1 ? 's' : ''} • <span className="font-medium text-primary">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5 text-muted-foreground/60" />
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
                        ? 'bg-primary/10'
                        : isComplete
                          ? 'bg-primary/5'
                          : 'bg-muted'
                      }
                    `}>
                      <div className={`
                        w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isActive
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : isComplete
                            ? 'bg-primary/50 text-white'
                            : 'bg-muted text-muted-foreground'
                        }
                      `}>
                        {isComplete ? <CheckCircle2 className="w-4 h-4" /> : index + 1}
                      </div>
                      <span className={`text-sm font-medium hidden sm:inline ${
                        isActive ? 'text-primary' : isComplete ? 'text-primary' : 'text-muted-foreground/60'
                      }`}>{s.label}</span>
                    </div>
                    {index < STEPS.length - 1 && (
                      <div className={`w-6 h-0.5 mx-0.5 rounded-full ${isComplete ? 'bg-primary/40' : 'bg-muted'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Payment Source */}
          {step === 'source' && (
            <div className="space-y-5">
              <div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Select Payment Source
                </h3>
                <p className="text-sm text-muted-foreground">
                  Choose where to pay from
                </p>
              </div>

              {sourcesLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                  <p className="text-sm text-muted-foreground">Loading payment sources...</p>
                </div>
              ) : sourcesError ? (
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-5 text-center">
                  <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                    <AlertCircle className="w-5 h-5 text-destructive" />
                  </div>
                  <h4 className="font-medium text-destructive mb-1">Error Loading Sources</h4>
                  <p className="text-sm text-destructive">
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
                <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                  </div>
                  <div>
                    <h4 className="font-medium text-destructive text-sm">Insufficient Balance</h4>
                    <p className="text-sm text-destructive mt-0.5">
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
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Recipient Details
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Enter payment recipient info
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
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
                  <h3 className="text-base font-semibold text-foreground mb-1">
                    Review Payment
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Confirm details before payment
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Back
                </button>
              </div>

              {/* Selected Payment Source Card */}
              <div className="bg-gradient-to-br from-primary to-primary/80 rounded-xl p-5 text-white shadow-lg shadow-primary/20">
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
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-base">💱</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-primary text-sm">Currency Conversion</h4>
                    <p className="text-sm text-primary/80 mt-0.5">
                      {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })} from {selectedSource.currency} account
                    </p>
                  </div>
                </div>
              )}

              {/* Bills List */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-muted px-4 py-3 border-b border-border">
                  <h4 className="font-medium text-foreground text-sm">
                    Bills ({bills.length})
                  </h4>
                </div>
                <div className="divide-y divide-border max-h-48 overflow-y-auto">
                  {bills.map((bill) => {
                    const customAmount = paymentAmounts.get(bill.id) || '';
                    const isPartial = customAmount && parseFloat(customAmount) < parseFloat(bill.amount_due);

                    return (
                      <div key={bill.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-medium text-foreground text-sm">{bill.vendor_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {bill.invoice_number || 'N/A'}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-muted-foreground">
                              Due: {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="relative flex-1">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
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
                              className="w-full pl-14 pr-3 py-2 text-sm border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent placeholder:text-muted-foreground/60 transition-all"
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

                <div className="bg-gradient-to-r from-muted to-card px-4 py-3 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-sm">Total</span>
                    <span className="text-lg font-bold text-foreground">
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
                <label className="block text-sm font-medium text-foreground mb-2">
                  Note (Optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add a payment note..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none transition-all"
                />
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full mb-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Processing Payment
              </h3>
              <p className="text-sm text-muted-foreground">
                Please wait...
              </p>
            </div>
          )}

          {/* Results */}
          {step === 'result' && (
            <div className="space-y-5">
              <div className="text-center py-6">
                {results.every(r => r.success) ? (
                  <>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-3 shadow-lg shadow-amber-100">
                      <ClipboardCheck className="w-8 h-8 text-amber-600" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      Payment Submitted
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {results.length} payment{results.length > 1 ? 's' : ''} pending approval
                    </p>
                  </>
                ) : (
                  <>
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-3 shadow-lg shadow-destructive/10">
                      <XCircle className="w-8 h-8 text-destructive" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-1">
                      Payment Issues
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Some payments failed
                    </p>
                  </>
                )}
              </div>

              {/* Approval Notice */}
              {results.some(r => r.success) && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-900 text-sm">Awaiting Approval</h4>
                    <p className="text-sm text-amber-700 mt-0.5">
                      These payments need to be approved by another user before a payment file can be generated.
                      Check the Processing Queue to view and manage approvals.
                    </p>
                  </div>
                </div>
              )}

              {/* Results List */}
              <div className="border border-border rounded-xl overflow-hidden divide-y divide-border">
                {results.map((result) => {
                  const bill = bills.find(b => b.id.toString() === result.bill_id);
                  return (
                    <div key={result.bill_id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-foreground text-sm">
                          {bill?.vendor_name || `Bill #${result.bill_id}`}
                        </div>
                        {result.reference && (
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Ref: {result.reference}
                          </div>
                        )}
                        {result.error_message && (
                          <div className="text-xs text-destructive mt-0.5">
                            {result.error_message}
                          </div>
                        )}
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        {result.success ? (
                          <div className="w-7 h-7 bg-amber-100 rounded-full flex items-center justify-center">
                            <ClipboardCheck className="w-4 h-4 text-amber-600" />
                          </div>
                        ) : (
                          <div className="w-7 h-7 bg-destructive/10 rounded-full flex items-center justify-center">
                            <XCircle className="w-4 h-4 text-destructive" />
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
        <div className="flex-shrink-0 px-6 py-4 border-t border-border bg-muted/50">
          {step === 'source' && (
            <button
              type="button"
              onClick={() => setStep('recipients')}
              disabled={!selectedSource || !hasSufficientBalance}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:from-muted disabled:to-muted disabled:shadow-none disabled:cursor-not-allowed font-semibold text-sm"
            >
              Continue
            </button>
          )}

          {step === 'recipients' && (
            <button
              type="button"
              onClick={() => setStep('confirm')}
              disabled={recipients.size !== bills.length}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all disabled:from-muted disabled:to-muted disabled:shadow-none disabled:cursor-not-allowed font-semibold text-sm"
            >
              Continue to Review
            </button>
          )}

          {step === 'confirm' && (
            <button
              type="button"
              onClick={handleConfirm}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all font-semibold text-sm flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              Confirm Payment
            </button>
          )}

          {step === 'result' && (
            <button
              type="button"
              onClick={handleClose}
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-white py-3 rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all font-semibold text-sm"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
