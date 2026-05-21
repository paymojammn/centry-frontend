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
  recipient_bank_branch_id?: number;
  recipient_bank_branch_name?: string;
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
  // Ozow-specific recipient fields (only set when source is an Ozow ProviderAccount).
  bank_group_id?: string;
  branch_code?: string;
  customer_bank_reference?: string;
}

export default function PayBillsModal({
  isOpen,
  onClose,
  bills,
  organizationId,
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
  // Manual-rate override
  const [fxMode, setFxMode] = useState<'auto' | 'manual'>('auto');
  const [fxManualRate, setFxManualRate] = useState<string>('');
  // User acknowledgement that paying from uncleared funds (amount sits
  // between booked and available) is acceptable. Required to submit when
  // the gap applies.
  const [ackUncleared, setAckUncleared] = useState(false);

  const currency = bills[0]?.currency_code
    ? String(bills[0].currency_code).split('.').pop() || 'UGX'
    : 'UGX';

  const totalAmount = useMemo(() => {
    return bills.reduce((sum, bill) => {
      const custom = amounts[String(bill.id)];
      return sum + (custom ? parseFloat(custom) : parseFloat(bill.amount_due));
    }, 0);
  }, [bills, amounts]);

  const isOzowSource = selectedSource?.provider === 'ozow';
  const isOnegateSource = selectedSource?.provider === 'onegate';
  // Hosted-checkout providers — recipient bank details are collected on the
  // provider's hosted page by the final payer, not in this modal. Submission
  // creates a PENDING_APPROVAL event with bill+provider only.
  const isHostedCheckoutSource = isOzowSource || isOnegateSource;
  // ProviderAccount path = anything that's not a BankAccount. The bills UI
  // routes BankAccount sources via bank_account_id and ProviderAccount sources
  // via provider_account_id (see submit handler below).
  const isProviderAccountSource = !!selectedSource && (
    selectedSource.source_model === 'provider_account' ||
    (selectedSource.source_model !== 'bank_account' && selectedSource.type !== 'bank_account')
  );

  const allRecipientsComplete = useMemo(() => {
    // Hosted-checkout providers defer recipient details to the final payer
    // on the provider's hosted page after approval.
    if (isHostedCheckoutSource) return true;
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
      } else {
        // Local pain.001 transfers must carry a branch sort code (ClrSysMmbId).
        if (!r.recipient_bank_branch_id) return false;
      }
    }
    return true;
  }, [recipients, bills.length, isHostedCheckoutSource]);

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
      setFxMode('auto');
      setFxManualRate('');
      setAckUncleared(false);
    }
  }, [isOpen]);

  // Fetch an FX quote whenever currencies differ + amount changes.
  const needsFx = Boolean(selectedSource && selectedSource.currency && selectedSource.currency !== currency);

  // Amount that will actually be debited from the source, in the source's
  // currency. Equals totalAmount when no FX is involved; otherwise applies
  // the active FX rate (auto quote or manual override).
  const sourceDebitAmount = useMemo(() => {
    if (!needsFx) return totalAmount;
    if (fxMode === 'manual') {
      const r = parseFloat(fxManualRate);
      return Number.isFinite(r) && r > 0 ? totalAmount * r : 0;
    }
    return fxQuote ? parseFloat(fxQuote.converted_amount) : 0;
  }, [needsFx, fxMode, fxManualRate, fxQuote, totalAmount]);

  // Sufficiency gate: booked balance is the hard limit (settled funds the
  // bank will actually let move). Available includes same-day uncleared
  // credits that can reverse — paying from there is OK if the user
  // acknowledges the risk. Hosted-checkout providers (Ozow / OneGate)
  // settle on their side, so the gate doesn't apply to them.
  const balanceGate = useMemo(() => {
    if (!selectedSource || isHostedCheckoutSource || sourceDebitAmount <= 0) {
      return { kind: 'ok' as const };
    }
    const available = parseFloat(selectedSource.balance ?? '0');
    const booked = selectedSource.booked_balance != null
      ? parseFloat(selectedSource.booked_balance)
      : available;
    if (sourceDebitAmount > available) {
      return { kind: 'insufficient' as const, available, booked };
    }
    if (sourceDebitAmount > booked) {
      return { kind: 'uncleared_gap' as const, available, booked };
    }
    return { kind: 'ok' as const };
  }, [selectedSource, isHostedCheckoutSource, sourceDebitAmount]);

  // Acknowledgement only matters when we're in the uncleared gap. Reset
  // it whenever the source changes so a user switching sources can't
  // accidentally inherit a stale ack.
  useEffect(() => {
    setAckUncleared(false);
  }, [selectedSource?.id]);
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

      // Pin FX in the payload. Manual rates bypass the freshness window; auto
      // rates are re-validated by the backend within the 5-minute TTL.
      if (needsFx) {
        if (fxMode === 'manual') {
          paymentData.fx = {
            manual: true,
            rate: fxManualRate,
          };
        } else if (fxQuote) {
          paymentData.fx = {
            rate: fxQuote.rate,
            provider: fxQuote.provider,
            fetched_at: fxQuote.fetched_at,
          };
        }
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
          recipient_bank_branch_id: r.recipient_bank_branch_id,
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
          // Ozow-specific — backend uses these to call OzowDisbursementAdapter.
          bank_group_id: r.bank_group_id,
          branch_code: r.branch_code,
          customer_bank_reference: r.customer_bank_reference,
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
    // Hosted-checkout providers don't need upfront recipient details — the
    // final payer fills them in on the provider's page after approval.
    const hostedCheckout = source.provider === 'ozow' || source.provider === 'onegate';
    setStep(hostedCheckout ? 'confirm' : 'recipients');
  };

  const goBack = () => {
    if (step === 'confirm') {
      setStep(isHostedCheckoutSource ? 'source' : 'recipients');
      if (isHostedCheckoutSource) setSelectedSource(null);
    } else if (step === 'recipients') {
      setStep('source');
      setSelectedSource(null);
    }
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
            {(isHostedCheckoutSource ? ['Source', 'Review'] : ['Source', 'Recipients', 'Review']).map((label, i, arr) => {
              const stepIndex = isHostedCheckoutSource
                ? (step === 'source' ? 0 : 1)
                : (step === 'source' ? 0 : step === 'recipients' ? 1 : 2);
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
                  {i < arr.length - 1 && <div className={`flex-1 h-px ${isDone ? 'bg-primary' : 'bg-border'}`} />}
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
                sourceProvider={selectedSource.provider}
                sourceProviderAccountId={isProviderAccountSource ? String(selectedSource.id) : undefined}
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

              {/* Hosted-checkout banner */}
              {isHostedCheckoutSource && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-3 text-xs text-blue-900">
                  <p className="font-medium mb-0.5">Hosted-checkout flow</p>
                  <p className="text-blue-800">
                    After approval, the final payer will confirm the amount and complete payment on{' '}
                    {selectedSource.provider === 'onegate' ? 'CallPay/OneGate' : 'Ozow'}'s hosted page.
                    The amount below is a suggestion and can be adjusted later.
                  </p>
                </div>
              )}

              {/* Bills with editable amounts */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {bills.map((bill) => {
                  const custom = amounts[String(bill.id)] || '';
                  const isPartial = custom && parseFloat(custom) < parseFloat(bill.amount_due);
                  const r = recipients.get(bill.id);
                  const recipientLine = r?.recipient_type === 'bank' && r.bank_name
                    ? `${r.bank_name}${r.recipient_bank_branch_name ? ` · ${r.recipient_bank_branch_name}` : ''}`
                    : null;
                  return (
                    <div key={bill.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{bill.vendor_name}</p>
                        <p className="text-xs text-muted-foreground">{bill.invoice_number || `#${bill.id}`}</p>
                        {recipientLine && (
                          <p className="text-[11px] text-muted-foreground/80 truncate">{recipientLine}</p>
                        )}
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
              {needsFx && (() => {
                const manualRateNum = parseFloat(fxManualRate);
                const manualRateValid = Number.isFinite(manualRateNum) && manualRateNum > 0;
                const manualConverted = manualRateValid ? totalAmount * manualRateNum : 0;
                const autoRateNum = fxQuote ? parseFloat(fxQuote.rate) : null;
                const deviationPct = (manualRateValid && autoRateNum && autoRateNum > 0)
                  ? Math.abs((manualRateNum - autoRateNum) / autoRateNum) * 100
                  : 0;
                const deviationWarn = deviationPct > 5;
                const activeRate = fxMode === 'manual' ? (manualRateValid ? manualRateNum : null) : autoRateNum;
                const activeConverted = fxMode === 'manual' ? manualConverted : (fxQuote ? parseFloat(fxQuote.converted_amount) : 0);
                return (
                  <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                        <AlertCircle className="h-4 w-4" />
                        Currency conversion required
                      </div>
                      <div className="inline-flex rounded-md border border-amber-200 bg-white overflow-hidden text-[11px]">
                        <button
                          type="button"
                          onClick={() => { setFxMode('auto'); setFxConfirmed(false); }}
                          className={`px-2 py-1 ${fxMode === 'auto' ? 'bg-amber-100 text-amber-900 font-medium' : 'text-amber-700 hover:bg-amber-50'}`}
                        >
                          Auto rate
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFxMode('manual'); setFxConfirmed(false); }}
                          className={`px-2 py-1 border-l border-amber-200 ${fxMode === 'manual' ? 'bg-amber-100 text-amber-900 font-medium' : 'text-amber-700 hover:bg-amber-50'}`}
                        >
                          My own rate
                        </button>
                      </div>
                    </div>

                    {fxMode === 'auto' && fxLoading && (
                      <div className="flex items-center gap-2 text-xs text-amber-800">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Fetching rate...
                      </div>
                    )}
                    {fxMode === 'auto' && fxError && (
                      <div className="text-xs text-destructive">
                        {fxError} — switch to "My own rate" or pick a different source account.
                      </div>
                    )}

                    {fxMode === 'manual' && (
                      <div className="space-y-1">
                        <label className="block text-[11px] text-amber-900">
                          Rate (1 {currency} = ? {selectedSource!.currency})
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={fxManualRate}
                          onChange={(e) => { setFxManualRate(e.target.value); setFxConfirmed(false); }}
                          placeholder={autoRateNum ? String(autoRateNum) : 'Enter rate'}
                          className="h-8 text-sm"
                        />
                        {!manualRateValid && fxManualRate && (
                          <p className="text-[11px] text-destructive">Rate must be a positive number.</p>
                        )}
                        {deviationWarn && (
                          <p className="text-[11px] text-amber-700">
                            Your rate differs from the market quote
                            {autoRateNum ? ` (${autoRateNum.toLocaleString(undefined, { maximumFractionDigits: 4 })})` : ''}
                            {' '}by {deviationPct.toFixed(1)}%. Double-check before confirming.
                          </p>
                        )}
                      </div>
                    )}

                    {activeRate !== null && activeRate > 0 && (
                      <>
                        <div className="text-xs text-amber-900 space-y-0.5">
                          <div>
                            Bill: <span className="font-medium">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            Will debit: <span className="font-medium">
                              {selectedSource!.currency} {activeConverted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-700">
                            Rate: 1 {currency} = {activeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedSource!.currency}
                            {' '}&middot; {fxMode === 'manual' ? 'manual' : `via ${fxQuote?.provider}`}
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
                );
              })()}

              {/* Note */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">Note (optional)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment reference or note"
                />
              </div>

              {/* Balance gate — block when over available, warn (+ require
                  acknowledgement) when in the uncleared gap between booked
                  and available. */}
              {balanceGate.kind === 'insufficient' && (
                <div className="border border-red-200 bg-red-50 rounded-lg p-3 text-sm text-red-900">
                  <div className="flex items-center gap-2 font-medium">
                    <AlertCircle className="h-4 w-4" />
                    Insufficient balance
                  </div>
                  <div className="mt-1 text-xs">
                    Will debit {selectedSource!.currency}{' '}
                    {sourceDebitAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })};
                    {' '}available is {selectedSource!.currency}{' '}
                    {balanceGate.available.toLocaleString(undefined, { minimumFractionDigits: 2 })}.
                  </div>
                </div>
              )}
              {balanceGate.kind === 'uncleared_gap' && (
                <div className="border border-amber-200 bg-amber-50 rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
                    <AlertCircle className="h-4 w-4" />
                    Paying from uncleared funds
                  </div>
                  <div className="text-xs text-amber-900">
                    Booked balance is {selectedSource!.currency}{' '}
                    {balanceGate.booked.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {' '}— {selectedSource!.currency}{' '}
                    {(balanceGate.available - balanceGate.booked).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    {' '}of your balance is same-day credit that hasn't settled yet. If
                    those credits reverse, the account could go into overdraft.
                  </div>
                  <label className="flex items-start gap-2 text-xs text-amber-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={ackUncleared}
                      onChange={(e) => setAckUncleared(e.target.checked)}
                      className="mt-0.5"
                    />
                    <span>I understand and want to proceed anyway.</span>
                  </label>
                </div>
              )}

              <Button
                onClick={() => payBillsMutation.mutate()}
                disabled={
                  payBillsMutation.isPending
                  || totalAmount <= 0
                  || balanceGate.kind === 'insufficient'
                  || (balanceGate.kind === 'uncleared_gap' && !ackUncleared)
                  || (
                    needsFx
                    && (
                      !fxConfirmed
                      || (fxMode === 'auto' && (!fxQuote || fxLoading || !!fxError))
                      || (fxMode === 'manual' && !(parseFloat(fxManualRate) > 0))
                    )
                  )
                }
                className="w-full"
              >
                {payBillsMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : balanceGate.kind === 'insufficient' ? (
                  'Insufficient balance'
                ) : balanceGate.kind === 'uncleared_gap' && !ackUncleared ? (
                  'Acknowledge uncleared funds to continue'
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
