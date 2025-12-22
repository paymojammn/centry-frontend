'use client';

import { useState, useEffect } from 'react';
import { X, Smartphone, Building2, Check } from 'lucide-react';
import { useSavePaymentMethod, useUpdatePaymentMethod } from '@/hooks/use-wallet';
import { usePaymentProviders } from '@/hooks/use-bills';
import type { SavedPaymentMethod } from '@/types/wallet';

interface SavePaymentMethodModalProps {
  isOpen: boolean;
  onClose: () => void;
  editMethod?: SavedPaymentMethod | null;
}

export default function SavePaymentMethodModal({
  isOpen,
  onClose,
  editMethod = null,
}: SavePaymentMethodModalProps) {
  const [methodType, setMethodType] = useState<'mobile_money' | 'bank' | null>(null);
  const [provider, setProvider] = useState('');
  const [nickname, setNickname] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [bankName, setBankName] = useState('');
  const [branchName, setBranchName] = useState('');
  const [isDefault, setIsDefault] = useState(false);
  const [success, setSuccess] = useState(false);

  const saveMethodMutation = useSavePaymentMethod();
  const updateMethodMutation = useUpdatePaymentMethod();
  const { data: providers } = usePaymentProviders('UG');

  // Populate form when editing
  useEffect(() => {
    if (editMethod) {
      setMethodType(editMethod.method_type);
      setProvider(editMethod.provider);
      setNickname(editMethod.nickname);
      setPhoneNumber(editMethod.phone_number || '');
      setAccountNumber(editMethod.account_number || '');
      setAccountName(editMethod.account_name || '');
      setBankName(editMethod.bank_name || '');
      setBranchName(editMethod.branch_name || '');
      setIsDefault(editMethod.is_default);
    }
  }, [editMethod]);

  const handleClose = () => {
    setMethodType(null);
    setProvider('');
    setNickname('');
    setPhoneNumber('');
    setAccountNumber('');
    setAccountName('');
    setBankName('');
    setBranchName('');
    setIsDefault(false);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!methodType || !provider || !nickname) return;

    const payload = {
      method_type: methodType,
      provider,
      nickname,
      phone_number: methodType === 'mobile_money' ? phoneNumber : undefined,
      account_number: methodType === 'bank' ? accountNumber : undefined,
      account_name: methodType === 'bank' ? accountName : undefined,
      bank_name: methodType === 'bank' ? bankName : undefined,
      branch_name: methodType === 'bank' ? branchName : undefined,
      is_default: isDefault,
    };

    try {
      if (editMethod) {
        // Update existing method
        await updateMethodMutation.mutateAsync({
          methodId: editMethod.id,
          data: payload,
        });
      } else {
        // Create new method
        await saveMethodMutation.mutateAsync(payload);
      }

      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to save payment method:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editMethod ? 'Edit Payment Method' : 'Add Payment Method'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {editMethod ? 'Payment Method Updated!' : 'Payment Method Saved!'}
            </h3>
            <p className="text-gray-600">
              {editMethod 
                ? 'Your payment method has been updated successfully.' 
                : 'Your payment method has been added successfully.'
              }
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Step 1: Select Method Type */}
            {!methodType && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Select Payment Method Type</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setMethodType('mobile_money')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                  >
                    <Smartphone className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                    <h4 className="font-medium text-gray-900">Mobile Money</h4>
                    <p className="text-sm text-gray-500 mt-1">MTN, Airtel, etc.</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMethodType('bank')}
                    className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                  >
                    <Building2 className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                    <h4 className="font-medium text-gray-900">Bank Account</h4>
                    <p className="text-sm text-gray-500 mt-1">Stanbic, DFCU, etc.</p>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Select Provider & Enter Details */}
            {methodType && (
              <>
                <div>
                  <label htmlFor="provider-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Provider *
                  </label>
                  <select
                    id="provider-select"
                    value={provider}
                    onChange={(e) => setProvider(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                    required
                  >
                    <option value="">Select provider</option>
                    {methodType === 'mobile_money'
                      ? providers?.mobile_money?.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))
                      : providers?.bank?.map((p) => (
                          <option key={p.code} value={p.code}>
                            {p.name}
                          </option>
                        ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nickname *
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="e.g., My MTN Number, Primary Account"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                    required
                  />
                </div>

                {methodType === 'mobile_money' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="256700000000"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                      required
                    />
                  </div>
                )}

                {methodType === 'bank' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Number *
                      </label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Account Name *
                      </label>
                      <input
                        type="text"
                        value={accountName}
                        onChange={(e) => setAccountName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bank Name *
                      </label>
                      <input
                        type="text"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        placeholder="Stanbic Bank Uganda"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Branch Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={branchName}
                        onChange={(e) => setBranchName(e.target.value)}
                        placeholder="Kampala Branch"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_default"
                    checked={isDefault}
                    onChange={(e) => setIsDefault(e.target.checked)}
                    className="w-4 h-4 text-[#638C80] border-gray-300 rounded focus:ring-[#638C80]"
                  />
                  <label htmlFor="is_default" className="text-sm text-gray-700">
                    Set as default payment method
                  </label>
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setMethodType(null)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={saveMethodMutation.isPending}
                    className="flex-1 px-4 py-2 bg-[#638C80] text-white rounded-lg hover:bg-[#4f7068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saveMethodMutation.isPending ? 'Saving...' : 'Save Payment Method'}
                  </button>
                </div>
              </>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
