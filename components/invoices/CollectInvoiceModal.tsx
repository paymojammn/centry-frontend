'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePaymentSources } from '@/hooks/use-payment-sources';
import { invoicesApi, Invoice } from '@/lib/invoices-api';
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
    }
  }, [isOpen]);

  // Map source type to API method code
  const getMethodCode = (source: PaymentSource): string => {
    if (source.type === 'mobile_money') {
      return source.provider === 'airtel' ? 'airtel_momo' : 'mtn_momo';
    }
    if (source.type === 'ozow') return 'ozow_eft';
    return 'bank_transfer';
  };

  const collectMutation = useMutation({
    mutationFn: () => {
      if (!selectedSource) throw new Error('No source selected');
      return invoicesApi.collectInvoices({
        organization_id: organizationId,
        invoice_ids: invoices.map((i) => i.id),
        amounts,
        method: getMethodCode(selectedSource),
        phone_number: phone,
        note,
      });
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });

      // Ozow: redirect to payment page
      if (selectedSource?.type === 'ozow' && data.results.length === 1) {
        const ref = data.results[0]?.reference || '';
        if (ref.startsWith('http')) {
          toast.success('Redirecting to payment page...');
          window.location.href = ref;
          return;
        }
      }

      setResults(data.results);
      setStep('result');
      if (data.summary.successful > 0) toast.success(`${data.summary.successful} collection(s) initiated`);
      if (data.summary.failed > 0) toast.error(`${data.summary.failed} collection(s) failed`);
    },
    onError: (err: Error) => { toast.error(err.message || 'Collection failed'); },
  });

  const totalAmount = Object.values(amounts).reduce((sum, v) => sum + (parseFloat(v) || 0), 0);
  const currency = invoices[0]
    ? (invoices[0].currency.includes('.') ? invoices[0].currency.split('.').pop()! : invoices[0].currency)
    : 'USD';

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
              <Button onClick={() => collectMutation.mutate()} disabled={collectMutation.isPending || totalAmount <= 0} className="w-full">
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
                return (
                  <div key={r.invoice_id} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    {r.success ? <CheckCircle className="h-5 w-5 text-primary shrink-0" /> : <AlertCircle className="h-5 w-5 text-destructive shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{inv?.customer_name || `#${r.invoice_id}`}</p>
                      <p className="text-xs text-muted-foreground">{r.success ? `Ref: ${r.reference}` : r.error_message}</p>
                    </div>
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
