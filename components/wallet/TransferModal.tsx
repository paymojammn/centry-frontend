'use client';

import { useState } from 'react';
import {
  X,
  Smartphone,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { useLinkedAccounts, useTransfer, useFeePreview, useOrganizationAccounts } from '@/hooks/use-wallet';
import type { DepartmentWallet, TransferResponse, LinkedAccount } from '@/types/wallet';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: DepartmentWallet;
}

type Step = 'source' | 'destination' | 'amount' | 'confirm' | 'processing' | 'result';

interface DestinationAccount {
  id: string;
  type: 'mobile_money' | 'bank';
  name: string;
  identifier: string;
  provider?: string;
  currency: string;
  balance: string;
}

export default function TransferModal({ isOpen, onClose, wallet }: TransferModalProps) {
  const [step, setStep] = useState<Step>('source');
  const [sourceType, setSourceType] = useState<'mobile_money' | 'bank' | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<DestinationAccount | null>(null);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<TransferResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch linked accounts for this wallet (source accounts)
  const { data: linkedAccountsData, isLoading: accountsLoading } = useLinkedAccounts(wallet?.id);

  // Fetch organization accounts (destination accounts)
  const { data: orgAccountsData, isLoading: orgAccountsLoading } = useOrganizationAccounts(wallet?.organization_id);

  // Fee preview
  const { data: feePreview, isLoading: feeLoading } = useFeePreview(
    wallet?.id,
    amount && parseFloat(amount) > 0 ? amount : ''
  );

  // Transfer mutation
  const transferMutation = useTransfer();

  const handleClose = () => {
    setStep('source');
    setSourceType(null);
    setSelectedDestination(null);
    setAmount('');
    setDescription('');
    setResult(null);
    setError(null);
    onClose();
  };

  const handleSelectSource = (type: 'mobile_money' | 'bank') => {
    setSourceType(type);
    setStep('destination');
  };

  const handleSelectDestination = (account: DestinationAccount) => {
    setSelectedDestination(account);
    setStep('amount');
  };

  const handleBack = () => {
    setError(null);
    if (step === 'destination') {
      setStep('source');
      setSourceType(null);
    } else if (step === 'amount') {
      setStep('destination');
      setSelectedDestination(null);
    } else if (step === 'confirm') {
      setStep('amount');
    }
  };

  const handleProceedToConfirm = () => {
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }
    setError(null);
    setStep('confirm');
  };

  const handleSubmit = async () => {
    if (!sourceType || !selectedDestination || !amount) return;

    setStep('processing');
    setError(null);

    try {
      const response = await transferMutation.mutateAsync({
        walletId: wallet.id,
        request: {
          amount,
          source_type: sourceType,
          destination_type: selectedDestination.type,
          destination_phone: selectedDestination.type === 'mobile_money' ? selectedDestination.identifier : undefined,
          destination_account_number: selectedDestination.type === 'bank' ? selectedDestination.identifier : undefined,
          destination_bank_name: selectedDestination.type === 'bank' ? selectedDestination.provider : undefined,
          destination_account_name: selectedDestination.name,
          description: description || `Transfer to ${selectedDestination.name}`,
        },
      });

      setResult(response);
      setStep('result');
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Transfer failed');
      setStep('result');
    }
  };

  if (!isOpen) return null;

  const hasLinkedMobileMoney = linkedAccountsData?.current_linked_accounts?.some(
    (acc: LinkedAccount) => acc.type === 'mobile_money'
  );
  const hasLinkedBank = linkedAccountsData?.current_linked_accounts?.some(
    (acc: LinkedAccount) => acc.type === 'bank'
  );
  const hasAnyLinkedAccount = hasLinkedMobileMoney || hasLinkedBank;

  // Build destination accounts list from organization accounts
  const destinationAccounts: DestinationAccount[] = [];
  if (orgAccountsData) {
    orgAccountsData.mobile_money_accounts?.forEach((acc) => {
      destinationAccounts.push({
        id: acc.id,
        type: 'mobile_money',
        name: acc.account_name,
        identifier: acc.phone_number,
        provider: acc.provider_name || acc.provider || undefined,
        currency: acc.currency,
        balance: acc.balance,
      });
    });
    orgAccountsData.bank_accounts?.forEach((acc) => {
      destinationAccounts.push({
        id: acc.id,
        type: 'bank',
        name: acc.account_name,
        identifier: acc.account_number,
        provider: acc.bank_name || undefined,
        currency: acc.currency,
        balance: acc.balance,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#49a034]/10 rounded-lg">
              <ArrowRight className="w-6 h-6 text-[#49a034]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Make Transfer</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Transfer from {wallet.name}
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
          {/* No linked accounts warning */}
          {!accountsLoading && !hasAnyLinkedAccount && step === 'source' && (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                <AlertCircle className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Linked Accounts</h3>
              <p className="text-gray-500 mb-6 max-w-md mx-auto">
                You need to link a mobile money or bank account to this wallet before making transfers.
              </p>
            </div>
          )}

          {/* Step 1: Select Source Account */}
          {step === 'source' && hasAnyLinkedAccount && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Transfer from which account?
              </h3>

              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#49a034]" />
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedAccountsData?.current_linked_accounts?.map((account: LinkedAccount) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectSource(account.type as 'mobile_money' | 'bank')}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#49a034] hover:bg-[#49a034]/5 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-[#49a034]/10 rounded-lg group-hover:bg-[#49a034]/20 transition-colors">
                          {account.type === 'mobile_money' ? (
                            <Smartphone className="w-5 h-5 text-[#49a034]" />
                          ) : (
                            <Building2 className="w-5 h-5 text-[#49a034]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{account.name}</h4>
                          <p className="text-sm text-gray-500 capitalize mt-0.5">
                            {account.provider || account.bank_name} - {account.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {account.type === 'mobile_money'
                              ? account.phone_number
                              : account.account_number}
                          </p>
                          <p className="text-sm font-medium text-[#49a034] mt-2">
                            Balance: {account.currency} {parseFloat(account.balance).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 2: Select Destination Account */}
          {step === 'destination' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Transfer to which account?
                </h3>
                <button onClick={handleBack} className="text-sm text-[#49a034] hover:text-[#3d8a2b]">
                  Back
                </button>
              </div>

              {orgAccountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#49a034]" />
                </div>
              ) : destinationAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Destination Accounts</h3>
                  <p className="text-gray-500 max-w-md mx-auto">
                    No configured accounts available to transfer to. Add mobile money or bank accounts to your organization first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {destinationAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectDestination(account)}
                      className="w-full p-4 border-2 border-gray-200 rounded-lg hover:border-[#49a034] hover:bg-[#49a034]/5 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg group-hover:bg-[#49a034]/10 transition-colors">
                          {account.type === 'mobile_money' ? (
                            <Smartphone className="w-5 h-5 text-gray-600 group-hover:text-[#49a034]" />
                          ) : (
                            <Building2 className="w-5 h-5 text-gray-600 group-hover:text-[#49a034]" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-gray-900">{account.name}</h4>
                          <p className="text-sm text-gray-500 capitalize mt-0.5">
                            {account.provider} - {account.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">
                            {account.identifier}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Enter Amount */}
          {step === 'amount' && selectedDestination && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Transfer Details</h3>
                <button onClick={handleBack} className="text-sm text-[#49a034] hover:text-[#3d8a2b]">
                  Back
                </button>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Destination summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500 mb-1">Sending to</p>
                <div className="flex items-center gap-2">
                  {selectedDestination.type === 'mobile_money' ? (
                    <Smartphone className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Building2 className="w-4 h-4 text-gray-600" />
                  )}
                  <span className="font-medium text-gray-900">{selectedDestination.name}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selectedDestination.provider} - {selectedDestination.identifier}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Amount ({wallet.currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 100000"
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49a034] focus:border-transparent text-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Payment for supplies"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49a034] focus:border-transparent"
                />
              </div>

              {/* Fee Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Transfer Amount:</span>
                    <span className="font-medium text-gray-900">
                      {wallet.currency} {parseFloat(amount).toLocaleString()}
                    </span>
                  </div>
                  {feeLoading ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Processing Fee:</span>
                      <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    </div>
                  ) : feePreview ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Fee ({feePreview.fee_percentage}%):
                        </span>
                        <span className="font-medium text-gray-900">
                          {wallet.currency} {parseFloat(feePreview.calculated_fee).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-gray-900">Total:</span>
                          <span className="font-bold text-[#49a034]">
                            {wallet.currency} {parseFloat(feePreview.total_amount).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              )}

              <button
                onClick={handleProceedToConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
                className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && selectedDestination && feePreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Confirm Transfer</h3>
                <button onClick={handleBack} className="text-sm text-[#49a034] hover:text-[#3d8a2b]">
                  Back
                </button>
              </div>

              <div className="bg-[#49a034]/5 border border-[#49a034]/20 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">From:</span>
                  <span className="font-medium text-gray-900">{wallet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Source:</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {sourceType?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">To:</span>
                  <span className="font-medium text-gray-900">
                    {selectedDestination.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Account:</span>
                  <span className="text-gray-700">
                    {selectedDestination.identifier}
                  </span>
                </div>
                <div className="border-t border-[#49a034]/20 pt-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Amount:</span>
                    <span className="font-medium text-gray-900">
                      {wallet.currency} {parseFloat(amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-gray-600">Fee ({feePreview.fee_percentage}%):</span>
                    <span className="font-medium text-gray-900">
                      {wallet.currency} {parseFloat(feePreview.calculated_fee).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-[#49a034]/20">
                    <span className="font-bold text-gray-900">Total Debit:</span>
                    <span className="font-bold text-[#49a034]">
                      {wallet.currency} {parseFloat(feePreview.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {description && (
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Note:</span> {description}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors font-medium"
              >
                Confirm & Transfer
              </button>
            </div>
          )}

          {/* Step 5: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#49a034] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Processing Transfer...</h3>
              <p className="text-sm text-gray-500">
                Please wait while we process your transfer
              </p>
            </div>
          )}

          {/* Step 6: Result */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {result && !error ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {result.requires_approval ? 'Transfer Submitted for Approval' : 'Transfer Initiated!'}
                    </h3>
                    <p className="text-sm text-gray-500 mb-4">
                      {result.requires_approval
                        ? 'This transfer requires manager approval before processing.'
                        : 'Your transfer is being processed.'}
                    </p>
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-lg">
                        <span className="text-xs text-gray-500">Reference:</span>
                        <span className="text-sm font-mono font-medium text-gray-900">
                          {result.reference}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Amount: {wallet.currency} {parseFloat(result.amount).toLocaleString()}
                        <br />
                        Fee: {wallet.currency} {parseFloat(result.fee_amount).toLocaleString()}
                        <br />
                        Total: {wallet.currency} {parseFloat(result.total_amount).toLocaleString()}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Transfer Failed
                    </h3>
                    <p className="text-sm text-red-600">
                      {error || 'Something went wrong'}
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors font-medium"
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
