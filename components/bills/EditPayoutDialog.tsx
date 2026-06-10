'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import RecipientDetailsStep, { type RecipientDetails } from './RecipientDetailsStep';
import { paymentEventsApi } from '@/lib/bills-api';
import type { Bill, PaymentEvent } from '@/types/bill';

// Keys we send back to PATCH /payout-details/ (mirrors the backend registry).
const PAYOUT_FIELDS = [
  'payout_method_slug',
  'first_name',
  'surname',
  'title',
  'account_name',
  'mobile',
  'id_type',
  'id_number',
  'date_of_birth',
  'nationality',
  'country_of_issue',
  'email',
  'account_number',
  'branch_code',
] as const;

/**
 * Edit a OneGate OTT-Payout's recipient details before re-running it. Reuses
 * the bills modal OneGate rail (RecipientDetailsStep) pre-filled from the
 * event's saved payout_details, so a payout that failed on wrong details can be
 * corrected and retried.
 */
export default function EditPayoutDialog({
  event,
  open,
  onClose,
  onSaved,
}: {
  event: PaymentEvent | null;
  open: boolean;
  onClose: () => void;
  onSaved: (eventId: number, rerun: boolean) => void;
}) {
  const [recipients, setRecipients] = useState<Map<number, RecipientDetails>>(new Map());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    const d = event.payout_details || {};
    setRecipients(
      new Map([
        [
          event.id,
          {
            bill_id: event.id,
            recipient_type: 'bank',
            payout_method_slug: d.payout_method_slug || '',
            first_name: d.first_name || '',
            surname: d.surname || '',
            title: d.title || '',
            account_name: d.account_name || '',
            mobile: d.mobile || '',
            id_type: d.id_type || '',
            id_number: d.id_number || '',
            date_of_birth: d.date_of_birth || '',
            nationality: d.nationality || '',
            country_of_issue: d.country_of_issue || '',
            email: d.email || '',
            account_number: d.account_number || '',
            branch_code: d.branch_code || '',
          },
        ],
      ]),
    );
  }, [open, event]);

  const syntheticBill = useMemo(() => {
    if (!event) return null;
    return {
      id: event.id,
      vendor_name: event.vendor_name,
      invoice_number: event.bill_number,
      currency_code: event.currency,
      amount_due: event.amount,
    } as unknown as Bill;
  }, [event]);

  const r = recipients.get(event?.id ?? -1);
  const complete = useMemo(() => {
    if (!r) return false;
    if (!r.payout_method_slug) return false;
    if (!r.first_name?.trim() || !r.surname?.trim() || !r.mobile?.trim()) return false;
    if (!r.title?.trim() || !r.nationality?.trim() || !r.country_of_issue?.trim()) return false;
    if (r.requires_id && (!r.id_number?.trim() || !r.date_of_birth?.trim())) return false;
    if (r.requires_bank && (!r.account_number?.trim() || !r.branch_code?.trim())) return false;
    return true;
  }, [r]);

  const save = async (rerun: boolean) => {
    if (!event || !r) return;
    setSaving(true);
    try {
      const details: Record<string, string> = {};
      for (const k of PAYOUT_FIELDS) {
        const v = r[k];
        if (v != null) details[k] = String(v);
      }
      await paymentEventsApi.updatePayoutDetails(event.id, details);
      toast.success('Payout details updated');
      onSaved(event.id, rerun);
      onClose();
    } catch (e: unknown) {
      toast.error((e as Error)?.message || 'Failed to save payout details');
    } finally {
      setSaving(false);
    }
  };

  if (!event || !syntheticBill) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit payout details</DialogTitle>
          <DialogDescription>
            Correct the recipient details for {event.vendor_name || `payment #${event.id}`}, then
            save and re-run.
          </DialogDescription>
        </DialogHeader>

        <RecipientDetailsStep
          bills={[syntheticBill]}
          recipients={recipients}
          onRecipientsChange={setRecipients}
          paymentMethod="onegate"
          sourceProvider="onegate"
          sourceProviderAccountId={event.provider_account_id || undefined}
        />

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => save(false)}
            disabled={saving || !complete}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Save
          </Button>
          <Button
            size="sm"
            onClick={() => save(true)}
            disabled={saving || !complete}
            className="text-white"
            style={{ backgroundColor: '#5C8A65' }}
          >
            <Send className="h-4 w-4 mr-1.5" />
            Save &amp; Re-run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
