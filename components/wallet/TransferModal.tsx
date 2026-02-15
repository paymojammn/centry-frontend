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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 p-4">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <ArrowRight className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">Make Transfer</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Transfer from {wallet.name}
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-muted-foreground" />
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
              <h3 className="text-lg font-medium text-foreground mb-2">No Linked Accounts</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                You need to link a mobile money or bank account to this wallet before making transfers.
              </p>
            </div>
          )}

          {/* Step 1: Select Source Account */}
          {step === 'source' && hasAnyLinkedAccount && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-foreground mb-4">
                Transfer from which account?
              </h3>

              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-3">
                  {linkedAccountsData?.current_linked_accounts?.map((account: LinkedAccount) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectSource(account.type as 'mobile_money' | 'bank')}
                      className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                          {account.type === 'mobile_money' ? (
                            <Smartphone className="w-5 h-5 text-primary" />
                          ) : (
                            <Building2 className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground">{account.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize mt-0.5">
                            {account.provider || account.bank_name} - {account.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {account.type === 'mobile_money'
                              ? account.phone_number
                              : account.account_number}
                          </p>
                          <p className="text-sm font-medium text-primary mt-2">
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
                <h3 className="text-lg font-medium text-foreground">
                  Transfer to which account?
                </h3>
                <button onClick={handleBack} className="text-sm text-primary hover:text-primary/80">
                  Back
                </button>
              </div>

              {orgAccountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : destinationAccounts.length === 0 ? (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-100 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-amber-600" />
                  </div>
                  <h3 className="text-lg font-medium text-foreground mb-2">No Destination Accounts</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    No configured accounts available to transfer to. Add mobile money or bank accounts to your organization first.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {destinationAccounts.map((account) => (
                    <button
                      key={account.id}
                      onClick={() => handleSelectDestination(account)}
                      className="w-full p-4 border-2 border-border rounded-lg hover:border-primary hover:bg-primary/5 transition-all text-left group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                          {account.type === 'mobile_money' ? (
                            <Smartphone className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                          ) : (
                            <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-foreground">{account.name}</h4>
                          <p className="text-sm text-muted-foreground capitalize mt-0.5">
                            {account.provider} - {account.type.replace('_', ' ')}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
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
                <h3 className="text-lg font-medium text-foreground">Transfer Details</h3>
                <button onClick={handleBack} className="text-sm text-primary hover:text-primary/80">
                  Back
                </button>
              </div>

              {error && (
                <div className="bg-destructive/5 border border-destructive/20 text-destructive px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Destination summary */}
              <div className="bg-muted rounded-lg p-4">
                <p className="text-sm text-muted-foreground mb-1">Sending to</p>
                <div className="flex items-center gap-2">
                  {selectedDestination.type === 'mobile_money' ? (
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <Building2 className="w-4 h-4 text-muted-foreground" />
                  )}
                  <span className="font-medium text-foreground">{selectedDestination.name}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedDestination.provider} - {selectedDestination.identifier}
                </p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Amount ({wallet.currency})
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g., 100000"
                  min="1"
                  step="1"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-lg"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description (optional)
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., Payment for supplies"
                  className="w-full px-4 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>

              {/* Fee Preview */}
              {amount && parseFloat(amount) > 0 && (
                <div className="bg-muted rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Transfer Amount:</span>
                    <span className="font-medium text-foreground">
                      {wallet.currency} {parseFloat(amount).toLocaleString()}
                    </span>
                  </div>
                  {feeLoading ? (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Processing Fee:</span>
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/60" />
                    </div>
                  ) : feePreview ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Fee ({feePreview.fee_percentage}%):
                        </span>
                        <span className="font-medium text-foreground">
                          {wallet.currency} {parseFloat(feePreview.calculated_fee).toLocaleString()}
                        </span>
                      </div>
                      <div className="border-t border-border pt-2 mt-2">
                        <div className="flex justify-between">
                          <span className="font-medium text-foreground">Total:</span>
                          <span className="font-bold text-primary">
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
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/80 transition-colors disabled:bg-muted disabled:cursor-not-allowed font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Confirm */}
          {step === 'confirm' && selectedDestination && feePreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-foreground">Confirm Transfer</h3>
                <button onClick={handleBack} className="text-sm text-primary hover:text-primary/80">
                  Back
                </button>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From:</span>
                  <span className="font-medium text-foreground">{wallet.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Source:</span>
                  <span className="font-medium text-foreground capitalize">
                    {sourceType?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">To:</span>
                  <span className="font-medium text-foreground">
                    {selectedDestination.name}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Account:</span>
                  <span className="text-foreground">
                    {selectedDestination.identifier}
                  </span>
                </div>
                <div className="border-t border-primary/20 pt-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium text-foreground">
                      {wallet.currency} {parseFloat(amount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-muted-foreground">Fee ({feePreview.fee_percentage}%):</span>
                    <span className="font-medium text-foreground">
                      {wallet.currency} {parseFloat(feePreview.calculated_fee).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between mt-2 pt-2 border-t border-primary/20">
                    <span className="font-bold text-foreground">Total Debit:</span>
                    <span className="font-bold text-primary">
                      {wallet.currency} {parseFloat(feePreview.total_amount).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {description && (
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium">Note:</span> {description}
                </div>
              )}

              <button
                onClick={handleSubmit}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/80 transition-colors font-medium"
              >
                Confirm & Transfer
              </button>
            </div>
          )}

          {/* Step 5: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">Processing Transfer...</h3>
              <p className="text-sm text-muted-foreground">
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
                    <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      {result.requires_approval ? 'Transfer Submitted for Approval' : 'Transfer Initiated!'}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {result.requires_approval
                        ? 'This transfer requires manager approval before processing.'
                        : 'Your transfer is being processed.'}
                    </p>
                    <div className="space-y-2">
                      <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                        <span className="text-xs text-muted-foreground">Reference:</span>
                        <span className="text-sm font-mono font-medium text-foreground">
                          {result.reference}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
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
                    <XCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                      Transfer Failed
                    </h3>
                    <p className="text-sm text-destructive">
                      {error || 'Something went wrong'}
                    </p>
                  </>
                )}
              </div>

              <button
                onClick={handleClose}
                className="w-full bg-primary text-white py-3 rounded-lg hover:bg-primary/80 transition-colors font-medium"
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
