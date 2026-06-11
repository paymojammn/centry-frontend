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
  Download,
  Building2,
  Copy as CopyIcon,
  Mail,
  ExternalLink,
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

  // Step indicator config — collapses Phone step when source doesn't need it
  const requiresPhone = !!selectedSource?.requires_phone;
  const stepLabels = step === 'source'
    ? ['Source', 'Details', 'Review']
    : requiresPhone
      ? ['Source', 'Phone', 'Review']
      : ['Source', 'Review'];
  const stepIndex = (() => {
    if (step === 'source') return 0;
    if (step === 'details') return 1;
    if (step === 'review') return requiresPhone ? 2 : 1;
    return stepLabels.length;
  })();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-card rounded-2xl shadow-xl ring-1 ring-foreground/10 w-full max-w-lg mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header — charcoal (sidebar) bar + white text, minimalist */}
        <div className="shrink-0 bg-foreground text-background">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3 min-w-0">
              {step !== 'source' && step !== 'result' && (
                <button
                  onClick={() => setStep(step === 'review' ? (selectedSource?.requires_phone ? 'details' : 'source') : 'source')}
                  aria-label="Back"
                  className="-ml-1.5 p-1.5 rounded-lg text-background/55 hover:text-background hover:bg-background/10 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                </button>
              )}
              <div className="flex items-center justify-center size-9 rounded-xl bg-background shrink-0">
                <Download className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[15px] font-medium leading-none tracking-[-0.01em]">Collect payment</h2>
                <p className="mt-1.5 text-[11px] tracking-wide text-background/50">
                  {invoices.length} invoice{invoices.length > 1 ? 's' : ''}
                  <span className="mx-1.5 text-background/25">·</span>
                  <span className="font-medium tabular-nums text-background/80">
                    {currency} {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="-mr-1.5 p-1.5 rounded-lg text-background/55 hover:text-background hover:bg-background/10 transition-colors shrink-0"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>

        {/* Step indicator — minimalist */}
        {step !== 'result' && (
          <div className="flex items-center gap-2 px-6 py-3.5 border-b border-border shrink-0">
            {stepLabels.map((label, i, arr) => {
              const isActive = stepIndex === i;
              const isDone = stepIndex > i;
              return (
                <div key={label} className="flex items-center gap-2 flex-1 last:flex-none">
                  <div className={`flex items-center gap-2 text-[12px] tracking-tight transition-colors ${isActive ? 'font-medium text-foreground' : isDone ? 'font-medium text-primary' : 'font-normal text-muted-foreground/50'}`}>
                    <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-medium transition-all ${
                      isDone
                        ? 'bg-primary text-primary-foreground'
                        : isActive
                          ? 'bg-foreground text-background'
                          : 'bg-muted text-muted-foreground/60'
                    }`}>
                      {isDone ? <CheckCircle className="w-3 h-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </div>
                  {i < arr.length - 1 && (
                    <div className={`flex-1 h-px transition-colors ${isDone ? 'bg-primary/40' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5">
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
              {/* Source summary — branded card */}
              <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
                <div className="flex items-center justify-center size-9 rounded-lg bg-background ring-1 ring-border shrink-0">
                  <Building2 className="h-4 w-4 text-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold">Collecting via</p>
                  <p className="text-sm font-semibold text-foreground truncate">
                    {selectedSource?.name}
                    {phone && <span className="ml-2 text-xs font-normal text-muted-foreground">· {phone}</span>}
                  </p>
                </div>
                {selectedSource && selectedSource.currency !== currency && (
                  <span className="shrink-0 px-2 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800">
                    {currency} → {selectedSource.currency}
                  </span>
                )}
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
              {/* Total — charcoal anchor bar */}
              <div className="flex items-center justify-between rounded-xl bg-foreground px-4 py-3.5 text-background">
                <span className="text-[11px] uppercase tracking-wider font-medium text-background/55">Total to collect</span>
                <span className="text-xl font-medium tabular-nums">
                  <span className="text-xs font-normal text-background/55 mr-1">{currency}</span>
                  {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
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
                  <div className="border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                        Currency conversion required
                      </div>
                      <div className="inline-flex rounded-lg border border-border overflow-hidden text-[11px]">
                        <button
                          type="button"
                          onClick={() => { setFxMode('auto'); setFxConfirmed(false); }}
                          className={`px-2.5 py-1 transition-colors ${fxMode === 'auto' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          Auto rate
                        </button>
                        <button
                          type="button"
                          onClick={() => { setFxMode('manual'); setFxConfirmed(false); }}
                          className={`px-2.5 py-1 border-l border-border transition-colors ${fxMode === 'manual' ? 'bg-foreground text-background font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                          My own rate
                        </button>
                      </div>
                    </div>

                    {fxMode === 'auto' && fxLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Fetching rate…
                      </div>
                    )}
                    {fxMode === 'auto' && fxError && (
                      <div className="text-xs text-destructive">
                        {fxError} — switch to "My own rate" or pick a different source.
                      </div>
                    )}

                    {fxMode === 'manual' && (
                      <div className="space-y-1.5">
                        <label className="block text-[11px] text-muted-foreground">
                          Rate (1 {currency} = ? {selectedSource!.currency})
                        </label>
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          value={fxManualRate}
                          onChange={(e) => { setFxManualRate(e.target.value); setFxConfirmed(false); }}
                          placeholder={autoRateNum ? String(autoRateNum) : 'Enter rate'}
                          className="h-9 text-sm"
                        />
                        {!manualRateValid && fxManualRate && (
                          <p className="text-[11px] text-destructive">Rate must be a positive number.</p>
                        )}
                        {deviationWarn && (
                          <p className="text-[11px] text-muted-foreground">
                            Your rate differs from the market quote
                            {autoRateNum ? ` (${autoRateNum.toLocaleString(undefined, { maximumFractionDigits: 4 })})` : ''}
                            {' '}by {deviationPct.toFixed(1)}%. Double-check before confirming.
                          </p>
                        )}
                      </div>
                    )}

                    {activeRate !== null && activeRate > 0 && (
                      <>
                        <div className="space-y-1.5 pt-3 border-t border-border text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Invoice</span>
                            <span className="font-medium text-foreground tabular-nums">{currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Customer will pay</span>
                            <span className="font-medium text-foreground tabular-nums">
                              {selectedSource!.currency} {activeConverted.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                            <span>Rate</span>
                            <span className="tabular-nums">
                              1 {currency} = {activeRate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {selectedSource!.currency}
                              {' '}· {fxMode === 'manual' ? 'manual' : `via ${fxQuote?.provider}`}
                            </span>
                          </div>
                        </div>
                        <label className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={fxConfirmed}
                            onChange={(e) => setFxConfirmed(e.target.checked)}
                            className="mt-0.5 accent-foreground"
                          />
                          <span className="text-muted-foreground">
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
                className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-shadow"
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
              {/* Summary hero with halo */}
              {(() => {
                const allOk = results.every((r) => r.success);
                return (
                  <div className="text-center py-4">
                    <div className="relative mx-auto mb-3 size-16">
                      <div className={`absolute inset-0 rounded-full blur-xl ${allOk ? 'bg-primary/15' : 'bg-destructive/15'}`} />
                      <div className={`relative size-16 rounded-full flex items-center justify-center ring-1 ${allOk ? 'bg-gradient-to-br from-primary/15 to-primary/5 ring-primary/25' : 'bg-destructive/10 ring-destructive/25'}`}>
                        {allOk
                          ? <CheckCircle className="h-8 w-8 text-primary" strokeWidth={2.5} />
                          : <AlertCircle className="h-8 w-8 text-destructive" strokeWidth={2.5} />}
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground tracking-tight">
                      {allOk ? 'Collection initiated' : 'Some collections failed'}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {allOk
                        ? `Send the payment link${results.length > 1 ? 's' : ''} below to your customer${results.length > 1 ? 's' : ''}.`
                        : 'Review the results below.'}
                    </p>
                  </div>
                );
              })()}

              {results.map((r) => {
                const inv = invoices.find((i) => i.id === r.invoice_id);
                const hasPaymentLink = r.payment_link && r.payment_link.startsWith('http');
                return (
                  <div key={r.invoice_id} className="p-4 rounded-xl border border-border bg-card space-y-3">
                    <div className="flex items-center gap-3">
                      {r.success ? (
                        <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <CheckCircle className="h-4 w-4 text-primary" />
                        </div>
                      ) : (
                        <div className="size-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
                          <AlertCircle className="h-4 w-4 text-destructive" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{inv?.customer_name || `#${r.invoice_id}`}</p>
                        <p className="text-xs text-muted-foreground truncate">{r.success ? `Ref: ${r.reference}` : r.error_message}</p>
                      </div>
                    </div>
                    {/* Ozow payment link — copy or send to customer */}
                    {hasPaymentLink && (
                      <div className="rounded-lg border border-dashed border-primary/30 bg-primary/5 p-3 space-y-2.5">
                        <p className="text-[10px] uppercase tracking-wider font-medium text-primary">
                          Payment link — send to customer
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text" readOnly value={r.payment_link}
                            className="flex-1 text-xs bg-card border border-border rounded-md px-2.5 py-1.5 text-foreground truncate font-mono"
                          />
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(r.payment_link);
                              toast.success('Link copied');
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-card border border-border rounded-md hover:bg-primary/10 hover:border-primary/30 transition-colors shrink-0"
                          >
                            <CopyIcon className="h-3 w-3" />
                            Copy
                          </button>
                        </div>
                        <div className="flex items-center gap-3 pt-0.5">
                          <a
                            href={`mailto:?subject=Payment for Invoice ${inv?.invoice_number || ''}&body=Please complete your payment using this link: ${r.payment_link}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            <Mail className="h-3 w-3" />
                            Email
                          </a>
                          <span className="text-muted-foreground/30">·</span>
                          <a
                            href={r.payment_link} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <Button
                onClick={onClose}
                className="w-full h-11 text-sm font-semibold shadow-md shadow-primary/20"
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
