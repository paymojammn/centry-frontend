'use client';

/**
 * Vendor payout accounts — list + add/edit/delete.
 *
 * Two account types:
 * - Bank transfer: country -> bank (registry, or "Other bank (not listed)"
 *   which reveals free-text bank name + SWIFT) -> branch (registry banks only),
 *   SWIFT (prefilled from the registry, editable), account name/number,
 *   optional IBAN, currency, primary flag.
 * - Mobile money: provider, number, account name.
 *
 * Works for Xero / QBO-mirrored contacts (`owner = { contact }`) and ERPNext
 * suppliers (`owner = { erpnext_contact }`) through the same endpoint.
 */

import { useMemo, useState } from 'react';
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
  Landmark,
  Smartphone,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { EmptyState } from '@/components/layout/empty-state';
import {
  useContactBankAccounts,
  useCreateContactBankAccount,
  useUpdateContactBankAccount,
  useDeleteContactBankAccount,
  useBankCountries,
  useBanks,
  useBankBranches,
} from '@/hooks/use-contacts';
import {
  MOBILE_PROVIDERS,
  SWIFT_CODE_RE,
  IBAN_RE,
  normalizeIban,
  normalizeSwift,
  type BankAccountOwner,
  type BankAccountType,
  type ContactBankAccount,
  type ContactBankAccountInput,
  type MobileProvider,
} from '@/lib/contacts-api';

/** Sentinel for the "Other bank (not listed)" option in the bank picker. */
const OTHER_BANK = 'other';

interface FormState {
  account_type: BankAccountType;
  country: string;
  bank: number | typeof OTHER_BANK | '';
  bank_name: string;
  branch: number | '';
  swift_code: string;
  account_name: string;
  account_number: string;
  iban: string;
  currency: string;
  mobile_provider: MobileProvider | '';
  mobile_number: string;
  is_primary: boolean;
}

const EMPTY: FormState = {
  account_type: 'bank',
  country: '',
  bank: '',
  bank_name: '',
  branch: '',
  swift_code: '',
  account_name: '',
  account_number: '',
  iban: '',
  currency: '',
  mobile_provider: '',
  mobile_number: '',
  is_primary: false,
};

interface BankAccountsSectionProps {
  /** Xero / QBO-mirrored contact id. Use `owner` for ERPNext suppliers. */
  contactId?: number;
  owner?: BankAccountOwner;
  /** Default currency for new accounts (vendor's default currency). */
  defaultCurrency?: string;
}

export default function BankAccountsSection({ contactId, owner, defaultCurrency }: BankAccountsSectionProps) {
  const resolvedOwner: BankAccountOwner | undefined = useMemo(
    () => owner ?? (contactId ? { contact: contactId } : undefined),
    [owner, contactId],
  );
  // Hooks need a stable owner; an undefined owner just disables the query.
  const ownerKey: BankAccountOwner = resolvedOwner ?? { contact: 0 };

  const { data: accounts = [], isLoading } = useContactBankAccounts(resolvedOwner);
  const create = useCreateContactBankAccount(ownerKey);
  const update = useUpdateContactBankAccount(ownerKey);
  const remove = useDeleteContactBankAccount(ownerKey);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [touched, setTouched] = useState(false);

  const isBank = form.account_type === 'bank';
  const isOtherBank = form.bank === OTHER_BANK;
  const registryBankId = typeof form.bank === 'number' ? form.bank : undefined;

  const { data: countries = [], isLoading: countriesLoading } = useBankCountries();
  const { data: banks = [], isLoading: banksLoading } = useBanks(form.country || undefined);
  const { data: branches = [], isLoading: branchesLoading } = useBankBranches(registryBankId);

  const selectedCountry = countries.find((c) => c.code === form.country);
  const selectedBank = banks.find((b) => b.id === registryBankId);
  const selectedBranch = branches.find((b) => b.id === form.branch);

  const openAdd = () => {
    setForm({ ...EMPTY, currency: (defaultCurrency || '').toUpperCase().slice(0, 8), is_primary: accounts.length === 0 });
    setEditingId(null);
    setTouched(false);
    setShowForm(true);
  };

  const openEdit = (a: ContactBankAccount) => {
    setForm({
      account_type: a.account_type,
      country: a.bank_country_code || a.country || '',
      bank: a.bank ?? (a.account_type === 'bank' ? OTHER_BANK : ''),
      bank_name: a.bank ? '' : a.bank_name || '',
      branch: a.branch ?? '',
      swift_code: a.swift_code || '',
      account_name: a.account_name,
      account_number: a.account_type === 'mobile_money' ? '' : a.account_number,
      iban: a.iban || '',
      currency: a.currency,
      mobile_provider: a.mobile_provider || '',
      mobile_number: a.mobile_number || '',
      is_primary: a.is_primary,
    });
    setEditingId(a.id);
    setTouched(false);
    setShowForm(true);
  };

  const close = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY);
    setTouched(false);
  };

  // Field-level validation mirrors the serializer so errors show inline
  // before the request goes out.
  const errors = useMemo(() => {
    const e: Partial<Record<keyof FormState, string>> = {};
    if (!form.account_name.trim()) e.account_name = 'Account holder name is required';
    if (isBank) {
      const swift = normalizeSwift(form.swift_code);
      if (!form.bank) e.bank = 'Pick a bank, or choose "Other bank (not listed)"';
      if (isOtherBank && !form.bank_name.trim()) e.bank_name = 'Enter the bank name';
      if (isOtherBank && !swift) e.swift_code = 'SWIFT/BIC is required for banks not in the list';
      if (swift && !SWIFT_CODE_RE.test(swift)) e.swift_code = '8 or 11 characters, e.g. SBICUGKX';
      const iban = normalizeIban(form.iban);
      if (iban && !IBAN_RE.test(iban)) e.iban = 'Enter a valid IBAN (country, 2 check digits, then 11–30 characters)';
      if (!form.account_number.trim() && !iban) e.account_number = 'Enter an account number or an IBAN';
    } else {
      if (!form.mobile_provider) e.mobile_provider = 'Choose a provider';
      if (!form.mobile_number.trim()) e.mobile_number = 'Enter the mobile money number';
    }
    return e;
  }, [form, isBank, isOtherBank]);

  const hasErrors = Object.keys(errors).length > 0;
  const saving = create.isPending || update.isPending;

  const save = () => {
    setTouched(true);
    if (hasErrors || !resolvedOwner) return;
    const payload: ContactBankAccountInput = {
      ...resolvedOwner,
      account_type: form.account_type,
      account_name: form.account_name.trim(),
      currency: form.currency.trim().toUpperCase(),
      is_primary: form.is_primary,
    };
    if (isBank) {
      payload.bank = registryBankId ?? null;
      payload.branch = registryBankId && form.branch ? Number(form.branch) : null;
      payload.bank_name = isOtherBank ? form.bank_name.trim() : '';
      payload.swift_code = normalizeSwift(form.swift_code);
      payload.iban = normalizeIban(form.iban);
      payload.country = form.country;
      payload.account_number = form.account_number.trim();
      payload.mobile_provider = '';
      payload.mobile_number = '';
    } else {
      payload.bank = null;
      payload.branch = null;
      payload.bank_name = '';
      payload.swift_code = '';
      payload.iban = '';
      payload.account_number = '';
      payload.mobile_provider = form.mobile_provider;
      payload.mobile_number = form.mobile_number.trim();
    }
    const opts = {
      onSuccess: () => {
        toast.success(editingId ? 'Account updated' : 'Account added');
        close();
      },
      onError: (e: Error) => toast.error(e?.message || 'Could not save account'),
    };
    if (editingId) update.mutate({ id: editingId, data: payload }, opts);
    else create.mutate(payload, opts);
  };

  const del = (a: ContactBankAccount) => {
    if (!confirm(`Delete ${a.account_type === 'mobile_money' ? 'mobile money account' : 'bank account'} ${a.account_number}?`)) return;
    remove.mutate(a.id, {
      onSuccess: () => toast.success('Account removed'),
      onError: (e: Error) => toast.error(e?.message || 'Could not delete'),
    });
  };

  const setType = (t: BankAccountType) => setForm((f) => ({ ...f, account_type: t }));

  const field = (key: keyof FormState) => (touched && errors[key] ? errors[key] : undefined);

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 py-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="flex items-center justify-center size-7 rounded-lg bg-primary/10 text-primary">
            <CreditCard className="h-4 w-4" />
          </span>
          <h3 className="text-sm font-medium text-foreground">Bank details</h3>
        </div>
        {!showForm && resolvedOwner && (
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={openAdd}>
            <Plus className="h-3.5 w-3.5 mr-1" />
            Add
          </Button>
        )}
      </div>

      <div className="px-6 py-4 space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
          </div>
        ) : accounts.length === 0 && !showForm ? (
          <EmptyState
            icon={Landmark}
            title="No bank details yet"
            description="Add a bank account or mobile money number to pay this supplier."
          />
        ) : accounts.length > 0 ? (
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="table-professional w-full">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Bank / provider</th>
                  <th>SWIFT</th>
                  <th>Status</th>
                  <th className="w-20" />
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id}>
                    <td className="cell-primary">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center size-7 rounded-md bg-muted text-muted-foreground shrink-0">
                          {a.account_type === 'mobile_money' ? (
                            <Smartphone className="h-3.5 w-3.5" />
                          ) : (
                            <Landmark className="h-3.5 w-3.5" />
                          )}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{a.account_name}</span>
                            {a.is_primary && (
                              <span className="status-pill bg-primary/10 text-primary border-primary/20 !min-w-0">
                                <Star className="h-3 w-3" /> Primary
                              </span>
                            )}
                          </div>
                          <span className="cell-sub tabular-nums">
                            {a.account_type === 'mobile_money' ? a.mobile_number : a.account_number || a.iban}
                            {a.account_type === 'bank' && a.account_number && a.iban ? ` · IBAN ${a.iban}` : ''}
                            {a.currency ? ` · ${a.currency}` : ''}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="cell-muted">
                      {a.account_type === 'mobile_money' ? (
                        MOBILE_PROVIDERS.find((p) => p.value === a.mobile_provider)?.label || a.mobile_provider || '—'
                      ) : (
                        <>
                          <div>{a.bank_name || <span className="text-muted-foreground/60">Bank not set</span>}</div>
                          {(a.branch_name || a.branch_code) && (
                            <span className="cell-sub">
                              {a.branch_name}
                              {a.branch_code ? ` (${a.branch_code})` : ''}
                            </span>
                          )}
                        </>
                      )}
                    </td>
                    <td className="cell-muted tabular-nums">
                      {a.account_type === 'bank' ? a.swift_code || '—' : '—'}
                    </td>
                    <td>
                      {a.is_complete ? (
                        <span className="status-pill bg-success-500/10 text-success-700 border-success-500/20">
                          <Check className="h-3 w-3" /> Complete
                        </span>
                      ) : (
                        <span className="status-pill bg-warning-500/10 text-warning-700 border-warning-500/20">
                          <AlertCircle className="h-3 w-3" /> Incomplete
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(a)}
                          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-foreground hover:bg-muted transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => del(a)}
                          disabled={remove.isPending}
                          className="p-1.5 rounded-md text-muted-foreground/60 hover:text-destructive hover:bg-destructive/5 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {showForm && (
          <div className="rounded-xl border border-border p-4 space-y-4 bg-muted/20">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-foreground">
                {editingId ? 'Edit account' : 'New account'}
              </div>
              <div className="inline-flex rounded-lg border border-border bg-card p-0.5" role="tablist">
                {(
                  [
                    { value: 'bank', label: 'Bank transfer', icon: Landmark },
                    { value: 'mobile_money', label: 'Mobile money', icon: Smartphone },
                  ] as { value: BankAccountType; label: string; icon: typeof Landmark }[]
                ).map((t) => {
                  const active = form.account_type === t.value;
                  return (
                    <button
                      key={t.value}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setType(t.value)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${
                        active ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <t.icon className="h-3.5 w-3.5" />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {isBank ? (
              <>
                <SearchableSelect
                  label="Bank country"
                  placeholder="Select country…"
                  value={form.country}
                  displayValue={selectedCountry?.name || ''}
                  onSelect={(code) =>
                    setForm((f) => ({ ...f, country: code, bank: '', branch: '', swift_code: '', bank_name: '' }))
                  }
                  options={countries.map((c) => ({ value: c.code, label: c.name }))}
                  loading={countriesLoading}
                />

                <div>
                  <SearchableSelect
                    label="Bank"
                    placeholder={form.country ? 'Select bank…' : 'Pick a country first'}
                    value={form.bank === OTHER_BANK ? OTHER_BANK : form.bank}
                    displayValue={
                      isOtherBank ? 'Other bank (not listed)' : selectedBank ? selectedBank.short_name || selectedBank.name : ''
                    }
                    onSelect={(id) => {
                      if (id === OTHER_BANK) {
                        setForm((f) => ({ ...f, bank: OTHER_BANK, branch: '', swift_code: '' }));
                        return;
                      }
                      const bank = banks.find((b) => b.id === Number(id));
                      setForm((f) => ({
                        ...f,
                        bank: Number(id),
                        branch: '',
                        bank_name: '',
                        swift_code: normalizeSwift(bank?.swift_code || ''),
                      }));
                    }}
                    options={[
                      ...banks.map((b) => ({
                        value: String(b.id),
                        label: b.short_name || b.name,
                        hint: b.swift_code || undefined,
                      })),
                      { value: OTHER_BANK, label: 'Other bank (not listed)', hint: 'Enter name + SWIFT' },
                    ]}
                    loading={banksLoading}
                    disabled={!form.country}
                  />
                  <FieldError message={field('bank')} />
                </div>

                {isOtherBank && (
                  <Field label="Bank name" error={field('bank_name')}>
                    <Input
                      value={form.bank_name}
                      onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
                      placeholder="Full bank name as it appears on the supplier's invoice"
                      className="h-9 text-sm"
                    />
                  </Field>
                )}

                {!isOtherBank && registryBankId && (
                  <SearchableSelect
                    label="Branch"
                    placeholder="Select branch…"
                    value={form.branch}
                    displayValue={
                      selectedBranch
                        ? `${selectedBranch.branch_name || selectedBranch.branch_code} (${selectedBranch.branch_code})`
                        : ''
                    }
                    onSelect={(id) => setForm((f) => ({ ...f, branch: Number(id) }))}
                    options={branches.map((b) => ({
                      value: String(b.id),
                      label: `${b.branch_name || b.branch_code} (${b.branch_code})`,
                    }))}
                    loading={branchesLoading}
                    optional
                  />
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="SWIFT / BIC"
                    error={field('swift_code')}
                    hint={
                      !isOtherBank && selectedBank?.swift_code && normalizeSwift(form.swift_code) !== normalizeSwift(selectedBank.swift_code)
                        ? `Registry value: ${selectedBank.swift_code}`
                        : undefined
                    }
                  >
                    <Input
                      value={form.swift_code}
                      onChange={(e) => setForm((f) => ({ ...f, swift_code: normalizeSwift(e.target.value).slice(0, 11) }))}
                      placeholder="e.g. SBICUGKX"
                      maxLength={11}
                      className="h-9 text-sm font-mono uppercase"
                      autoCapitalize="characters"
                    />
                  </Field>
                  <Field label="Account name" error={field('account_name')}>
                    <Input
                      value={form.account_name}
                      onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                      placeholder="Account holder name"
                      className="h-9 text-sm"
                    />
                  </Field>
                  <Field label="Account number" error={field('account_number')}>
                    <Input
                      value={form.account_number}
                      onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
                      placeholder="Account number"
                      className="h-9 text-sm tabular-nums"
                    />
                  </Field>
                  <Field label="IBAN (international)" error={field('iban')} optional>
                    <Input
                      value={form.iban}
                      onChange={(e) => setForm((f) => ({ ...f, iban: normalizeIban(e.target.value).slice(0, 34) }))}
                      placeholder="e.g. DE89370400440532013000"
                      maxLength={34}
                      className="h-9 text-sm font-mono uppercase"
                    />
                  </Field>
                </div>
              </>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Provider" error={field('mobile_provider')}>
                  <div className="relative">
                    <select
                      value={form.mobile_provider}
                      onChange={(e) => setForm((f) => ({ ...f, mobile_provider: e.target.value as MobileProvider | '' }))}
                      className="w-full h-9 px-3 pr-8 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none"
                    >
                      <option value="">Select provider…</option>
                      {MOBILE_PROVIDERS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
                <Field label="Mobile number" error={field('mobile_number')}>
                  <Input
                    value={form.mobile_number}
                    onChange={(e) => setForm((f) => ({ ...f, mobile_number: e.target.value }))}
                    placeholder="e.g. +256770000000"
                    className="h-9 text-sm tabular-nums"
                    inputMode="tel"
                  />
                </Field>
                <Field label="Account name" error={field('account_name')}>
                  <Input
                    value={form.account_name}
                    onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
                    placeholder="Registered wallet name"
                    className="h-9 text-sm"
                  />
                </Field>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Currency" optional>
                <Input
                  value={form.currency}
                  onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase().slice(0, 8) }))}
                  placeholder="e.g. UGX"
                  className="h-9 text-sm uppercase"
                />
              </Field>
              <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer sm:mt-6">
                <input
                  type="checkbox"
                  checked={form.is_primary}
                  onChange={(e) => setForm((f) => ({ ...f, is_primary: e.target.checked }))}
                  className="accent-foreground"
                />
                Primary account (used when paying this supplier)
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={close} disabled={saving}>
                <X className="h-3.5 w-3.5 mr-1" />
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs" onClick={save} disabled={saving || (touched && hasErrors)}>
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Check className="h-3.5 w-3.5 mr-1" />}
                {editingId ? 'Save' : 'Add account'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  optional,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] text-muted-foreground mb-1">
        {label}
        {optional && <span className="text-muted-foreground/40 ml-1">(optional)</span>}
      </label>
      {children}
      <FieldError message={error} />
      {!error && hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-[10px] text-destructive mt-1 flex items-center gap-1">
      <AlertCircle className="h-3 w-3" />
      {message}
    </p>
  );
}
