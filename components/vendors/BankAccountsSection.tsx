'use client';

/**
 * Vendor bank accounts — list + add/edit/delete. Each account is tied to a
 * Bank and Branch from banking_integrations (the branch supplies the
 * branch_code used in payment files).
 */

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Star,
  CreditCard,
  Check,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useContactBankAccounts,
  useCreateContactBankAccount,
  useUpdateContactBankAccount,
  useDeleteContactBankAccount,
  useBanks,
  useBankBranches,
} from '@/hooks/use-contacts';
import type { ContactBankAccount } from '@/lib/contacts-api';

interface FormState {
  bank: number | '';
  branch: number | '';
  account_name: string;
  account_number: string;
  currency: string;
  is_primary: boolean;
}

const EMPTY: FormState = {
  bank: '',
  branch: '',
  account_name: '',
  account_number: '',
  currency: '',
  is_primary: false,
};

const selectCls =
  'w-full h-9 px-3 rounded-lg border border-border bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary disabled:opacity-50';

export default function BankAccountsSection({ contactId }: { contactId: number }) {
  const { data: accounts = [], isLoading } = useContactBankAccounts(contactId);
  const create = useCreateContactBankAccount(contactId);
  const update = useUpdateContactBankAccount(contactId);
  const remove = useDeleteContactBankAccount(contactId);
  const { data: banks = [] } = useBanks();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const { data: branches = [] } = useBankBranches(form.bank ? Number(form.bank) : undefined);

  const openAdd = () => {
    setForm(EMPTY);
    setEditingId(null);
    setShowForm(true);
  };

  const openEdit = (a: ContactBankAccount) => {
    setForm({
      bank: a.bank,
      branch: a.branch ?? '',
      account_name: a.account_name,
      account_number: a.account_number,
      currency: a.currency,
      is_primary: a.is_primary,
    });
    setEditingId(a.id);
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
  };

  const saving = create.isPending || update.isPending;

  const save = () => {
    if (!form.bank || !form.account_name.trim() || !form.account_number.trim()) {
      toast.error('Bank, account name and account number are required');
      return;
    }
    const payload = {
      contact: contactId,
      bank: Number(form.bank),
      branch: form.branch ? Number(form.branch) : null,
      account_name: form.account_name.trim(),
      account_number: form.account_number.trim(),
      currency: form.currency.trim(),
      is_primary: form.is_primary,
    };
    const opts = {
      onSuccess: () => {
        toast.success(editingId ? 'Bank account updated' : 'Bank account added');
        close();
      },
      onError: (e: Error) => toast.error(e?.message || 'Could not save bank account'),
    };
    if (editingId) update.mutate({ id: editingId, data: payload }, opts);
    else create.mutate(payload, opts);
  };

  const del = (a: ContactBankAccount) => {
    if (!confirm(`Delete bank account ${a.account_number}?`)) return;
    remove.mutate(a.id, {
      onSuccess: () => toast.success('Bank account removed'),
      onError: (e: Error) => toast.error(e?.message || 'Could not delete'),
    });
  };

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-medium text-foreground">Bank accounts</h3>
        </div>
        {!showForm && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="px-6 py-4 space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
          </div>
        ) : accounts.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground/70">
            No bank accounts yet. Add one to pay this vendor by bank transfer.
          </p>
        ) : (
          accounts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border p-3 flex items-start justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-foreground truncate">{a.account_name}</span>
                  {a.is_primary && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-primary/10 text-primary">
                      <Star className="h-3 w-3" /> Primary
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground tabular-nums mt-0.5">{a.account_number}</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  {a.bank_name}
                  {a.branch_name ? ` · ${a.branch_name}` : ''}
                  {a.branch_code ? ` (${a.branch_code})` : ''}
                  {a.currency ? ` · ${a.currency}` : ''}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(a)}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Edit"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => del(a)}
                  disabled={remove.isPending}
                  className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))
        )}

        {showForm && (
          <div className="rounded-xl border border-border p-4 space-y-3 bg-muted/20">
            <div className="text-xs font-medium text-foreground">
              {editingId ? 'Edit bank account' : 'New bank account'}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Bank</label>
                <select
                  value={form.bank}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bank: e.target.value ? Number(e.target.value) : '',
                      branch: '',
                    }))
                  }
                  className={selectCls}
                >
                  <option value="">Select bank…</option>
                  {banks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.short_name || b.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Branch</label>
                <select
                  value={form.branch}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, branch: e.target.value ? Number(e.target.value) : '' }))
                  }
                  disabled={!form.bank}
                  className={selectCls}
                >
                  <option value="">{form.bank ? 'Select branch…' : 'Pick a bank first'}</option>
                  {branches.map((br) => (
                    <option key={br.id} value={br.id}>
                      {(br.branch_name || br.branch_code) + ` (${br.branch_code})`}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Account name</label>
                <Input
                  value={form.account_name}
                  onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                  placeholder="Account holder name"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Account number</label>
                <Input
                  value={form.account_number}
                  onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                  placeholder="Account number"
                  className="h-9 text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">Currency (optional)</label>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))}
                  placeholder="e.g. UGX"
                  className="h-9 text-sm"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                  className="accent-foreground"
                />
                Primary account (used when paying this vendor)
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={close} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs text-white hover:opacity-90"
                style={{ backgroundColor: 'var(--foreground)' }}
                onClick={save}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Check className="h-3.5 w-3.5 mr-1" />
                )}
                {editingId ? 'Save' : 'Add account'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
