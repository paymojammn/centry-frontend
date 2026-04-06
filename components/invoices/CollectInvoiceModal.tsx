'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { invoicesApi, Invoice } from '@/lib/invoices-api';
import { getAvailablePaymentMethods, AvailablePaymentMethod } from '@/lib/billing-api';
import {
  X,
  SmartphoneIcon,
  PhoneIcon,
  Building2,
  HandCoins,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const METHOD_ICONS: Record<string, typeof SmartphoneIcon> = {
  mtn_momo: SmartphoneIcon,
  airtel_momo: PhoneIcon,
  ozow_eft: Building2,
  bank_transfer: Building2,
};

type Step = 'method' | 'details' | 'review' | 'result';

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
  const [step, setStep] = useState<Step>('method');
  const [selectedMethod, setSelectedMethod] = useState<string>('');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [methods, setMethods] = useState<AvailablePaymentMethod[]>([]);
  const [results, setResults] = useState<any[]>([]);

  // Load available collection methods
  useEffect(() => {
    if (isOpen) {
      getAvailablePaymentMethods().then(setMethods).catch(() => {});
      // Initialize amounts from invoices
      const initial: Record<string, string> = {};
      invoices.forEach((inv) => {
        initial[String(inv.id)] = inv.amount_due;
      });
      setAmounts(initial);
    }
  }, [isOpen, invoices]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep('method');
      setSelectedMethod('');
      setPhone('');
      setNote('');
      setResults([]);
    }
  }, [isOpen]);

  // Collection methods for payins (filter out 'manual' — that's for subscription billing)
  const collectionMethods = methods.filter((m) => m.code !== 'manual');

  const collectMutation = useMutation({
    mutationFn: () => {
      return invoicesApi.collectInvoices({
        organization_id: organizationId,
        invoice_ids: invoices.map((i) => i.id),
        amounts,
        method: selectedMethod,
        phone_number: phone,
        note,
      });
    },
    onSuccess: (data) => {
      setResults(data.results);
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] });

      // For Ozow: if the reference is a URL, redirect the customer to pay
      if (selectedMethod === 'ozow_eft' && data.results.length === 1) {
        const ref = data.results[0]?.reference || '';
        if (ref.startsWith('http')) {
          toast.success('Redirecting to payment page...');
          window.location.href = ref;
          return;
        }
      }

      setStep('result');
      if (data.summary.successful > 0) {
        toast.success(`${data.summary.successful} collection(s) initiated`);
      }
      if (data.summary.failed > 0) {
        toast.error(`${data.summary.failed} collection(s) failed`);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Collection failed');
    },
  });

  const totalAmount = Object.values(amounts).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  );

  const currency = invoices[0]
    ? invoices[0].currency.includes('.')
      ? invoices[0].currency.split('.').pop()!
      : invoices[0].currency
    : 'USD';

  const needsPhone = selectedMethod === 'mtn_momo' || selectedMethod === 'airtel_momo';

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-3">
            {step !== 'method' && step !== 'result' && (
              <button
                onClick={() => setStep(step === 'review' ? 'details' : 'method')}
                className="p-1 rounded hover:bg-muted transition-colors"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
            <div>
              <h2 className="text-lg font-semibold text-foreground">Collect Payment</h2>
              <p className="text-sm text-muted-foreground">
                {invoices.length} invoice{invoices.length > 1 ? 's' : ''} &middot; {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        <div className="p-5">
          {/* Step 1: Choose collection method */}
          {step === 'method' && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground mb-4">
                Choose how to collect payment from the customer.
              </p>
              {collectionMethods.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No collection methods configured. Add provider accounts in settings.
                </p>
              ) : (
                collectionMethods.map((m) => {
                  const Icon = METHOD_ICONS[m.code] || HandCoins;
                  return (
                    <button
                      key={m.code}
                      onClick={() => {
                        setSelectedMethod(m.code);
                        if (m.requires_phone) {
                          setStep('details');
                        } else {
                          setStep('review');
                        }
                      }}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-border hover:border-primary/40 hover:shadow-sm transition-all text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-foreground">{m.name}</p>
                        <p className="text-xs text-muted-foreground">{m.description}</p>
                      </div>
                      <span className="text-[10px] font-medium text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {m.region}
                      </span>
                    </button>
                  );
                })
              )}
            </div>
          )}

          {/* Step 2: Customer phone (for mobile money) */}
          {step === 'details' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Enter the customer's {selectedMethod === 'mtn_momo' ? 'MTN' : 'Airtel'} phone number.
                They will receive a payment prompt.
              </p>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Customer phone number</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  placeholder="256701234567"
                  className="h-11"
                  autoFocus
                />
                <p className="mt-1.5 text-xs text-muted-foreground">Include country code</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Note (optional)</label>
                <Input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Payment reference or note"
                  className="h-11"
                />
              </div>
              <Button
                onClick={() => setStep('review')}
                disabled={needsPhone && !phone.match(/^\d{10,15}$/)}
                className="w-full"
              >
                Continue to Review
              </Button>
            </div>
          )}

          {/* Step 3: Review and confirm */}
          {step === 'review' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-2">Review and confirm the collection.</p>

              {/* Method badge */}
              <div className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm">
                <span className="text-muted-foreground">Method:</span>
                <span className="font-medium text-foreground">
                  {collectionMethods.find((m) => m.code === selectedMethod)?.name || selectedMethod}
                </span>
                {phone && (
                  <>
                    <span className="text-muted-foreground">&middot;</span>
                    <span className="text-foreground">{phone}</span>
                  </>
                )}
              </div>

              {/* Invoice list */}
              <div className="border border-border rounded-lg divide-y divide-border">
                {invoices.map((inv) => (
                  <div key={inv.id} className="px-4 py-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{inv.customer_name}</p>
                      <p className="text-xs text-muted-foreground">{inv.invoice_number || `Invoice #${inv.id}`}</p>
                    </div>
                    <div className="text-right">
                      <Input
                        type="number"
                        value={amounts[String(inv.id)] || ''}
                        onChange={(e) => setAmounts((prev) => ({ ...prev, [String(inv.id)]: e.target.value }))}
                        className="w-28 h-8 text-right text-sm"
                        step="0.01"
                        max={inv.amount_due}
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        of {currency} {parseFloat(inv.amount_due).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-lg">
                <span className="text-sm font-medium text-foreground">Total</span>
                <span className="text-lg font-bold text-foreground">
                  {currency} {totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </span>
              </div>

              <Button
                onClick={() => collectMutation.mutate()}
                disabled={collectMutation.isPending || totalAmount <= 0}
                className="w-full"
              >
                {collectMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  `Collect ${currency} ${totalAmount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                )}
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
                    {r.success ? (
                      <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {inv?.customer_name || `Invoice #${r.invoice_id}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {r.success ? `Ref: ${r.reference}` : r.error_message}
                      </p>
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
