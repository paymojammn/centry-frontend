'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCancelFiscalDocument } from '@/hooks/use-fiscal';
import { UG_CANCEL_REASON_CODES } from '@/lib/fiscal';
import type { FiscalDocument } from '@/types/fiscal';

/** Cancel a fiscalized invoice — issues a credit note / cancellation. */
export function CancelDocumentDialog({
  document,
  onClose,
}: {
  document: FiscalDocument | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState('');
  const [reasonCode, setReasonCode] = useState('');
  const cancel = useCancelFiscalDocument();
  const isUG = document?.country_code === 'UG';
  const valid = reason.trim().length > 0 && reasonCode.trim().length > 0;

  const close = () => {
    setReason('');
    setReasonCode('');
    onClose();
  };

  const submit = () => {
    if (!document || !valid) return;
    cancel.mutate(
      { id: document.id, payload: { reason: reason.trim(), reason_code: reasonCode.trim() } },
      { onSuccess: close },
    );
  };

  return (
    <Dialog open={!!document} onOpenChange={(o) => !o && close()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel fiscal invoice</DialogTitle>
          <DialogDescription>
            {isUG
              ? 'Applies for a credit note with URA. The credit note is a new document that stays pending until URA approves it.'
              : 'Submits a cancellation to the tax authority as a new credit-note document.'}
            {document?.fdn ? ` FDN ${document.fdn}.` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason-code" className="text-sm font-medium text-foreground">
              Reason code
            </label>
            {isUG ? (
              <Select value={reasonCode} onValueChange={setReasonCode}>
                <SelectTrigger id="cancel-reason-code">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {UG_CANCEL_REASON_CODES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.value} · {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="cancel-reason-code"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                placeholder="Authority reason code"
              />
            )}
          </div>
          <div className="space-y-1.5">
            <label htmlFor="cancel-reason" className="text-sm font-medium text-foreground">
              Reason
            </label>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this invoice being cancelled?"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close} disabled={cancel.isPending}>
            Back
          </Button>
          <Button variant="destructive" onClick={submit} disabled={!valid || cancel.isPending}>
            {cancel.isPending ? 'Submitting…' : 'Cancel invoice'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
