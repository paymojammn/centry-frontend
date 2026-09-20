'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { useSaveBank } from '@/hooks/use-bank-registry';
import {
  BANK_TYPE_LABELS,
  type BankType,
  type RegistryBank,
  type RegistryCountry,
} from '@/lib/bank-registry-api';

const SWIFT_RE = /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/;

interface Props {
  open: boolean;
  onClose: () => void;
  /** Bank being edited; omit to add a new one. */
  bank?: RegistryBank | null;
  countries: RegistryCountry[];
  /** Country pre-selected for a new bank (the page's current filter). */
  defaultCountry?: string;
  onSaved?: (bank: RegistryBank) => void;
}

const emptyForm = (country = '') => ({
  country,
  name: '',
  short_name: '',
  swift_code: '',
  bank_type: 'commercial' as BankType,
  is_active: true,
});

export function BankFormDialog({ open, onClose, bank, countries, defaultCountry, onSaved }: Props) {
  const isEdit = !!bank;
  const [form, setForm] = useState(emptyForm());
  const { mutate, isPending } = useSaveBank();

  useEffect(() => {
    if (!open) return;
    setForm(
      bank
        ? {
            country: bank.country,
            name: bank.name,
            short_name: bank.short_name,
            swift_code: bank.swift_code,
            bank_type: bank.bank_type,
            is_active: bank.is_active,
          }
        : emptyForm(defaultCountry),
    );
  }, [open, bank, defaultCountry]);

  const swift = form.swift_code.replace(/\s/g, '').toUpperCase();
  const swiftInvalid = !!swift && !SWIFT_RE.test(swift);
  const canSave = !!form.country && !!form.name.trim() && !swiftInvalid && !isPending;
  const countryName = countries.find((c) => c.code === form.country)?.name || '';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    mutate(
      { id: bank?.id, data: { ...form, name: form.name.trim(), swift_code: swift } },
      {
        onSuccess: (saved) => {
          toast.success(isEdit ? `${saved.name} updated` : `${saved.name} added to ${saved.country_name}`);
          onSaved?.(saved);
          onClose();
        },
        onError: (err) => toast.error((err as Error).message || 'Could not save bank'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEdit ? 'Edit Bank' : 'Add Bank'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {isEdit
              ? 'Changes apply everywhere this bank is used.'
              : 'The bank becomes available to every organization when paying recipients in this country.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <SearchableSelect
            label="Country"
            placeholder="Select country…"
            value={form.country}
            displayValue={countryName}
            // Branch sort codes are country-specific, so a bank can't move country.
            disabled={isEdit}
            options={countries.map((c) => ({ value: c.code, label: c.name, hint: c.code }))}
            onSelect={(code) => setForm((f) => ({ ...f, country: code }))}
          />

          <div className="space-y-1.5">
            <Label htmlFor="bank-name" className="text-xs font-medium text-muted-foreground">
              Bank name
            </Label>
            <Input
              id="bank-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Stanbic Bank Uganda Limited"
              maxLength={200}
              className="h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bank-short-name" className="text-xs font-medium text-muted-foreground">
                Short name <span className="text-muted-foreground/40">(optional)</span>
              </Label>
              <Input
                id="bank-short-name"
                value={form.short_name}
                onChange={(e) => setForm((f) => ({ ...f, short_name: e.target.value }))}
                placeholder="e.g. Stanbic Bank"
                maxLength={100}
                className="h-10"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bank-swift" className="text-xs font-medium text-muted-foreground">
                SWIFT / BIC <span className="text-muted-foreground/40">(optional)</span>
              </Label>
              <Input
                id="bank-swift"
                value={form.swift_code}
                onChange={(e) => setForm((f) => ({ ...f, swift_code: e.target.value.toUpperCase() }))}
                placeholder="SBICUGKX"
                maxLength={11}
                className="h-10 font-mono"
                aria-invalid={swiftInvalid}
              />
            </div>
          </div>
          {swiftInvalid ? (
            <p className="text-[11px] text-destructive -mt-2">SWIFT/BIC must be 8 or 11 characters.</p>
          ) : (
            !swift && (
              <p className="text-[11px] text-muted-foreground -mt-2">
                Needed for international transfers to this bank.
              </p>
            )
          )}

          <SearchableSelect
            label="Bank type"
            placeholder="Select type…"
            value={form.bank_type}
            displayValue={BANK_TYPE_LABELS[form.bank_type]}
            options={Object.entries(BANK_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            onSelect={(v) => setForm((f) => ({ ...f, bank_type: v as BankType }))}
          />

          {isEdit && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <p className="text-sm text-foreground">Active</p>
                <p className="text-[11px] text-muted-foreground">
                  Inactive banks are hidden from payment recipient pickers.
                </p>
              </div>
              <Switch
                checked={form.is_active}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="btn-press">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave}
              className="bg-primary hover:bg-primary/90 text-white btn-press"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update Bank' : 'Add Bank'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
