'use client';

import React, { useState } from 'react';
import { User, Building2, Globe, Search, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentSourcesApi } from '@/lib/payment-sources-api';
import { contactsApi } from '@/lib/contacts-api';
import type { Bill } from '@/types/bill';

interface RecipientDetails {
  bill_id: number;
  recipient_type: 'bank' | 'international';
  // For local bank account
  recipient_bank_id?: number;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
  // For international remittance
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
}

interface RecipientDetailsStepProps {
  bills: Bill[];
  recipients: Map<number, RecipientDetails>;
  onRecipientsChange: (recipients: Map<number, RecipientDetails>) => void;
  paymentMethod: 'mobile_money' | 'bank_account';
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

export default function RecipientDetailsStep({
  bills,
  recipients,
  onRecipientsChange,
  paymentMethod
}: RecipientDetailsStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<'bank' | 'international'>('bank');
  const [bankSearchQuery, setBankSearchQuery] = useState('');
  const [selectedCountry, setSelectedCountry] = useState('');

  // Handle recipient type change - clear incompatible fields
  const handleRecipientTypeChange = (newType: 'bank' | 'international') => {
    setRecipientType(newType);

    const newRecipients = new Map(recipients);
    newRecipients.forEach((recipient, billId) => {
      if (newType === 'bank') {
        newRecipients.set(billId, {
          bill_id: billId,
          recipient_type: 'bank',
          recipient_bank_id: recipient.recipient_bank_id,
          bank_name: recipient.bank_name,
          swift_code: recipient.swift_code,
          account_number: recipient.account_number,
          account_name: recipient.account_name,
        });
      } else {
        newRecipients.set(billId, {
          bill_id: billId,
          recipient_type: 'international',
          recipient_bank_id: recipient.recipient_bank_id,
          bank_name: recipient.bank_name,
          swift_code: recipient.swift_code,
          account_number: recipient.account_number,
          account_name: recipient.account_name,
          iban: recipient.iban,
          beneficiary_street: recipient.beneficiary_street,
          beneficiary_city: recipient.beneficiary_city,
          beneficiary_country: recipient.beneficiary_country,
          purpose_code: recipient.purpose_code,
          charges_bearer: recipient.charges_bearer,
          transfer_currency: recipient.transfer_currency,
        });
      }
    });
    onRecipientsChange(newRecipients);
  };

  // Fetch banks — use selected country for international, UG for local
  const bankCountry = recipientType === 'international' ? selectedCountry : 'UG';
  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['banks', bankCountry, bankSearchQuery],
    queryFn: () => paymentSourcesApi.getBanks(bankCountry, bankSearchQuery),
    enabled: !!bankCountry,
    staleTime: 5 * 60 * 1000,
  });

  // Fetch countries that have banks in the system
  const { data: countriesData } = useQuery({
    queryKey: ['bank-countries'],
    queryFn: () => paymentSourcesApi.getBankCountries(),
    staleTime: 30 * 60 * 1000,
  });

  // Fetch vendor payment details when switching to bank payment
  const fetchVendorPaymentDetails = async (bill: Bill) => {
    if (!bill.contact_id) return;

    try {
      const paymentDetails = await contactsApi.getContactPaymentDetails(bill.contact_id.toString());

      if (paymentDetails.linked_bank_id || paymentDetails.bank_account_number || paymentDetails.bank_account_details) {
        const updateData: Partial<RecipientDetails> = {
          recipient_type: recipientType,
          account_number: paymentDetails.bank_account_number || '',
          account_name: paymentDetails.bank_account_name || bill.vendor_name,
        };

        // Use linked_bank directly from backend (already matched to Bank model)
        if (paymentDetails.linked_bank_id) {
          updateData.recipient_bank_id = paymentDetails.linked_bank_id;
          updateData.bank_name = paymentDetails.linked_bank_name || '';
          // Also set swift_code if we can find the bank in the loaded list
          const linkedBank = banksData?.banks.find(b => b.id === paymentDetails.linked_bank_id);
          if (linkedBank) {
            updateData.swift_code = linkedBank.swift_code || '';
          }
        } else if (paymentDetails.bank_account_name && banksData?.banks) {
          // Fallback: try client-side fuzzy match
          const matchedBank = banksData.banks.find(bank =>
            bank.name.toLowerCase().includes(paymentDetails.bank_account_name!.toLowerCase()) ||
            (bank.short_name && bank.short_name.toLowerCase().includes(paymentDetails.bank_account_name!.toLowerCase()))
          );
          if (matchedBank) {
            updateData.recipient_bank_id = matchedBank.id;
            updateData.bank_name = matchedBank.short_name || matchedBank.name;
          }
        }

        handleRecipientUpdate(bill.id, updateData);
      } else {
        alert('No bank account details found for this vendor in ERP');
      }
    } catch {
      alert('Failed to load bank details from ERP. Please enter manually.');
    }
  };

  const handleRecipientUpdate = (billId: number, details: Partial<RecipientDetails>) => {
    const newRecipients = new Map(recipients);
    const existing = newRecipients.get(billId) || { bill_id: billId, recipient_type: recipientType };
    newRecipients.set(billId, { ...existing, ...details });
    onRecipientsChange(newRecipients);
  };

  const handleBankDetailsChange = (billId: number, field: string, value: string | number | undefined) => {
    handleRecipientUpdate(billId, {
      recipient_type: recipientType,
      [field]: value
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground mb-2">
          Recipient Details
        </h3>
        <p className="text-sm text-muted-foreground">
          {paymentMethod === 'mobile_money'
            ? 'Enter mobile money details for each bill recipient'
            : 'Choose how to send payments: Local Bank Transfer or International Remittance'
          }
        </p>
      </div>

      {/* Payment Method Toggle for Bank Accounts */}
      {paymentMethod === 'bank_account' && (
        <div className="bg-muted rounded-xl p-4">
          <label className="block text-sm font-medium text-foreground mb-3">
            Send payments via
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRecipientTypeChange('bank')}
              className={`p-4 rounded-lg border-2 transition-all ${
                recipientType === 'bank'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-border'
              }`}
            >
              <Building2 className={`w-6 h-6 mx-auto mb-2 ${recipientType === 'bank' ? 'text-primary' : 'text-muted-foreground/60'}`} />
              <div className="font-semibold text-sm">Local Transfer</div>
              <div className="text-xs text-muted-foreground mt-1">Domestic bank transfer</div>
            </button>
            <button
              onClick={() => handleRecipientTypeChange('international')}
              className={`p-4 rounded-lg border-2 transition-all ${
                recipientType === 'international'
                  ? 'border-primary bg-primary/5'
                  : 'border-border bg-card hover:border-border'
              }`}
            >
              <Globe className={`w-6 h-6 mx-auto mb-2 ${recipientType === 'international' ? 'text-primary' : 'text-muted-foreground/60'}`} />
              <div className="font-semibold text-sm">International Remittance</div>
              <div className="text-xs text-muted-foreground mt-1">Cross-border payment</div>
            </button>
          </div>
        </div>
      )}

      {/* Recipients List */}
      <div className="space-y-4">
        {bills.map((bill) => {
          const recipient = recipients.get(bill.id);
          const currentRecipientType = recipient?.recipient_type || recipientType;

          return (
            <div key={bill.id} className="border-2 border-border rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-foreground">{bill.vendor_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Invoice: {bill.invoice_number || 'N/A'} • {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                  </div>
                </div>
              </div>

              {/* International Remittance Recipient */}
              {currentRecipientType === 'international' && (
                <div className="space-y-3">
                  {/* Country */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Beneficiary Country
                    </label>
                    <div className="relative">
                      <select
                        value={recipient?.beneficiary_country || selectedCountry}
                        onChange={(e) => {
                          setSelectedCountry(e.target.value);
                          handleRecipientUpdate(bill.id, {
                            recipient_type: 'international',
                            beneficiary_country: e.target.value,
                            recipient_bank_id: undefined,
                            bank_name: undefined,
                            swift_code: undefined,
                          });
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-card"
                      >
                        <option value="">Select country...</option>
                        {countriesData?.countries?.map((country) => (
                          <option key={country.code} value={country.code}>
                            {country.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                  </div>

                  {/* Bank */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Beneficiary Bank
                    </label>
                    <div className="relative">
                      <select
                        value={recipient?.recipient_bank_id || ''}
                        onChange={(e) => {
                          const bankId = e.target.value ? parseInt(e.target.value) : undefined;
                          const selectedBank = banksData?.banks.find(b => b.id === bankId);
                          handleRecipientUpdate(bill.id, {
                            recipient_type: 'international',
                            recipient_bank_id: bankId,
                            bank_name: selectedBank ? (selectedBank.short_name || selectedBank.name) : undefined,
                            swift_code: selectedBank?.swift_code || '',
                          });
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-card"
                      >
                        <option value="">Select a bank...</option>
                        {banksLoading ? (
                          <option disabled>Loading banks...</option>
                        ) : (
                          banksData?.banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.short_name || bank.name} {bank.swift_code ? `(${bank.swift_code})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                    {recipient?.swift_code && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        SWIFT/BIC: {recipient.swift_code}
                      </div>
                    )}
                  </div>

                  {/* IBAN / Account Number */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        IBAN
                      </label>
                      <input
                        type="text"
                        value={recipient?.iban || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'iban', e.target.value)}
                        placeholder="e.g., AO06004400006729503010102"
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Account Number
                      </label>
                      <input
                        type="text"
                        value={recipient?.account_number || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'account_number', e.target.value)}
                        placeholder="If no IBAN"
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Account Name */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Beneficiary Name
                    </label>
                    <input
                      type="text"
                      value={recipient?.account_name || ''}
                      onChange={(e) => handleBankDetailsChange(bill.id, 'account_name', e.target.value)}
                      placeholder="Full name of account holder"
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>

                  {/* Beneficiary Address */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Street Address
                      </label>
                      <input
                        type="text"
                        value={recipient?.beneficiary_street || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'beneficiary_street', e.target.value)}
                        placeholder="Street address"
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        City
                      </label>
                      <input
                        type="text"
                        value={recipient?.beneficiary_city || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'beneficiary_city', e.target.value)}
                        placeholder="City"
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Purpose Code & Charges Bearer */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Payment Purpose
                      </label>
                      <div className="relative">
                        <select
                          value={recipient?.purpose_code || ''}
                          onChange={(e) => handleBankDetailsChange(bill.id, 'purpose_code', e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-card"
                        >
                          <option value="">Select purpose...</option>
                          {PURPOSE_CODES.map((p) => (
                            <option key={p.value} value={p.value}>{p.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Charges Bearer
                      </label>
                      <div className="relative">
                        <select
                          value={recipient?.charges_bearer || 'SHAR'}
                          onChange={(e) => handleBankDetailsChange(bill.id, 'charges_bearer', e.target.value)}
                          className="w-full px-4 py-2.5 pr-10 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-card"
                        >
                          {CHARGES_BEARER_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                      </div>
                    </div>
                  </div>

                  {/* Transfer Currency & Regulatory Info */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Transfer Currency <span className="text-muted-foreground/50">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={recipient?.transfer_currency || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'transfer_currency', e.target.value.toUpperCase())}
                        placeholder="e.g., USD"
                        maxLength={3}
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-muted-foreground mb-2">
                        Regulatory Info <span className="text-muted-foreground/50">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={recipient?.regulatory_info || ''}
                        onChange={(e) => handleBankDetailsChange(bill.id, 'regulatory_info', e.target.value)}
                        placeholder="Payment description"
                        className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Local Bank Account Recipient */}
              {currentRecipientType === 'bank' && (
                <div className="space-y-3">
                  {/* Auto-load from ERP button */}
                  {!recipient?.account_number && (
                    <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <button
                        onClick={() => fetchVendorPaymentDetails(bill)}
                        disabled={!bill.contact_id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary/80 disabled:bg-muted disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
                        {bill.contact_id ? 'Load bank details from ERP' : 'No ERP contact linked'}
                      </button>
                      {bill.contact_id && (
                        <p className="text-xs text-primary/80 mt-2 text-center">
                          Click to auto-fill from Xero contact
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Bank Name
                    </label>
                    <div className="relative">
                      <select
                        value={recipient?.recipient_bank_id || ''}
                        onChange={(e) => {
                          const bankId = e.target.value ? parseInt(e.target.value) : undefined;
                          const selectedBank = banksData?.banks.find(b => b.id === bankId);

                          handleRecipientUpdate(bill.id, {
                            recipient_type: 'bank',
                            recipient_bank_id: bankId,
                            bank_name: selectedBank ? (selectedBank.short_name || selectedBank.name) : undefined,
                            swift_code: selectedBank?.swift_code || ''
                          });
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent appearance-none bg-card"
                      >
                        <option value="">Select a bank...</option>
                        {banksLoading ? (
                          <option disabled>Loading banks...</option>
                        ) : (
                          banksData?.banks.map((bank) => (
                            <option key={bank.id} value={bank.id}>
                              {bank.short_name || bank.name} {bank.swift_code ? `(${bank.swift_code})` : ''}
                            </option>
                          ))
                        )}
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60 pointer-events-none" />
                    </div>
                    {recipient?.swift_code && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        SWIFT: {recipient.swift_code}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Account Number
                      {recipient?.account_number && bill.contact_id && (
                        <span className="ml-2 text-primary text-xs">From ERP</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={recipient?.account_number || ''}
                      onChange={(e) => handleBankDetailsChange(bill.id, 'account_number', e.target.value)}
                      placeholder="e.g., 1234567890"
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={recipient?.account_name || ''}
                      onChange={(e) => handleBankDetailsChange(bill.id, 'account_name', e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2.5 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact Selection Modal (placeholder) */}
      {selectedBillId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20">
          <div className="bg-card rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Select Contact</h3>
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-4 py-2 border-2 border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <div className="text-center py-8 text-muted-foreground">
              <User className="w-12 h-12 mx-auto mb-2 text-muted-foreground/40" />
              <p>Contact integration coming soon</p>
            </div>
            <button
              onClick={() => setSelectedBillId(null)}
              className="w-full mt-4 px-4 py-2 bg-muted hover:bg-muted rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
