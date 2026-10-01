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
import { useSaveBranch } from '@/hooks/use-bank-registry';
import type { RegistryBank, RegistryBranch } from '@/lib/bank-registry-api';

interface Props {
  open: boolean;
  onClose: () => void;
  bank: RegistryBank;
  /** Branch being edited; omit to add a new one. */
  branch?: RegistryBranch | null;
}

const emptyForm = () => ({
  branch_code: '',
  branch_name: '',
  address: '',
  is_head_office: false,
  is_active: true,
});

export function BranchFormDialog({ open, onClose, bank, branch }: Props) {
  const isEdit = !!branch;
  const [form, setForm] = useState(emptyForm());
  const { mutate, isPending } = useSaveBranch();

  useEffect(() => {
    if (!open) return;
    setForm(
      branch
        ? {
            branch_code: branch.branch_code,
            branch_name: branch.branch_name,
            address: branch.address,
            is_head_office: branch.is_head_office,
            is_active: branch.is_active,
          }
        : emptyForm(),
    );
  }, [open, branch]);

  const canSave = !!form.branch_code.trim() && !isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    mutate(
      { id: branch?.id, data: { ...form, bank: bank.id, branch_code: form.branch_code.trim() } },
      {
        onSuccess: (saved) => {
          toast.success(
            `${saved.branch_name || saved.branch_code} ${isEdit ? 'updated' : `added to ${saved.bank_name}`}`,
          );
          onClose();
        },
        onError: (err) => toast.error((err as Error).message || 'Could not save branch'),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-foreground">
            {isEdit ? 'Edit Branch' : 'Add Branch'}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {bank.short_name || bank.name} · {bank.country_name}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="branch-code" className="text-xs font-medium text-muted-foreground">
                Branch / sort code
              </Label>
              <Input
                id="branch-code"
                value={form.branch_code}
                onChange={(e) =>
                  setForm((f) => ({ ...f, branch_code: e.target.value.replace(/[^A-Za-z0-9-]/g, '') }))
                }
                placeholder="e.g. 040147"
                maxLength={20}
                className="h-10 font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branch-name" className="text-xs font-medium text-muted-foreground">
                Branch name <span className="text-muted-foreground/40">(optional)</span>
              </Label>
              <Input
                id="branch-name"
                value={form.branch_name}
                onChange={(e) => setForm((f) => ({ ...f, branch_name: e.target.value }))}
                placeholder="e.g. Kampala Road"
                maxLength={255}
                className="h-10"
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground -mt-2">
            The code is written into payment files to route funds — copy it exactly from the bank.
          </p>

          <div className="space-y-1.5">
            <Label htmlFor="branch-address" className="text-xs font-medium text-muted-foreground">
              Address <span className="text-muted-foreground/40">(optional)</span>
            </Label>
            <Input
              id="branch-address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              placeholder="Street, city"
              className="h-10"
            />
          </div>

          <div className="rounded-lg border border-border divide-y divide-border">
            <div className="flex items-center justify-between px-3 py-2.5">
              <div>
                <p className="text-sm text-foreground">Head office</p>
                <p className="text-[11px] text-muted-foreground">
                  Pre-selected for local transfers. Replaces the current head office.
                </p>
              </div>
              <Switch
                checked={form.is_head_office}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_head_office: v }))}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {isEdit && (
              <div className="flex items-center justify-between px-3 py-2.5">
                <div>
                  <p className="text-sm text-foreground">Active</p>
                  <p className="text-[11px] text-muted-foreground">
                    Inactive branches are hidden from payment recipient pickers.
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  className="data-[state=checked]:bg-primary"
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} className="btn-press">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSave}
              className="bg-primary hover:bg-primary/90 text-white btn-press"
            >
              {isPending ? 'Saving...' : isEdit ? 'Update Branch' : 'Add Branch'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
