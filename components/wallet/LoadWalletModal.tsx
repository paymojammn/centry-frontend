'use client';

import { useState } from 'react';
import { X, Smartphone, Building2, Loader2, CheckCircle2, XCircle, Wallet as WalletIcon, CreditCard, Plus } from 'lucide-react';
import { useLoadWallet, usePaymentMethods } from '@/hooks/use-wallet';
import { useQuery } from '@tanstack/react-query';
import { billsApi } from '@/lib/bills-api';
import type { PaymentProvider } from '@/types/bill';
import type { LoadWalletResponse, SavedPaymentMethod } from '@/types/wallet';

interface LoadWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  currency?: string;
  countryCode?: string;
}

export default function LoadWalletModal({ 
  isOpen, 
  onClose, 
  currency = 'UGX',
  countryCode = 'UG' 
}: LoadWalletModalProps) {
  const [step, setStep] = useState<'select' | 'method' | 'provider' | 'details' | 'processing' | 'result'>('select');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<SavedPaymentMethod | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'bank' | null>(null);
  const [paymentProvider, setPaymentProvider] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [bankName, setBankName] = useState('');
  const [result, setResult] = useState<LoadWalletResponse | null>(null);

  // Fetch saved payment methods
  const { data: savedMethods = [], isLoading: methodsLoading } = usePaymentMethods();

  // Fetch payment providers
  const { data: providers, isLoading: providersLoading } = useQuery({
    queryKey: ['payment-providers', countryCode],
    queryFn: () => billsApi.getPaymentProviders(countryCode),
    enabled: isOpen,
  });

  // Load wallet mutation
  const loadWalletMutation = useLoadWallet();

  const handleClose = () => {
    setStep('select');
    setSelectedPaymentMethod(null);
    setPaymentMethod(null);
    setPaymentProvider(null);
    setAmount('');
    setPhoneNumber('');
    setAccountNumber('');
    setBankName('');
    setResult(null);
    onClose();
  };

  const handleUseSavedMethod = (method: SavedPaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentMethod(method.method_type);
    setPaymentProvider(method.provider);
    if (method.method_type === 'mobile_money') {
      setPhoneNumber(method.phone_number || '');
    } else if (method.method_type === 'bank') {
      setAccountNumber(method.account_number || '');
      setBankName(method.bank_name || '');
    }
    setStep('details');
  };

  const handleAddNewMethod = () => {
    setSelectedPaymentMethod(null);
    setStep('method');
  };

  const handleMethodSelect = (method: 'mobile_money' | 'bank') => {
    setPaymentMethod(method);
    setStep('provider');
  };

  const handleProviderSelect = (provider: string) => {
    setPaymentProvider(provider);
    setStep('details');
  };

  const handleBack = () => {
    if (step === 'provider') {
      setStep('method');
      setPaymentMethod(null);
    } else if (step === 'details') {
      if (selectedPaymentMethod) {
        setStep('select');
      } else {
        setStep('provider');
        setPaymentProvider(null);
      }
    } else if (step === 'method') {
      setStep('select');
    }
  };

  const handleSubmit = async () => {
    if (!paymentMethod || !paymentProvider || !amount) return;

    setStep('processing');

    try {
      const response = await loadWalletMutation.mutateAsync({
        amount,
        currency,
        method: paymentMethod,
        provider: paymentProvider,
        phone_number: paymentMethod === 'mobile_money' ? phoneNumber : undefined,
        account_number: paymentMethod === 'bank' ? accountNumber : undefined,
        bank_name: paymentMethod === 'bank' ? bankName : undefined,
      });

      setResult(response);
      setStep('result');
    } catch (error: unknown) {
      const err = error as Error;
      setResult({
        success: false,
        transaction_id: '',
        wallet_id: '',
        amount: '',
        status: 'failed',
        reference: '',
        message: '',
        error: err.message || 'Failed to load wallet'
      });
      setStep('result');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#638C80]/10 rounded-lg">
              <WalletIcon className="w-6 h-6 text-[#638C80]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Load Wallet</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Add money to your {currency} wallet
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Step 0: Select Saved Method or Add New */}
          {step === 'select' && (
            <div className="space-y-6">
              {methodsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#638C80]" />
                </div>
              ) : savedMethods.length > 0 ? (
                <>
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Select a payment method
                    </h3>
                    <div className="space-y-3">
                      {savedMethods.map((method: SavedPaymentMethod) => (
                        <button
                          key={method.id}
                          onClick={() => handleUseSavedMethod(method)}
                          className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-left group"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-2 bg-[#638C80]/10 rounded-lg group-hover:bg-[#638C80]/20 transition-colors">
                              {method.method_type === 'mobile_money' ? (
                                <Smartphone className="w-5 h-5 text-[#638C80]" />
                              ) : (
                                <Building2 className="w-5 h-5 text-[#638C80]" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-gray-900">{method.nickname}</h4>
                                {method.is_default && (
                                  <span className="px-2 py-0.5 bg-[#638C80] text-white text-xs font-medium rounded">
                                    Default
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-500 capitalize mt-0.5">
                                {method.provider} • {method.method_type.replace('_', ' ')}
                              </p>
                              <p className="text-sm text-gray-600 mt-1">
                                {method.method_type === 'mobile_money' 
                                  ? method.phone_number 
                                  : `${method.account_number} - ${method.bank_name}`
                                }
                              </p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-gray-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                      <span className="px-2 bg-white text-gray-500">or</span>
                    </div>
                  </div>

                  <button
                    onClick={handleAddNewMethod}
                    className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-center group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Plus className="w-5 h-5 text-gray-400 group-hover:text-[#638C80]" />
                      <span className="font-medium text-gray-600 group-hover:text-[#638C80]">
                        Add New Payment Method
                      </span>
                    </div>
                  </button>
                </>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                    <CreditCard className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No saved payment methods</h3>
                  <p className="text-gray-500 mb-6">
                    Add your first payment method to load your wallet
                  </p>
                  <button
                    onClick={handleAddNewMethod}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#638C80] text-white rounded-lg hover:bg-[#4f7068] transition-colors font-medium"
                  >
                    <Plus className="w-5 h-5" />
                    Add Payment Method
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Step 1: Select Payment Method */}
          {step === 'method' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                How would you like to load money?
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleMethodSelect('mobile_money')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                >
                  <Smartphone className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                  <h4 className="font-medium text-gray-900">Mobile Money</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Load via MTN, Airtel, etc.
                  </p>
                </button>

                <button
                  onClick={() => handleMethodSelect('bank')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all group"
                >
                  <Building2 className="w-8 h-8 text-gray-400 group-hover:text-[#638C80] mb-3" />
                  <h4 className="font-medium text-gray-900">Bank Transfer</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Load via Stanbic, DFCU, etc.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Provider */}
          {step === 'provider' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Select {paymentMethod === 'mobile_money' ? 'Mobile Money Provider' : 'Bank'}
                </h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068]"
                >
                  Back
                </button>
              </div>

              {providersLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#638C80]" />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {paymentMethod === 'mobile_money' && providers?.mobile_money.map((provider: PaymentProvider) => (
                    <button
                      key={provider.code}
                      onClick={() => handleProviderSelect(provider.code)}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-left"
                    >
                      <div className="font-medium text-gray-900">{provider.name}</div>
                    </button>
                  ))}

                  {paymentMethod === 'bank' && providers?.bank.map((provider: PaymentProvider) => (
                    <button
                      key={provider.code}
                      onClick={() => handleProviderSelect(provider.code)}
                      className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all text-left"
                    >
                      <div className="font-medium text-gray-900">{provider.name}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Enter Details */}
          {step === 'details' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Load Amount</h3>
                <button
                  onClick={handleBack}
                  className="text-sm text-[#638C80] hover:text-[#4f7068]"
                >
                  Back
                </button>
              </div>

              {/* Selected method/provider */}
              {selectedPaymentMethod ? (
                <div className="bg-[#638C80]/5 border border-[#638C80]/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#638C80]/10 rounded-lg">
                      {selectedPaymentMethod.method_type === 'mobile_money' ? (
                        <Smartphone className="w-5 h-5 text-[#638C80]" />
                      ) : (
                        <Building2 className="w-5 h-5 text-[#638C80]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-gray-900">{selectedPaymentMethod.nickname}</h4>
                        {selectedPaymentMethod.is_default && (
                          <span className="px-2 py-0.5 bg-[#638C80] text-white text-xs font-medium rounded">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {selectedPaymentMethod.method_type === 'mobile_money' 
                          ? selectedPaymentMethod.phone_number 
                          : `${selectedPaymentMethod.account_number} - ${selectedPaymentMethod.bank_name}`
                        }
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-sm text-gray-500">Loading via</div>
                  <div className="font-medium text-gray-900 mt-1">
                    {providers?.[paymentMethod === 'mobile_money' ? 'mobile_money' : 'bank']
                      .find((p: PaymentProvider) => p.code === paymentProvider)?.name}
                  </div>
                </div>
              )}

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 50000"
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent text-lg"
                />
              </div>

              {/* Payment fields */}
              {!selectedPaymentMethod && (
                <>
                  {paymentMethod === 'mobile_money' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="e.g., 256700000000"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        You will receive a prompt on your phone to confirm payment
                      </p>
                    </div>
                  )}

                  {paymentMethod === 'bank' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Your Account Number
                        </label>
                        <input
                          type="text"
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          placeholder="e.g., 1234567890"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bank Name
                        </label>
                        <input
                          type="text"
                          value={bankName}
                          onChange={(e) => setBankName(e.target.value)}
                          placeholder="e.g., Stanbic Bank"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-transparent"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={
                  !amount ||
                  (!selectedPaymentMethod && (
                    (paymentMethod === 'mobile_money' && !phoneNumber) ||
                    (paymentMethod === 'bank' && (!accountNumber || !bankName))
                  ))
                }
                className="w-full bg-[#638C80] text-white py-3 rounded-lg hover:bg-[#4f7068] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Load {currency} {amount || '0'}
              </button>
              
              {selectedPaymentMethod && paymentMethod === 'mobile_money' && (
                <p className="text-xs text-gray-500 text-center">
                  You will receive a prompt on {selectedPaymentMethod.phone_number} to confirm payment
                </p>
              )}
            </div>
          )}

          {/* Step 4: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#638C80] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing...</h3>
              <p className="text-sm text-gray-500">
                Please wait while we process your request
              </p>
            </div>
          )}

          {/* Step 5: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {result.success ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {result.status === 'success' ? 'Wallet Loaded!' : 'Request Submitted'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {result.message}
                    </p>
                    <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                      <span className="text-xs text-gray-500">Reference:</span>
                      <span className="text-sm font-mono font-medium text-gray-900">
                        {result.reference}
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Loading Failed
                    </h3>
                    <p className="text-sm text-red-600">
                      {result.error || 'Something went wrong'}
                    </p>
                  </>
                )}
              </div>

              {/* Bank transfer instructions */}
              {result.success && result.instructions && (
                <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-gray-900 mb-3">Transfer Instructions</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Bank:</span>
                      <span className="font-medium text-gray-900">{result.instructions.bank_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account:</span>
                      <span className="font-medium text-gray-900">{result.instructions.account_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium text-gray-900">
                        {result.instructions.currency} {result.instructions.amount}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reference:</span>
                      <span className="font-medium text-gray-900">{result.instructions.reference}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={handleClose}
                className="w-full bg-[#638C80] text-white py-3 rounded-lg hover:bg-[#4f7068] transition-colors font-medium"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
