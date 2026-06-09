'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Building2, Globe, ChevronDown, Download, Check } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentSourcesApi, type BankBranch } from '@/lib/payment-sources-api';
import { contactsApi } from '@/lib/contacts-api';
import { useOzowBanks } from '@/hooks/use-ozow';
import { useOneGatePayoutMethods } from '@/hooks/use-onegate';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import type { Bill } from '@/types/bill';
import type { PaymentSourceType } from '@/types/payment-sources';

interface RecipientDetails {
  bill_id: number;
  recipient_type: 'bank' | 'international';
  recipient_bank_id?: number;
  recipient_bank_branch_id?: number;
  recipient_bank_branch_name?: string;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
  iban?: string;
  intermediary_bank_id?: number;
  beneficiary_street?: string;
  beneficiary_city?: string;
  beneficiary_country?: string;
  purpose_code?: string;
  charges_bearer?: string;
  regulatory_code?: string;
  regulatory_info?: string;
  transfer_currency?: string;
  // Ozow-specific: when source is an Ozow ProviderAccount, the bank picker
  // is populated from /api/ozow/banks/ rather than Centry's internal bank
  // registry. The selected bank gives us the bankGroupId (Ozow's UUID for
  // the destination bank) and the universalBranchCode (auto-fills branch_code).
  bank_group_id?: string;
  branch_code?: string;
  customer_bank_reference?: string;
  // OneGate OTT-Payouts: when source is a OneGate ProviderAccount, bills pay
  // the supplier OUT via a payout rail (eWallet / voucher / bank). The method
  // is picked from the account's live methods; `requires_id` mirrors the
  // chosen method's `rsa_id_required` so the modal can gate on id_number.
  payout_method_slug?: string;
  mobile?: string;
  id_number?: string;
  requires_id?: boolean;
}

interface RecipientDetailsStepProps {
  bills: Bill[];
  recipients: Map<number, RecipientDetails>;
  onRecipientsChange: (recipients: Map<number, RecipientDetails>) => void;
  // Accepts the full PaymentSourceType because bank-rail providers
  // (ozow/onegate/paystack/netcash) flow through here too — they're branched
  // on via `sourceProvider` (e.g. the `isOzow` carve-out below), not by
  // collapsing them down to 'bank_account'.
  paymentMethod: PaymentSourceType;
  /** ISO country codes the selected provider supports, e.g. ['ZA'] for Ozow. */
  sourceCountryCodes?: string[];
  /** Provider code on the selected source (e.g. 'ozow') — drives Ozow rail UI. */
  sourceProvider?: string;
  /** ProviderAccount UUID for the selected Ozow source — needed to scope the bank list. */
  sourceProviderAccountId?: string;
}

const PURPOSE_CODES = [
  { value: 'SUPP', label: 'Supplier Payment' },
  { value: 'SALA', label: 'Salary Payment' },
  { value: 'COMM', label: 'Commission' },
  { value: 'INTC', label: 'Intra-Company Payment' },
  { value: 'TRAD', label: 'Trade Services' },
  { value: 'INVS', label: 'Investment' },
  { value: 'LOAN', label: 'Loan' },
  { value: 'RENT', label: 'Rent' },
  { value: 'DIVI', label: 'Dividend' },
  { value: 'OTHR', label: 'Other' },
];

const CHARGES_BEARER_OPTIONS = [
  { value: 'SHAR', label: 'Shared (SHAR)' },
  { value: 'DEBT', label: 'Ours / Debtor (DEBT)' },
  { value: 'CRED', label: 'Beneficiary (CRED)' },
];

/* ------------------------------------------------------------------ */
/*  Searchable Combobox                                                */
/* ------------------------------------------------------------------ */
function SearchableSelect({
  label,
  placeholder,
  value,
  displayValue,
  onSelect,
  options,
  loading,
  optional,
}: {
  label: string;
  placeholder: string;
  value: string | number;
  displayValue: string;
  onSelect: (value: string) => void;
  options: { value: string; label: string; hint?: string }[];
  loading?: boolean;
  optional?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}{optional && <span className="text-muted-foreground/40 ml-1">(optional)</span>}
      </label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full h-10 px-3 pr-9 border border-border rounded-lg text-sm bg-card text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors relative"
          >
            <span className={displayValue ? 'text-foreground truncate' : 'text-muted-foreground'}>
              {displayValue || placeholder}
            </span>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder={`Search ${label.toLowerCase()}...`} className="h-9" />
            <CommandList className="max-h-52">
              <CommandEmpty>
                {loading ? 'Loading...' : 'No results found.'}
              </CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate">{opt.label}</span>
                      {opt.hint && (
                        <span className="ml-2 text-xs text-muted-foreground">{opt.hint}</span>
                      )}
                    </div>
                    {String(value) === opt.value && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Branch selector — fetches per-bank, auto-picks head-office          */
/* ------------------------------------------------------------------ */
function formatBranchLabel(b: BankBranch): string {
  const name = b.branch_name?.trim() || 'Branch';
  return `${name} — ${b.branch_code}`;
}

function BranchSelector({
  bankId,
  value,
  onSelect,
  optional,
}: {
  bankId: number;
  value?: number;
  onSelect: (branchId: number, branchName: string) => void;
  /**
   * When true (international flow), treat an empty branch list as "no
   * branches on file for this foreign bank" and render nothing instead of
   * a hard error. Local pain.001 still treats it as a blocking warning
   * since ClrSysMmbId is mandatory for domestic routing.
   */
  optional?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ['bank-branches', bankId],
    queryFn: () => paymentSourcesApi.getBankBranches(bankId),
    enabled: !!bankId,
    staleTime: 10 * 60 * 1000,
  });

  const branches = data?.branches || [];

  // Auto-pick head-office for the selected bank when nothing is chosen yet.
  // Skipped for the optional/international flow — picking a UG head-office
  // for a foreign bank would be wrong.
  useEffect(() => {
    if (optional || value || !branches.length) return;
    const headOffice = branches.find((b) => b.is_head_office) || branches[0];
    if (headOffice) onSelect(headOffice.id, formatBranchLabel(headOffice));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankId, branches.length]);

  const options = branches.map((b) => ({
    value: String(b.id),
    label: formatBranchLabel(b),
    hint: b.is_head_office ? 'Head office' : undefined,
  }));

  const selected = branches.find((b) => b.id === value);
  const displayValue = selected ? formatBranchLabel(selected) : '';

  if (!isLoading && branches.length === 0) {
    // International beneficiary banks rarely have branches seeded in our
    // BankBranch table — hide the picker silently rather than showing a
    // destructive "contact support" message for a non-blocking situation.
    if (optional) return null;
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Branch</label>
        <div className="h-10 px-3 flex items-center text-xs text-destructive border border-destructive/30 rounded-lg bg-destructive/5">
          No branches with sort codes on file for this bank — contact support.
        </div>
      </div>
    );
  }

  return (
    <SearchableSelect
      label="Branch"
      placeholder={isLoading ? 'Loading branches...' : 'Select branch...'}
      value={value ? String(value) : ''}
      displayValue={displayValue}
      options={options}
      loading={isLoading}
      optional={optional}
      onSelect={(val) => {
        const branch = branches.find((b) => String(b.id) === val);
        if (branch) onSelect(branch.id, formatBranchLabel(branch));
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Simple Select (for small lists like Purpose, Charges)              */
/* ------------------------------------------------------------------ */
function SelectField({
  label,
  value,
  onChange,
  children,
  optional,
}: {
  label: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  children: React.ReactNode;
  optional?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}{optional && <span className="text-muted-foreground/40 ml-1">(optional)</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={onChange}
          className="w-full h-10 px-3 pr-9 border border-border rounded-lg text-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary appearance-none transition-colors"
        >
          {children}
        </select>
        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 pointer-events-none" />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Text Field                                                         */
/* ------------------------------------------------------------------ */
function TextField({
  label,
  value,
  onChange,
  placeholder,
  optional,
  hint,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  optional?: boolean;
  hint?: string;
  maxLength?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5">
        {label}{optional && <span className="text-muted-foreground/40 ml-1">(optional)</span>}
      </label>
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        className="h-10"
      />
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Ozow Bank Picker — uses Ozow's /getavailablebanks list             */
/* ------------------------------------------------------------------ */
function OzowBankPicker({
  ozowAccountId,
  bankGroupId,
  onSelect,
}: {
  ozowAccountId: string;
  bankGroupId?: string;
  onSelect: (bank: { bankGroupId: string; bankGroupName: string; universalBranchCode: string }) => void;
}) {
  const { data: banks = [], isLoading, error } = useOzowBanks(ozowAccountId);

  const options = banks.map((b) => ({
    value: b.bankGroupId,
    label: b.bankGroupName,
    hint: b.universalBranchCode,
  }));

  const selected = banks.find((b) => b.bankGroupId === bankGroupId);
  const displayValue = selected ? selected.bankGroupName : '';

  if (error) {
    return (
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Bank</label>
        <div className="h-10 px-3 flex items-center text-xs text-destructive border border-destructive/30 rounded-lg bg-destructive/5">
          Couldn't load Ozow bank list — {error.message}
        </div>
      </div>
    );
  }

  return (
    <SearchableSelect
      label="Bank"
      placeholder={isLoading ? 'Loading banks...' : 'Select bank...'}
      value={bankGroupId || ''}
      displayValue={displayValue}
      options={options}
      loading={isLoading}
      onSelect={(val) => {
        const bank = banks.find((b) => b.bankGroupId === val);
        if (bank) onSelect(bank);
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */
export default function RecipientDetailsStep({
  bills,
  recipients,
  onRecipientsChange,
  paymentMethod,
  sourceCountryCodes,
  sourceProvider,
  sourceProviderAccountId,
}: RecipientDetailsStepProps) {
  const [recipientType, setRecipientType] = useState<'bank' | 'international'>('bank');
  const [selectedCountry, setSelectedCountry] = useState('');
  const [loadingErp, setLoadingErp] = useState<number | null>(null);

  // Ozow rail: skip Centry's internal bank/branch lookups and use Ozow's
  // /getavailablebanks list directly. The selected bank carries both the
  // bankGroupId (UUID for the Ozow API) and the universalBranchCode.
  const isOzow = sourceProvider === 'ozow' && Boolean(sourceProviderAccountId);
  // OneGate OTT-Payouts rail — pays suppliers OUT via eWallet / voucher / bank.
  // Methods are fetched live (per account) so the picker reflects exactly what
  // this merchant is enabled for; each carries rsa_id_required.
  const isOnegate = sourceProvider === 'onegate' && Boolean(sourceProviderAccountId);
  // Custom rails replace Centry's internal bank registry UI with the provider's
  // own picker. Both Ozow and OneGate are custom rails.
  const isCustomRail = isOzow || isOnegate;

  const { data: onegateMethods = [], isLoading: onegateMethodsLoading } = useOneGatePayoutMethods(
    sourceProviderAccountId,
    { enabled: isOnegate },
  );

  const defaultLocalCountry = sourceCountryCodes?.[0] || 'UG';

  const handleRecipientTypeChange = (newType: 'bank' | 'international') => {
    setRecipientType(newType);
    const updated = new Map(recipients);
    updated.forEach((r, billId) => {
      updated.set(billId, { ...r, recipient_type: newType });
    });
    onRecipientsChange(updated);
  };

  const bankCountry = recipientType === 'international' ? selectedCountry : defaultLocalCountry;
  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['banks', bankCountry],
    queryFn: () => paymentSourcesApi.getBanks(bankCountry, ''),
    enabled: !!bankCountry,
    staleTime: 5 * 60 * 1000,
  });

  const { data: countriesData } = useQuery({
    queryKey: ['bank-countries'],
    queryFn: () => paymentSourcesApi.getBankCountries(),
    staleTime: 30 * 60 * 1000,
  });

  // Build searchable option lists
  const bankOptions = useMemo(() => {
    if (!banksData?.banks) return [];
    return banksData.banks.map((bank: any) => ({
      value: String(bank.id),
      label: bank.short_name || bank.name,
      hint: bank.swift_code || undefined,
    }));
  }, [banksData]);

  const countryOptions = useMemo(() => {
    if (!countriesData?.countries) return [];
    return countriesData.countries.map((c: any) => ({
      value: c.code,
      label: c.name,
    }));
  }, [countriesData]);

  const update = (billId: number, fields: Partial<RecipientDetails>) => {
    const updated = new Map(recipients);
    const existing = updated.get(billId) || { bill_id: billId, recipient_type: recipientType };
    updated.set(billId, { ...existing, ...fields });
    onRecipientsChange(updated);
  };

  const loadFromErp = async (bill: Bill) => {
    if (!bill.contact_id) return;
    setLoadingErp(bill.id);
    try {
      const details = await contactsApi.getContactPaymentDetails(bill.contact_id.toString());
      if (details.linked_bank_id || details.bank_account_number || details.bank_account_details) {
        const fields: Partial<RecipientDetails> = {
          recipient_type: recipientType,
          account_number: details.bank_account_number || '',
          account_name: details.bank_account_name || bill.vendor_name,
        };
        if (details.linked_bank_id) {
          fields.recipient_bank_id = details.linked_bank_id;
          fields.bank_name = details.linked_bank_name || '';
          const bank = banksData?.banks.find((b: any) => b.id === details.linked_bank_id);
          if (bank) fields.swift_code = bank.swift_code || '';
        }
        update(bill.id, fields);
      }
    } catch { /* silently fail */ }
    setLoadingErp(null);
  };

  const isComplete = (billId: number) => {
    const r = recipients.get(billId);
    if (!r) return false;
    if (isOzow) {
      // Ozow payouts: bankGroupId + universalBranchCode + account# + name +
      // a customer bank reference (≤20 chars, alphanumeric/space/dash).
      return !!(
        r.bank_group_id &&
        r.branch_code &&
        r.account_number &&
        r.account_name &&
        r.customer_bank_reference?.trim()
      );
    }
    if (isOnegate) {
      // OTT-Payouts: a chosen method + recipient name + mobile. ID number is
      // required only when the method needs it (rsa_id_required → requires_id).
      if (!r.payout_method_slug || !r.account_name?.trim() || !r.mobile?.trim()) return false;
      if (r.requires_id && !r.id_number?.trim()) return false;
      return true;
    }
    const baseOk = !!(r.recipient_bank_id && (r.account_number || r.iban) && r.account_name);
    if (!baseOk) return false;
    if (r.recipient_type === 'international') {
      // ISO 20022 SWIFT transfers require beneficiary address + purpose code.
      return !!(
        r.beneficiary_street?.trim() &&
        r.beneficiary_city?.trim() &&
        r.beneficiary_country?.trim() &&
        r.purpose_code?.trim()
      );
    }
    // Local pain.001 transfers require a branch sort code (ClrSysMmbId).
    return !!r.recipient_bank_branch_id;
  };

  const getBankDisplay = (r?: RecipientDetails) => {
    if (!r?.recipient_bank_id) return '';
    const bank = banksData?.banks.find((b: any) => b.id === r.recipient_bank_id);
    if (!bank) return r.bank_name || '';
    return `${bank.short_name || bank.name}${bank.swift_code ? ` (${bank.swift_code})` : ''}`;
  };

  const getCountryDisplay = (code?: string) => {
    if (!code) return '';
    const c = countriesData?.countries?.find((c: any) => c.code === code);
    return c?.name || code;
  };

  return (
    <div className="space-y-4">
      {/* Transfer type toggle — hide for single-country providers (e.g. Ozow = ZA only) */}
      {!isCustomRail && paymentMethod === 'bank_account' && (!sourceCountryCodes || sourceCountryCodes.length !== 1) && (
        <div className="grid grid-cols-2 gap-2">
          {([
            { key: 'bank' as const, icon: Building2, label: 'Local Transfer' },
            { key: 'international' as const, icon: Globe, label: 'International' },
          ]).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => handleRecipientTypeChange(key)}
              className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all ${
                recipientType === key
                  ? 'border-foreground bg-foreground text-card'
                  : 'border-border hover:border-foreground/20'
              }`}
            >
              <Icon className={`w-4 h-4 ${recipientType === key ? 'text-card' : 'text-muted-foreground'}`} />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Per-bill recipient forms */}
      {bills.map((bill) => {
        const r = recipients.get(bill.id);
        const done = isComplete(bill.id);

        return (
          <div key={bill.id} className="border border-border rounded-lg overflow-hidden">
            {/* Bill header */}
            <div className="flex items-center justify-between px-4 py-3 bg-muted/50 border-b border-border">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{bill.vendor_name}</p>
                <p className="text-xs text-muted-foreground">
                  {bill.invoice_number || 'N/A'} &middot; {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                </p>
              </div>
              {done && (
                <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 ml-2">
                  <Check className="w-3 h-3 text-white" />
                </div>
              )}
            </div>

            <div className="p-4 space-y-3">
              {/* Load from ERP */}
              {!r?.account_number && bill.contact_id && (
                <button
                  onClick={() => loadFromErp(bill)}
                  disabled={loadingErp === bill.id}
                  className="w-full flex items-center justify-center gap-2 h-9 text-xs font-medium text-primary border border-primary/20 rounded-lg hover:bg-primary/5 transition-colors disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5" />
                  {loadingErp === bill.id ? 'Loading...' : 'Load from ERP'}
                </button>
              )}

              {/* Ozow rail: replaces bank+branch combo with Ozow's own list */}
              {isOzow ? (
                <>
                  <OzowBankPicker
                    ozowAccountId={sourceProviderAccountId!}
                    bankGroupId={r?.bank_group_id}
                    onSelect={(bank) =>
                      update(bill.id, {
                        recipient_type: 'bank',
                        bank_group_id: bank.bankGroupId,
                        bank_name: bank.bankGroupName,
                        branch_code: bank.universalBranchCode,
                      })
                    }
                  />
                  <TextField
                    label="Account Number"
                    value={r?.account_number || ''}
                    onChange={(v) => update(bill.id, { account_number: v })}
                    placeholder="1234567890"
                    maxLength={20}
                    hint={r?.account_number && bill.contact_id ? 'From ERP' : undefined}
                  />
                  <TextField
                    label="Account Name"
                    value={r?.account_name || ''}
                    onChange={(v) => update(bill.id, { account_name: v })}
                    placeholder="Account holder name"
                  />
                  <TextField
                    label="Customer Bank Reference"
                    value={r?.customer_bank_reference || ''}
                    onChange={(v) =>
                      // Ozow constraint: ≤20 chars, alphanumeric/space/dash only.
                      update(bill.id, {
                        customer_bank_reference: v.replace(/[^A-Za-z0-9 \-]/g, '').slice(0, 20),
                      })
                    }
                    placeholder={bill.vendor_name?.slice(0, 20) || 'Reference'}
                    maxLength={20}
                    hint="Appears on the recipient's bank statement (≤20 chars, A–Z, 0–9, space, dash)."
                  />
                </>
              ) : null}

              {/* OneGate OTT-Payouts rail: pick the payout method (live, per
                  account) + recipient details. Pays the supplier OUT. */}
              {isOnegate ? (
                <>
                  <SearchableSelect
                    label="Payout method"
                    placeholder={onegateMethodsLoading ? 'Loading methods…' : 'Select payout method'}
                    value={r?.payout_method_slug || ''}
                    displayValue={
                      onegateMethods.find((m) => m.slug === r?.payout_method_slug)?.name || ''
                    }
                    options={onegateMethods.map((m) => ({
                      value: m.slug,
                      label: m.name,
                      hint: m.rsa_id_required ? 'needs ID' : undefined,
                    }))}
                    loading={onegateMethodsLoading}
                    onSelect={(slug) => {
                      const method = onegateMethods.find((m) => m.slug === slug);
                      update(bill.id, {
                        recipient_type: 'bank',
                        payout_method_slug: slug,
                        requires_id: Boolean(method?.rsa_id_required),
                        // Prefill recipient name from the vendor when empty.
                        account_name: r?.account_name || bill.vendor_name || '',
                      });
                    }}
                  />
                  <TextField
                    label="Recipient name"
                    value={r?.account_name || ''}
                    onChange={(v) => update(bill.id, { account_name: v })}
                    placeholder={bill.vendor_name || 'Supplier name'}
                  />
                  <TextField
                    label="Recipient mobile"
                    value={r?.mobile || ''}
                    onChange={(v) => update(bill.id, { mobile: v.replace(/[^0-9+]/g, '') })}
                    placeholder="27821234567"
                    maxLength={15}
                    hint="OneGate sends the voucher PIN / eWallet credit to this number."
                  />
                  {r?.requires_id ? (
                    <TextField
                      label="Recipient ID number"
                      value={r?.id_number || ''}
                      onChange={(v) =>
                        update(bill.id, { id_number: v.replace(/[^0-9]/g, '').slice(0, 13) })
                      }
                      placeholder="13-digit SA ID"
                      maxLength={13}
                      hint="Required by OneGate for this payout method."
                    />
                  ) : null}
                </>
              ) : null}

              {/* International: country selector */}
              {!isCustomRail && recipientType === 'international' && (
                <SearchableSelect
                  label="Country"
                  placeholder="Search country..."
                  value={r?.beneficiary_country || selectedCountry}
                  displayValue={getCountryDisplay(r?.beneficiary_country || selectedCountry)}
                  options={countryOptions}
                  onSelect={(code) => {
                    setSelectedCountry(code);
                    update(bill.id, {
                      recipient_type: 'international',
                      beneficiary_country: code,
                      recipient_bank_id: undefined,
                      bank_name: undefined,
                      swift_code: undefined,
                      recipient_bank_branch_id: undefined,
                      recipient_bank_branch_name: undefined,
                    });
                  }}
                />
              )}

              {/* Bank selector — non-Ozow path uses Centry's internal bank registry */}
              {!isCustomRail && (
                <SearchableSelect
                  label="Bank"
                  placeholder="Search bank..."
                  value={r?.recipient_bank_id ? String(r.recipient_bank_id) : ''}
                  displayValue={getBankDisplay(r)}
                  options={bankOptions}
                  loading={banksLoading}
                  onSelect={(val) => {
                    const bankId = val ? parseInt(val) : undefined;
                    const bank = banksData?.banks.find((b: any) => b.id === bankId);
                    update(bill.id, {
                      recipient_type: recipientType,
                      recipient_bank_id: bankId,
                      bank_name: bank ? (bank.short_name || bank.name) : undefined,
                      swift_code: bank?.swift_code || '',
                      // Reset the branch — BranchSelector will auto-pick head-office for the new bank.
                      recipient_bank_branch_id: undefined,
                      recipient_bank_branch_name: undefined,
                    });
                  }}
                />
              )}
              {!isCustomRail && r?.swift_code && (
                <p className="text-[10px] text-muted-foreground -mt-2">SWIFT: {r.swift_code}</p>
              )}

              {/* Branch selector — local pain.001 routing requires a sort code
                  (ClrSysMmbId); international shows the same picker but treats
                  it as optional since foreign banks typically aren't seeded
                  with branches in our BankBranch table. */}
              {!isCustomRail && r?.recipient_bank_id && (
                <BranchSelector
                  bankId={r.recipient_bank_id}
                  value={r.recipient_bank_branch_id}
                  optional={recipientType === 'international'}
                  onSelect={(branchId, branchName) =>
                    update(bill.id, {
                      recipient_bank_branch_id: branchId,
                      recipient_bank_branch_name: branchName,
                    })
                  }
                />
              )}

              {/* Account fields — Ozow has its own block above */}
              {!isCustomRail && (
                recipientType === 'international' ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="IBAN" value={r?.iban || ''} onChange={(v) => update(bill.id, { iban: v })} placeholder="IBAN" />
                      <TextField label="Account Number" value={r?.account_number || ''} onChange={(v) => update(bill.id, { account_number: v })} placeholder="If no IBAN" />
                    </div>
                    <TextField label="Beneficiary Name" value={r?.account_name || ''} onChange={(v) => update(bill.id, { account_name: v })} placeholder="Full name" />
                    <p className="text-[10px] text-muted-foreground -mt-1">Required by SWIFT: beneficiary address + purpose code.</p>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Street" value={r?.beneficiary_street || ''} onChange={(v) => update(bill.id, { beneficiary_street: v })} placeholder="Street" />
                      <TextField label="City" value={r?.beneficiary_city || ''} onChange={(v) => update(bill.id, { beneficiary_city: v })} placeholder="City" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <SelectField label="Purpose" value={r?.purpose_code || ''} onChange={(e) => update(bill.id, { purpose_code: e.target.value })}>
                        <option value="">Select...</option>
                        {PURPOSE_CODES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                      </SelectField>
                      <SelectField label="Charges" value={r?.charges_bearer || 'SHAR'} onChange={(e) => update(bill.id, { charges_bearer: e.target.value })}>
                        {CHARGES_BEARER_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </SelectField>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <TextField label="Transfer Currency" value={r?.transfer_currency || ''} onChange={(v) => update(bill.id, { transfer_currency: v.toUpperCase() })} placeholder="USD" optional maxLength={3} />
                      <TextField label="Regulatory Info" value={r?.regulatory_info || ''} onChange={(v) => update(bill.id, { regulatory_info: v })} placeholder="Description" optional />
                    </div>
                  </>
                ) : (
                  <>
                    <TextField label="Account Number" value={r?.account_number || ''} onChange={(v) => update(bill.id, { account_number: v })} placeholder="1234567890" hint={r?.account_number && bill.contact_id ? 'From ERP' : undefined} />
                    <TextField label="Account Name" value={r?.account_name || ''} onChange={(v) => update(bill.id, { account_name: v })} placeholder="Account holder name" />
                  </>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
