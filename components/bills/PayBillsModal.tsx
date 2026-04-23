'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  X,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react';
import type { Bill } from '@/types/bill';
import { usePaymentSources } from '@/hooks/use-payment-sources';
import type { PaymentSource } from '@/types/payment-sources';
import PaymentSourcePicker from '@/components/shared/PaymentSourcePicker';
import RecipientDetailsStep from './RecipientDetailsStep';
import { billsApi } from '@/lib/bills-api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

interface PayBillsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bills: Bill[];
  organizationId: string;
  countryCode?: string;
}

type PaymentStep = 'source' | 'recipients' | 'confirm' | 'result';

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

export default function PayBillsModal({
  isOpen,
  onClose,
  bills,
  organizationId,
  countryCode,
}: PayBillsModalProps) {
  const queryClient = useQueryClient();
  const { data: sourcesData, isLoading: sourcesLoading } = usePaymentSources(organizationId);
  const sources = useMemo(() => {
    if (!sourcesData) return [];
    if (sourcesData.sources?.length) {
      return sourcesData.sources.filter((s: any) => s.supports_disbursement !== false);
    }
    return [...(sourcesData.mobile_money_accounts || []), ...(sourcesData.bank_accounts || [])];
  }, [sourcesData]);

  const [step, setStep] = useState<PaymentStep>('source');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [recipients, setRecipients] = useState<Map<number, RecipientDetails>>(new Map());
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [note, setNote] = useState('');
  const [results, setResults] = useState<PaymentResult[]>([]);
  // Generated once per submit-click so retries (network timeouts, 5xx) reuse the
  // same key and the backend can dedupe. Cleared in onSuccess/on-close.
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);

  // FX quote (set when source currency differs from bill currency)
  const [fxQuote, setFxQuote] = useState<{
    rate: string;
    provider: string;
    fetched_at: string;
    expires_at: string;
    converted_amount: string;
  } | null>(null);
  const [fxLoading, setFxLoading] = useState(false);
  const [fxError, setFxError] = useState<string | null>(null);
  const [fxConfirmed, setFxConfirmed] = useState(false);

  const currency = bills[0]?.currency_code
    ? String(bills[0].currency_code).split('.').pop() || 'UGX'
    : 'UGX';

  const totalAmount = useMemo(() => {
    return bills.reduce((sum, bill) => {
      const custom = amounts[String(bill.id)];
      return sum + (custom ? parseFloat(custom) : parseFloat(bill.amount_due));
    }, 0);
  }, [bills, amounts]);

  const allRecipientsComplete = useMemo(() => {
    if (recipients.size !== bills.length) return false;
    for (const r of recipients.values()) {
      if (!r.recipient_bank_id || !(r.account_number || r.iban) || !r.account_name) return false;
      if (r.recipient_type === 'international') {
        if (
          !r.beneficiary_street?.trim() ||
          !r.beneficiary_city?.trim() ||
          !r.beneficiary_country?.trim() ||
          !r.purpose_code?.trim()
        ) return false;
      }
    }
    return true;
  }, [recipients, bills.length]);

  // Initialize amounts
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      bills.forEach((b) => { initial[String(b.id)] = b.amount_due; });
      setAmounts(initial);
    }
  }, [isOpen, bills]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('source');
      setSelectedSource(null);
      setRecipients(new Map());
      setAmounts({});
      setNote('');
      setResults([]);
      setIdempotencyKey(null);
      setFxQuote(null);
      setFxLoading(false);
      setFxError(null);
      setFxConfirmed(false);
    }
  }, [isOpen]);

  // Fetch an FX quote whenever currencies differ + amount changes.
  const needsFx = Boolean(selectedSource && selectedSource.currency && selectedSource.currency !== currency);
  useEffect(() => {
    let cancelled = false;
    if (!needsFx || step !== 'confirm' || totalAmount <= 0) {
      setFxQuote(null);
      setFxError(null);
      return;
    }
    setFxLoading(true);
    setFxError(null);
    setFxConfirmed(false);
    billsApi
      .getFxQuote(currency, selectedSource!.currency, totalAmount)
      .then((q) => {
        if (cancelled) return;
        setFxQuote({
          rate: q.rate,
          provider: q.provider,
          fetched_at: q.fetched_at,
          expires_at: q.expires_at,
          converted_amount: q.converted_amount,
        });
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setFxError(err.message || 'Failed to fetch FX rate');
      })
      .finally(() => {
        if (!cancelled) setFxLoading(false);
      });
    return () => { cancelled = true; };
  }, [needsFx, step, currency, selectedSource, totalAmount]);

  const payBillsMutation = useMutation({
    mutationFn: async () => {
      if (!selectedSource) throw new Error('No payment source selected');

      const hasInternational = Array.from(recipients.values()).some(
        (r) => r.recipient_type === 'international',
      );

      // Reuse key across retries of this submit-click; only cleared on success/close.
      const key = idempotencyKey ?? (typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
      if (!idempotencyKey) setIdempotencyKey(key);

      const paymentData: any = {
        organization_id: organizationId,
        bill_ids: bills.map((b) => b.id),
        amounts: Object.fromEntries(
          bills.map((b) => [String(b.id), amounts[String(b.id)] || b.amount_due]),
        ),
        currency_code: currency,
        note: note || undefined,
        idempotency_key: key,
      };

      // If an FX quote was fetched, pin it in the payload. Backend will accept
      // the rate as long as it's still within its 5-minute freshness window.
      if (fxQuote) {
        paymentData.fx = {
          rate: fxQuote.rate,
          provider: fxQuote.provider,
          fetched_at: fxQuote.fetched_at,
        };
      }

      // Routing by backend source model. `source_model` distinguishes BankAccount
      // (bank_account_id) from ProviderAccount (provider_account_id).
      if (selectedSource.source_model === 'bank_account' || selectedSource.type === 'bank_account') {
        paymentData.payment_method = hasInternational ? 'international_remittance' : 'bank';
        paymentData.bank_account_id = selectedSource.id;
        paymentData.account_number = selectedSource.account_number;
        paymentData.bank_name = selectedSource.bank_name;
      } else {
        // ProviderAccount: MTN/Airtel/Safaricom → mobile_money, Ozow/Paystack/Netcash/VALR/Onegate → bank.
        paymentData.payment_method = selectedSource.type === 'mobile_money' ? 'mobile_money' : 'bank';
        paymentData.provider_account_id = selectedSource.id;
        paymentData.provider = selectedSource.provider;
      }

      if (recipients.size > 0) {
        paymentData.recipients = Array.from(recipients.values()).map((r) => ({
          bill_id: r.bill_id,
          recipient_type: r.recipient_type,
          phone_number: r.phone_number,
          recipient_bank_id: r.recipient_bank_id,
          bank_name: r.bank_name,
          swift_code: r.swift_code,
          account_number: r.account_number,
          account_name: r.account_name,
          iban: r.iban,
          intermediary_bank_id: r.intermediary_bank_id,
          beneficiary_street: r.beneficiary_street,
          beneficiary_city: r.beneficiary_city,
          beneficiary_country: r.beneficiary_country,
          purpose_code: r.purpose_code,
          charges_bearer: r.charges_bearer,
          regulatory_code: r.regulatory_code,
          regulatory_info: r.regulatory_info,
          transfer_currency: r.transfer_currency,
        }));
      }

      return billsApi.payBills(paymentData);
    },
    onSuccess: (data) => {
      setResults(data.results || []);
      setStep('result');
      queryClient.invalidateQueries({ queryKey: ['bills'] });
      queryClient.invalidateQueries({ queryKey: ['payment-events'] });
      const ok = (data.results || []).filter((r: PaymentResult) => r.success).length;
      const fail = (data.results || []).filter((r: PaymentResult) => !r.success).length;
      if (ok) toast.success(`${ok} payment(s) submitted for approval`);
      if (fail) toast.error(`${fail} payment(s) failed`);
    },
    onError: (error: Error) => {
      setResults([{ success: false, bill_id: 'all', error_message: error.message || 'Payment failed' }]);
      setStep('result');
      toast.error(error.message || 'Payment failed');
    },
  });

  const handleSourceSelect = (source: PaymentSource) => {
    setSelectedSource(source);
    setStep('recipients');
  };

  const goBack = () => {
    if (step === 'confirm') setStep('recipients');
    else if (step === 'recipients') { setStep('source'); setSelectedSource(null); }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            {step !== 'source' && step !== 'result' && (
              <button onClick={goBack} className="p-1 rounded hover:bg-muted transition-colors">
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">Pay Bills</h2>
              <p className="text-sm text-muted-foreground">
                {bills.length} bill{bills.length > 1 ? 's' : ''} &middot;{' '}
                <span className="font-medium text-foreground">
                  {currency} {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Step indicator */}
        {!['result'].includes(step) && (
          <div className="flex items-center gap-1 px-5 py-3 border-b border-border shrink-0">
            {['Source', 'Recipients', 'Review'].map((label, i) => {
              const stepIndex = step === 'source' ? 0 : step === 'recipients' ? 1 : 2;
              const isActive = stepIndex === i;
              const isDone = stepIndex > i;
              return (
                <div key={label} className="flex items-center gap-1 flex-1">
                  <div className={`flex items-center gap-1.5 text-xs font-medium ${isActive ? 'text-foreground' : isDone ? 'text-primary' : 'text-muted-foreground/50'}`}>
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isDone ? 'bg-primary text-white' : isActive ? 'bg-foreground text-card' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isDone ? <CheckCircle className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < 2 && <div className={`flex-1 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />}
                </div>
              );
            })}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* Step 1: Select Source */}
          {step === 'source' && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Choose where to pay from.</p>
              {sourcesLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <PaymentSourcePicker
                  sources={sources}
                  mode="disbursement"
                  onSelect={handleSourceSelect}
                  emptyMessage="No payment sources available. Add a provider account or bank account."
                />
              )}
            </div>
          )}

          {/* Step 2: Recipient Details */}
          {step === 'recipients' && selectedSource && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Enter recipient bank details for each bill.</p>
              <RecipientDetailsStep
                bills={bills}
                recipients={recipients}
                onRecipientsChange={setRecipients}
                paymentMethod={selectedSource.type}
                sourceCountryCodes={selectedSource.country_codes}
              />
              <Button
                onClick={() => setStep('confirm')}
                disabled={!allRecipientsComplete}
                className="w-full"
              >
                Continue to Review
              </Button>
            </div>
          )}

          {/* Step 3: Review & Confirm */}
          {step === 'confirm' && selectedSource && (
            <div className="space-y-4">
              {/* Source summary */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Via:</span>
                <span className="font-medium text-foreground">{selectedSource.name}</span>
                {selectedSource.currency !== currency && (
                  <>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {currency} &rarr; {selectedSource.currency} conversion
                    </span>
                  </>
                )}
              </div>

              {/* Bills with editable amounts */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {bills.map((bill) => {
                  const custom = amounts[String(bill.id)] || '';
                  const isPartial = custom && parseFloat(custom) < parseFloat(bill.amount_due);
                  return (
                    <div key={bill.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bill.vendor_name}</p>
                        <p className="text-xs text-muted-foreground">{bill.invoice_number || `#${bill.id}`}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <Input
                          type="number"
                          value={custom}
                          onChange={(e) => setAmounts((prev) => ({ ...prev, [String(bill.id)]: e.target.value }))}
                          className="w-28 h-8 text-right text-sm"
                          step="0.01"
                          max={bill.amount_due}
                        />
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {isPartial && <span className="text-amber-600 font-medium">Partial &middot; </span>}
                          of {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* FX Quote — only shown when source currency differs from bill currency */}
              {needsFx && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Currency conversion required
                  </div>
                  {fxLoading && (
                    <div className="flex items-center gap-2 text-xs text-amber-800">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Fetching rate...
                    </div>
                  )}
                  {fxError && (
                    <div className="text-xs text-destructive">
                      {fxError} — cannot proceed without a rate. Try again or switch source account.
                    </div>
                  )}
                  {fxQuote && !fxLoading && (
                    <>
                      <div className="text-xs text-amber-900 space-y-0.5">
                        <div>
                          Bill: <span className="font-medium">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          Will debit: <span className="font-medium">
                            {selectedSource!.currency} {parseFloat(fxQuote.converted_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-[11px] text-amber-700">
                          Rate: 1 {currency} = {parseFloat(fxQuote.rate).toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedSource!.currency}
                          {' '}&middot; via {fxQuote.provider}
                        </div>
                      </div>
                      <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={fxConfirmed}
                          onChange={(e) => setFxConfirmed(e.target.checked)}
                          className="mt-0.5"
                        />
                        <span>
                          I confirm this rate and understand the source account will be debited in {selectedSource!.currency}.
                        </span>
                      </label>
                    </>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Note (optional)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment reference or note"
                />
              </div>

              <Button
                onClick={() => payBillsMutation.mutate()}
                disabled={
                  payBillsMutation.isPending
                  || totalAmount <= 0
                  || (needsFx && (!fxQuote || !fxConfirmed || fxLoading || !!fxError))
                }
                className="w-full"
              >
                {payBillsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : needsFx && !fxConfirmed ? (
                  'Confirm conversion to continue'
                ) : (
                  `Submit ${currency} ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })} for Approval`
                )}
              </Button>
            </div>
          )}

          {/* Results */}
          {step === 'result' && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="text-center py-4">
                {results.every((r) => r.success) ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Payments Submitted</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {results.length} payment{results.length > 1 ? 's' : ''} pending approval in the Processing Queue.
                    </p>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="h-6 w-6 text-destructive" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground">Some Payments Failed</h3>
                    <p className="text-sm text-muted-foreground mt-1">Review the results below.</p>
                  </>
                )}
              </div>

              {/* Per-bill results */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {results.map((r) => {
                  const bill = bills.find((b) => String(b.id) === r.bill_id);
                  return (
                    <div key={r.bill_id} className="px-4 py-3 flex items-center gap-3">
                      {r.success ? (
                        <CheckCircle className="h-4 w-4 text-primary shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {bill?.vendor_name || `Bill #${r.bill_id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {r.success ? `Ref: ${r.reference}` : r.error_message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
