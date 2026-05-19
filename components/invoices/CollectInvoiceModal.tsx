'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaymentSources } from '@/hooks/use-payment-sources';
import { invoicesApi, Invoice } from '@/lib/invoices-api';
import { billsApi } from '@/lib/bills-api';
import type { PaymentSource } from '@/types/payment-sources';
import PaymentSourcePicker from '@/components/shared/PaymentSourcePicker';
import {
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Step = 'source' | 'details' | 'review' | 'result';

interface CollectInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoices: Invoice[];
  organizationId: string;
}

export default function CollectInvoiceModal({
  isOpen,
  onClose,
  invoices,
  organizationId,
}: CollectInvoiceModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>('source');
  const [selectedSource, setSelectedSource] = useState<PaymentSource | null>(null);
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [results, setResults] = useState<any[]>([]);

  // FX state — shown when the source's settle currency differs from the
  // invoice currency. Mirrors PayBillsModal.
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
  const [fxMode, setFxMode] = useState<'auto' | 'manual'>('auto');
  const [fxManualRate, setFxManualRate] = useState<string>('');

  const { data: sourcesData } = usePaymentSources(organizationId);
  const sources = sourcesData?.sources || [];

  // Initialize amounts
  useEffect(() => {
    if (isOpen) {
      const initial: Record<string, string> = {};
      invoices.forEach((inv) => { initial[String(inv.id)] = inv.amount_due; });
      setAmounts(initial);
    }
  }, [isOpen, invoices]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('source');
      setSelectedSource(null);
      setPhone('');
      setNote('');
      setResults([]);
      setFxQuote(null);
      setFxError(null);
      setFxConfirmed(false);
      setFxMode('auto');
      setFxManualRate('');
    }
  }, [isOpen]);

  // Map source type to API method code
  const getMethodCode = (source: PaymentSource): string => {
    if (source.type === 'mobile_money') {
      return source.provider === 'airtel' ? 'airtel_momo' : 'mtn_momo';
    }
    if (source.type === 'ozow') return 'ozow_eft';
    if (source.type === 'onegate') return 'onegate';
    return 'bank_transfer';
  };

  const totalAmount = Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const currency = invoices[0]
    ? (invoices[0].currency.includes('.') ? invoices[0].currency.split('.').pop()! : invoices[0].currency)
    : 'USD';

  // FX needed when the source settle currency differs from the invoice
  // currency. For Ozow/OneGate this is always ZAR vs invoice currency.
  const needsFx = Boolean(
    selectedSource && selectedSource.currency && selectedSource.currency !== currency,
  );

  // Fetch FX quote when we hit the review step and FX is needed.
  useEffect(() => {
    let cancelled = false;
    if (!needsFx || step !== 'review' || totalAmount <= 0) {
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

  const collectMutation = useMutation({
    mutationFn: () => {
      if (!selectedSource) throw new Error('No source selected');
      const payload: any = {
        organization_id: organizationId,
        invoice_ids: invoices.map((i) => i.id),
        amounts,
        method: getMethodCode(selectedSource),
        phone_number: phone,
        note,
      };
      // Lock the FX rate at submission so the approved amount is what
      // the customer is charged. Manual rates bypass the 5-min freshness
      // window; auto rates are re-validated by the backend.
      if (needsFx) {
        if (fxMode === 'manual') {
          payload.fx = { manual: true, rate: fxManualRate };
        } else if (fxQuote) {
          payload.fx = {
            rate: fxQuote.rate,
            provider: fxQuote.provider,
            fetched_at: fxQuote.fetched_at,
          };
        }
      }
      return invoicesApi.collectInvoices(payload);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });

      // Show results with payment links (Ozow sends link to customer, not redirect)
      setResults(data.results);
      setStep('result');
      if (data.summary.successful > 0) toast.success(`${data.summary.successful} collection(s) initiated`);
      if (data.summary.failed > 0) toast.error(`${data.summary.failed} collection(s) failed`);
    },
    onError: (err: Error) => { toast.error(err.message || 'Collection failed'); },
  });

  const handleSourceSelect = (source: PaymentSource) => {
    setSelectedSource(source);
    if (source.requires_phone) {
      setStep('details');
    } else {
      setStep('review');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== 'source' && step !== 'result' && (
              <button
                onClick={() => setStep(step === 'review' ? (selectedSource?.requires_phone ? 'details' : 'source') : 'source')}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">Collect Payment</h2>
              <p className="text-sm text-muted-foreground">
                {invoices.length} invoice{invoices.length > 1 ? 's' : ''} &middot; {currency} {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5">
          {/* Step 1: Pick source */}
          {step === 'source' && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Choose how to collect payment from the customer.</p>
              <PaymentSourcePicker
                sources={sources}
                mode="collection"
                onSelect={handleSourceSelect}
                emptyMessage="No collection methods available. Link a provider account to your organization."
              />
            </div>
          )}

          {/* Step 2: Phone number (mobile money) */}
          {step === 'details' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the customer's {selectedSource?.provider === 'mtn' ? 'MTN' : selectedSource?.provider === 'airtel' ? 'Airtel' : ''} phone number.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Customer phone number</label>
                <Input
                  type="tel" value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="256701234567" className="h-11" autoFocus
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Include country code</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Note (optional)</label>
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Payment reference" className="h-11" />
              </div>
              <Button onClick={() => setStep('review')} disabled={!phone.match(/^\d{10,15}$/)} className="w-full">
                Continue to Review
              </Button>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Via:</span>
                <span className="font-medium text-foreground">{selectedSource?.name}</span>
                {phone && <><span className="text-muted-foreground">&middot;</span><span>{phone}</span></>}
              </div>
              <div className="border border-border rounded-lg divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_number || `#${inv.id}`}</p>
                    </div>
                    <div className="text-right">
                      <Input
                        type="number" value={amounts[String(inv.id)] || ''}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [String(inv.id)]: e.target.value }))}
                        className="w-28 h-8 text-right text-sm" step="0.01" max={inv.amount_due}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">of {currency} {parseFloat(inv.amount_due).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              </div>

              {/* FX Quote — shown when source settle currency differs from invoice currency */}
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
                        {fxError} — switch to "My own rate" or pick a different source.
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
                            Invoice: <span className="font-medium">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div>
                            Customer will pay: <span className="font-medium">
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
                            I confirm this rate. The customer will be charged in {selectedSource!.currency} on the provider's page.
                          </span>
                        </label>
                      </>
                    )}
                  </div>
                );
              })()}

              <Button
                onClick={() => collectMutation.mutate()}
                disabled={
                  collectMutation.isPending
                  || totalAmount <= 0
                  || (needsFx && !fxConfirmed)
                  || (needsFx && fxMode === 'manual' && !(parseFloat(fxManualRate) > 0))
                  || (needsFx && fxMode === 'auto' && !fxQuote)
                }
                className="w-full"
              >
                {collectMutation.isPending
                  ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                  : `Collect ${currency} ${totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
              </Button>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 'result' && (
            <div className="space-y-4">
              {results.map((r) => {
                const inv = invoices.find((i) => i.id === r.invoice_id);
                const hasPaymentLink = r.payment_link && r.payment_link.startsWith('http');
                return (
                  <div key={r.invoice_id} className="p-4 rounded-lg border border-border space-y-3">
                    <div className="flex items-center gap-3">
                      {r.success ? <CheckCircle className="h-5 w-5 text-primary shrink-0" /> : <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv?.customer_name || `#${r.invoice_id}`}</p>
                        <p className="text-xs text-muted-foreground">{r.success ? `Ref: ${r.reference}` : r.error_message}</p>
                      </div>
                    </div>
                    {/* Ozow payment link — copy or send to customer */}
                    {hasPaymentLink && (
                      <div className="bg-muted rounded-lg p-3 space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground">Payment link — send to customer</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text" readOnly value={r.payment_link}
                            className="flex-1 text-xs bg-card border border-border rounded px-2 py-1.5 text-foreground truncate"
                          />
                          <button
                            onClick={() => { navigator.clipboard.writeText(r.payment_link); }}
                            className="px-3 py-1.5 text-xs font-medium bg-card border border-border rounded hover:bg-muted transition-colors shrink-0"
                          >
                            Copy
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`mailto:${inv?.customer_name || ''}?subject=Payment for Invoice ${inv?.invoice_number || ''}&body=Please complete your payment using this link: ${r.payment_link}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Send via Email
                          </a>
                          <span className="text-muted-foreground">|</span>
                          <a
                            href={r.payment_link} target="_blank" rel="noopener noreferrer"
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Open link
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button onClick={onClose} className="w-full">Done</Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
