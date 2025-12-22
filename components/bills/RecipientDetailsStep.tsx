'use client';

import React, { useState } from 'react';
import { User, Building2, Smartphone, Search, ChevronDown } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { paymentSourcesApi } from '@/lib/payment-sources-api';
import { contactsApi } from '@/lib/contacts-api';
import type { Bill } from '@/types/bill';

interface RecipientDetails {
  bill_id: number;
  recipient_type: 'mobile' | 'bank';
  // For mobile money
  phone_number?: string;
  contact_id?: number;
  contact_name?: string;
  // For bank account
  recipient_bank_id?: number;
  bank_name?: string;
  swift_code?: string;
  account_number?: string;
  account_name?: string;
}

interface RecipientDetailsStepProps {
  bills: Bill[];
  recipients: Map<number, RecipientDetails>;
  onRecipientsChange: (recipients: Map<number, RecipientDetails>) => void;
  paymentMethod: 'mobile_money' | 'bank_account';
}

export default function RecipientDetailsStep({
  bills,
  recipients,
  onRecipientsChange,
  paymentMethod
}: RecipientDetailsStepProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);
  const [recipientType, setRecipientType] = useState<'mobile' | 'bank'>(
    paymentMethod === 'mobile_money' ? 'mobile' : 'bank'
  );
  const [bankSearchQuery, setBankSearchQuery] = useState('');

  // Handle recipient type change - clear incompatible fields
  const handleRecipientTypeChange = (newType: 'mobile' | 'bank') => {
    setRecipientType(newType);
    
    // Update all existing recipients to the new type and clear incompatible fields
    const newRecipients = new Map(recipients);
    newRecipients.forEach((recipient, billId) => {
      if (newType === 'mobile') {
        // Switching to mobile - clear bank fields
        newRecipients.set(billId, {
          bill_id: billId,
          recipient_type: 'mobile',
          phone_number: recipient.phone_number,
          contact_name: recipient.contact_name,
          contact_id: recipient.contact_id
        });
      } else {
        // Switching to bank - clear mobile fields
        newRecipients.set(billId, {
          bill_id: billId,
          recipient_type: 'bank',
          recipient_bank_id: recipient.recipient_bank_id,
          bank_name: recipient.bank_name,
          swift_code: recipient.swift_code,
          account_number: recipient.account_number,
          account_name: recipient.account_name
        });
      }
    });
    onRecipientsChange(newRecipients);
  };

  // Fetch banks for dropdown
  const { data: banksData, isLoading: banksLoading } = useQuery({
    queryKey: ['banks', 'UG', bankSearchQuery],
    queryFn: () => paymentSourcesApi.getBanks('UG', bankSearchQuery),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch vendor payment details when switching to bank payment
  const fetchVendorPaymentDetails = async (bill: Bill) => {
    if (!bill.contact_id) {
      console.log('No contact_id on bill:', bill);
      return;
    }
    
    try {
      console.log('Fetching payment details for contact:', bill.contact_id);
      const paymentDetails = await contactsApi.getContactPaymentDetails(bill.contact_id.toString());
      console.log('Payment details received:', paymentDetails);
      
      // Auto-populate bank details if available
      if (paymentDetails.bank_account_details || paymentDetails.bank_account_number) {
        // Match bank_account_name to a bank in the system
        let matchedBankId: number | undefined;
        let matchedBankName: string | undefined;
        
        if (paymentDetails.bank_account_name && banksData?.banks) {
          const matchedBank = banksData.banks.find(bank => 
            bank.name.toLowerCase().includes(paymentDetails.bank_account_name.toLowerCase()) ||
            paymentDetails.bank_account_name.toLowerCase().includes(bank.name.toLowerCase()) ||
            (bank.short_name && (
              bank.short_name.toLowerCase().includes(paymentDetails.bank_account_name.toLowerCase()) ||
              paymentDetails.bank_account_name.toLowerCase().includes(bank.short_name.toLowerCase())
            ))
          );
          
          if (matchedBank) {
            matchedBankId = matchedBank.id;
            matchedBankName = matchedBank.short_name || matchedBank.name;
            console.log('Matched bank:', matchedBank);
          } else {
            console.log('No matching bank found for:', paymentDetails.bank_account_name);
          }
        }
        
        const updateData = {
          recipient_type: 'bank' as const,
          account_number: paymentDetails.bank_account_number || '',
          account_name: paymentDetails.bank_account_name || bill.vendor_name,
          bank_name: matchedBankName || paymentDetails.bank_account_name || '',
          recipient_bank_id: matchedBankId
        };
        console.log('Updating recipient with:', updateData);
        handleRecipientUpdate(bill.id, updateData);
      } else {
        console.log('No bank details found in payment details');
        alert('No bank account details found for this vendor in ERP');
      }
    } catch (error) {
      console.error('Error fetching vendor payment details:', error);
      alert('Failed to load bank details from ERP. Please enter manually.');
    }
  };

  // Fetch vendor mobile money details from ERP
  const fetchVendorMobileMoneyDetails = async (bill: Bill) => {
    if (!bill.contact_id) {
      console.log('No contact_id on bill:', bill);
      return;
    }
    
    try {
      console.log('Fetching payment details for contact:', bill.contact_id);
      const paymentDetails = await contactsApi.getContactPaymentDetails(bill.contact_id.toString());
      console.log('Payment details received:', paymentDetails);
      
      // Auto-populate mobile money details if available
      if (paymentDetails.phone_numbers && paymentDetails.phone_numbers.length > 0) {
        // Priority: MOBILE type first, then DEFAULT, then any
        const mobilePhone = paymentDetails.phone_numbers.find((p: any) => p.type === 'MOBILE');
        const defaultPhone = paymentDetails.phone_numbers.find((p: any) => p.type === 'DEFAULT');
        const anyPhone = paymentDetails.phone_numbers[0];
        
        const selectedPhone = mobilePhone || defaultPhone || anyPhone;
        
        if (selectedPhone && selectedPhone.number) {
          const updateData = {
            recipient_type: 'mobile' as const,
            phone_number: selectedPhone.number,
            contact_name: paymentDetails.name
          };
          console.log('Updating recipient with mobile money details:', updateData);
          handleRecipientUpdate(bill.id, updateData);
        } else {
          console.log('No valid phone number found in payment details');
          alert('No phone number found for this vendor in ERP');
        }
      } else {
        console.log('No phone numbers found in payment details');
        alert('No phone number found for this vendor in ERP');
      }
    } catch (error) {
      console.error('Error fetching vendor mobile money details:', error);
      alert('Failed to load phone number from ERP. Please enter manually.');
    }
  };

  const handleRecipientUpdate = (billId: number, details: Partial<RecipientDetails>) => {
    const newRecipients = new Map(recipients);
    const existing = newRecipients.get(billId) || { bill_id: billId, recipient_type: recipientType };
    newRecipients.set(billId, { ...existing, ...details });
    onRecipientsChange(newRecipients);
  };

  const handleMobileNumberChange = (billId: number, phoneNumber: string) => {
    handleRecipientUpdate(billId, {
      recipient_type: 'mobile',
      phone_number: phoneNumber,
      contact_id: undefined,
      contact_name: undefined
    });
  };

  const handleBankDetailsChange = (billId: number, field: string, value: string | number | undefined) => {
    handleRecipientUpdate(billId, {
      recipient_type: 'bank',
      [field]: value
    });
  };

  const handleSelectContact = (billId: number, contact: { id: number; name: string; phone: string }) => {
    handleRecipientUpdate(billId, {
      recipient_type: 'mobile',
      phone_number: contact.phone,
      contact_id: contact.id,
      contact_name: contact.name
    });
  };

  // Auto-fill from bill vendor_phone if available
  const autoFillFromBill = (bill: Bill) => {
    if (bill.vendor_phone) {
      handleMobileNumberChange(bill.id, bill.vendor_phone);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Recipient Details
        </h3>
        <p className="text-sm text-gray-600">
          {paymentMethod === 'mobile_money' 
            ? 'Enter mobile money details for each bill recipient'
            : 'Choose how to send payments: Bank Account or Mobile Money'
          }
        </p>
      </div>

      {/* Payment Method Toggle for Bank Accounts */}
      {paymentMethod === 'bank_account' && (
        <div className="bg-gray-50 rounded-xl p-4">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Send payments via
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleRecipientTypeChange('bank')}
              className={`p-4 rounded-lg border-2 transition-all ${
                recipientType === 'bank'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Building2 className={`w-6 h-6 mx-auto mb-2 ${recipientType === 'bank' ? 'text-blue-600' : 'text-gray-400'}`} />
              <div className="font-semibold text-sm">Bank Account</div>
              <div className="text-xs text-gray-500 mt-1">Direct bank transfer</div>
            </button>
            <button
              onClick={() => handleRecipientTypeChange('mobile')}
              className={`p-4 rounded-lg border-2 transition-all ${
                recipientType === 'mobile'
                  ? 'border-[#638C80] bg-[#638C80]/5'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <Smartphone className={`w-6 h-6 mx-auto mb-2 ${recipientType === 'mobile' ? 'text-[#638C80]' : 'text-gray-400'}`} />
              <div className="font-semibold text-sm">Mobile Money</div>
              <div className="text-xs text-gray-500 mt-1">Send to phone</div>
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
            <div key={bill.id} className="border-2 border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{bill.vendor_name}</div>
                  <div className="text-sm text-gray-500">
                    Invoice: {bill.invoice_number || 'N/A'} • {String(bill.currency_code).split('.').pop()} {parseFloat(bill.amount_due).toLocaleString()}
                  </div>
                </div>
                {bill.vendor_phone && !recipient?.phone_number && (
                  <button
                    onClick={() => autoFillFromBill(bill)}
                    className="text-xs text-[#638C80] hover:text-[#4f7068] font-medium"
                  >
                    Use saved
                  </button>
                )}
              </div>

              {/* Mobile Money Recipient */}
              {currentRecipientType === 'mobile' && (
                <div className="space-y-3">
                  {/* Auto-load from ERP button - show when no phone number */}
                  {!recipient?.phone_number && (
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                      <button
                        onClick={() => fetchVendorMobileMoneyDetails(bill)}
                        disabled={!bill.contact_id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Smartphone className="w-4 h-4" />
                        {bill.contact_id ? 'Load phone number from ERP' : 'No ERP contact linked'}
                      </button>
                      {bill.contact_id && (
                        <p className="text-xs text-green-700 mt-2 text-center">
                          Click to auto-fill from Xero contact
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Mobile Money Number
                    </label>
                    <div className="relative">
                      <Smartphone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="tel"
                        value={recipient?.phone_number || ''}
                        onChange={(e) => handleMobileNumberChange(bill.id, e.target.value)}
                        placeholder="e.g., 0700123456"
                        className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                      />
                    </div>
                    {recipient?.contact_name && (
                      <div className="mt-1 text-xs text-gray-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        Contact: {recipient.contact_name}
                      </div>
                    )}
                  </div>

                  {/* Quick Contact Selection (placeholder for now) */}
                  <button
                    onClick={() => setSelectedBillId(bill.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm text-gray-600 hover:border-[#638C80] hover:text-[#638C80] transition-colors"
                  >
                    <Search className="w-4 h-4" />
                    Select from contacts
                  </button>
                </div>
              )}

              {/* Bank Account Recipient */}
              {currentRecipientType === 'bank' && (
                <div className="space-y-3">
                  {/* Auto-load from ERP button - always visible for bank payments */}
                  {!recipient?.account_number && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <button
                        onClick={() => fetchVendorPaymentDetails(bill)}
                        disabled={!bill.contact_id}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
                      >
                        <Building2 className="w-4 h-4" />
                        {bill.contact_id ? 'Load bank details from ERP' : 'No ERP contact linked'}
                      </button>
                      {bill.contact_id && (
                        <p className="text-xs text-blue-700 mt-2 text-center">
                          Click to auto-fill from Xero contact
                        </p>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Bank Name
                    </label>
                    <div className="relative">
                      <select
                        value={recipient?.recipient_bank_id || ''}
                        onChange={(e) => {
                          const bankId = e.target.value ? parseInt(e.target.value) : undefined;
                          const selectedBank = banksData?.banks.find(b => b.id === bankId);
                          
                          // Update all bank fields at once to avoid race conditions
                          handleRecipientUpdate(bill.id, {
                            recipient_type: 'bank',
                            recipient_bank_id: bankId,
                            bank_name: selectedBank ? (selectedBank.short_name || selectedBank.name) : undefined,
                            swift_code: selectedBank?.swift_code || ''
                          });
                        }}
                        className="w-full px-4 py-2.5 pr-10 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white"
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
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                    {recipient?.swift_code && (
                      <div className="mt-1 text-xs text-gray-500">
                        SWIFT: {recipient.swift_code}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Account Number
                      {recipient?.account_number && bill.contact_id && (
                        <span className="ml-2 text-green-600 text-xs">✓ From ERP</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={recipient?.account_number || ''}
                      onChange={(e) => handleBankDetailsChange(bill.id, 'account_number', e.target.value)}
                      placeholder="e.g., 1234567890"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-2">
                      Account Name
                    </label>
                    <input
                      type="text"
                      value={recipient?.account_name || ''}
                      onChange={(e) => handleBankDetailsChange(bill.id, 'account_name', e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full px-4 py-2.5 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Select Contact</h3>
            <div className="mb-4">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search contacts..."
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
              />
            </div>
            <div className="text-center py-8 text-gray-500">
              <User className="w-12 h-12 mx-auto mb-2 text-gray-300" />
              <p>Contact integration coming soon</p>
            </div>
            <button
              onClick={() => setSelectedBillId(null)}
              className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
