'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Smartphone,
  Building2,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Wallet,
  Building,
} from 'lucide-react';
import { useCreateDepartmentWallet, useOrganizationAccounts } from '@/hooks/use-wallet';
import { useDepartments } from '@/hooks/use-departments';

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
  organizationName: string;
  organizationCurrency?: string;
  onSuccess?: () => void;
}

type Step = 'account-type' | 'select-account' | 'allocate-amount' | 'department' | 'processing' | 'result';
type AccountType = 'mobile_money' | 'bank' | null;

interface SelectedAccount {
  id: string;
  account_name: string;
  currency: string;
  balance: string;
  // Mobile money specific
  phone_number?: string;
  provider?: string | null;
  provider_name?: string | null;
  // Bank specific
  account_number?: string;
  bank_name?: string | null;
}

export default function CreateWalletModal({
  isOpen,
  onClose,
  organizationId,
  organizationName,
  organizationCurrency = 'UGX',
  onSuccess,
}: CreateWalletModalProps) {
  // Step state
  const [step, setStep] = useState<Step>('account-type');

  // Step 1: Account Type
  const [selectedAccountType, setSelectedAccountType] = useState<AccountType>(null);

  // Step 2: Selected Account
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [selectedAccount, setSelectedAccount] = useState<SelectedAccount | null>(null);

  // Step 3: Allocation
  const [initialBalance, setInitialBalance] = useState('');
  const [monthlyBudget, setMonthlyBudget] = useState('');

  // Step 4: Department
  const [departmentOption, setDepartmentOption] = useState<'general' | 'existing'>('general');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState<string | null>(null);

  // Error/Success state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch available accounts
  const { data: accountsData, isLoading: accountsLoading } = useOrganizationAccounts(organizationId);

  // Fetch existing departments from erp app
  const { data: departments, isLoading: departmentsLoading } = useDepartments({ organization_id: organizationId });

  // Create wallet mutation
  const createWalletMutation = useCreateDepartmentWallet();

  // Computed values
  const mobileMoneyAccounts = accountsData?.mobile_money_accounts || [];
  const bankAccounts = accountsData?.bank_accounts || [];
  const departmentList = departments || [];

  // Generate wallet name based on selections
  const generatedWalletName = useMemo(() => {
    if (!selectedAccount) return '';
    const prefix = departmentOption === 'general' ? 'General' : (selectedDepartmentName || 'Department');
    return `${prefix} - ${selectedAccount.account_name}`;
  }, [selectedAccount, departmentOption, selectedDepartmentName]);

  const handleClose = () => {
    setStep('account-type');
    setSelectedAccountType(null);
    setSelectedAccountId(null);
    setSelectedAccount(null);
    setInitialBalance('');
    setMonthlyBudget('');
    setDepartmentOption('general');
    setSelectedDepartmentName(null);
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleBack = () => {
    setError(null);
    if (step === 'select-account') {
      setStep('account-type');
      setSelectedAccountType(null);
      setSelectedAccountId(null);
      setSelectedAccount(null);
    } else if (step === 'allocate-amount') {
      setStep('select-account');
    } else if (step === 'department') {
      setStep('allocate-amount');
    }
  };

  const handleSelectAccountType = (type: AccountType) => {
    setSelectedAccountType(type);
    setSelectedAccountId(null);
    setSelectedAccount(null);
    setStep('select-account');
  };

  const handleSelectAccount = (account: SelectedAccount) => {
    setSelectedAccountId(account.id);
    setSelectedAccount(account);
    setError(null);
  };

  const handleContinueToAllocation = () => {
    if (!selectedAccountId || !selectedAccount) {
      setError('Please select an account');
      return;
    }
    setError(null);
    setStep('allocate-amount');
  };

  const handleContinueToDepartment = () => {
    // Validate initial balance if provided
    if (initialBalance) {
      const balance = parseFloat(initialBalance);
      const accountBalance = parseFloat(selectedAccount?.balance || '0');
      if (isNaN(balance) || balance < 0) {
        setError('Please enter a valid initial balance');
        return;
      }
      if (balance > accountBalance) {
        setError(`Initial balance cannot exceed account balance (${selectedAccount?.currency} ${accountBalance.toLocaleString()})`);
        return;
      }
    }

    // Validate monthly budget if provided
    if (monthlyBudget) {
      const budget = parseFloat(monthlyBudget);
      if (isNaN(budget) || budget < 0) {
        setError('Please enter a valid monthly budget');
        return;
      }
    }

    setError(null);
    setStep('department');
  };

  const handleSubmit = async () => {
    if (departmentOption === 'existing' && !selectedDepartmentName) {
      setError('Please select a department');
      return;
    }

    setStep('processing');
    setError(null);

    try {
      await createWalletMutation.mutateAsync({
        organization_id: organizationId,
        name: generatedWalletName,
        wallet_type: departmentOption === 'general' ? 'general' : 'department',
        currency: organizationCurrency,
        monthly_budget: monthlyBudget || undefined,
        initial_balance: initialBalance || undefined,
        linked_mobile_money_account_id: selectedAccountType === 'mobile_money' ? selectedAccountId! : undefined,
        linked_bank_account_id: selectedAccountType === 'bank' ? selectedAccountId! : undefined,
      });

      setSuccess(true);
      setStep('result');
      onSuccess?.();
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || 'Failed to create wallet');
      setStep('result');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#49a034]/10 rounded-lg">
              <Wallet className="w-6 h-6 text-[#49a034]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Create Wallet</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                For {organizationName}
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
          {/* Step 1: Select Account Type */}
          {step === 'account-type' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Select Account Type
              </h3>

              <p className="text-sm text-gray-600 mb-4">
                Choose which type of account to link to your new wallet.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleSelectAccountType('mobile_money')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#49a034] hover:bg-[#49a034]/5 transition-all group text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-orange-100 rounded-full mb-3 group-hover:bg-orange-200 transition-colors">
                    <Smartphone className="w-6 h-6 text-orange-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Mobile Money</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    MTN, Airtel, M-Pesa
                  </p>
                </button>

                <button
                  onClick={() => handleSelectAccountType('bank')}
                  className="p-6 border-2 border-gray-200 rounded-lg hover:border-[#49a034] hover:bg-[#49a034]/5 transition-all group text-center"
                >
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-3 group-hover:bg-blue-200 transition-colors">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <h4 className="font-medium text-gray-900">Bank Account</h4>
                  <p className="text-sm text-gray-500 mt-1">
                    Stanbic, Equity, etc.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Select Account */}
          {step === 'select-account' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  {selectedAccountType === 'mobile_money' ? 'Select Mobile Money Account' : 'Select Bank Account'}
                </h3>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {accountsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-[#49a034]" />
                </div>
              ) : (
                <>
                  {/* Mobile Money Accounts */}
                  {selectedAccountType === 'mobile_money' && (
                    <>
                      {mobileMoneyAccounts.length > 0 ? (
                        <div className="space-y-2">
                          {mobileMoneyAccounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => handleSelectAccount({
                                id: account.id,
                                account_name: account.account_name,
                                currency: account.currency,
                                balance: account.balance,
                                phone_number: account.phone_number,
                                provider: account.provider,
                                provider_name: account.provider_name,
                              })}
                              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                                selectedAccountId === account.id
                                  ? 'border-[#49a034] bg-[#49a034]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-orange-100 rounded-lg">
                                    <Smartphone className="w-5 h-5 text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{account.account_name}</p>
                                    <p className="text-sm text-gray-500">
                                      {account.provider_name || account.provider} - {account.phone_number}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-[#49a034]">
                                    {account.currency} {parseFloat(account.balance).toLocaleString()}
                                  </p>
                                  {selectedAccountId === account.id && (
                                    <CheckCircle2 className="w-5 h-5 text-[#49a034] ml-auto mt-1" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                            <Smartphone className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-600 mb-2">No mobile money accounts found</p>
                          <p className="text-sm text-gray-500">
                            Please add an account via the admin panel first
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Bank Accounts */}
                  {selectedAccountType === 'bank' && (
                    <>
                      {bankAccounts.length > 0 ? (
                        <div className="space-y-2">
                          {bankAccounts.map((account) => (
                            <button
                              key={account.id}
                              onClick={() => handleSelectAccount({
                                id: account.id,
                                account_name: account.account_name,
                                currency: account.currency,
                                balance: account.balance,
                                account_number: account.account_number,
                                bank_name: account.bank_name,
                              })}
                              className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                                selectedAccountId === account.id
                                  ? 'border-[#49a034] bg-[#49a034]/5'
                                  : 'border-gray-200 hover:border-gray-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="p-2 bg-blue-100 rounded-lg">
                                    <Building2 className="w-5 h-5 text-blue-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-gray-900">{account.account_name}</p>
                                    <p className="text-sm text-gray-500">
                                      {account.bank_name} - {account.account_number}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-[#49a034]">
                                    {account.currency} {parseFloat(account.balance).toLocaleString()}
                                  </p>
                                  {selectedAccountId === account.id && (
                                    <CheckCircle2 className="w-5 h-5 text-[#49a034] ml-auto mt-1" />
                                  )}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                          <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-full mb-3">
                            <Building2 className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-gray-600 mb-2">No bank accounts found</p>
                          <p className="text-sm text-gray-500">
                            Please add an account via the admin panel first
                          </p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Continue button */}
                  {selectedAccountId && (
                    <button
                      onClick={handleContinueToAllocation}
                      className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors font-medium mt-4"
                    >
                      Continue
                    </button>
                  )}
                </>
              )}
            </div>
          )}

          {/* Step 3: Allocate Amount */}
          {step === 'allocate-amount' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  Allocation (Optional)
                </h3>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* Selected account summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-500">Selected Account</p>
                <p className="font-medium text-gray-900">{selectedAccount?.account_name}</p>
                <p className="text-sm text-[#49a034]">
                  Balance: {organizationCurrency} {parseFloat(selectedAccount?.balance || '0').toLocaleString()}
                </p>
              </div>

              {/* Initial Balance */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Initial Balance (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {organizationCurrency}
                  </span>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full pl-14 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49a034] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This amount will be transferred from the linked account to fund the wallet
                </p>
              </div>

              {/* Monthly Budget */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Budget (optional)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    {organizationCurrency}
                  </span>
                  <input
                    type="number"
                    value={monthlyBudget}
                    onChange={(e) => setMonthlyBudget(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    className="w-full pl-14 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#49a034] focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Spending limit for this wallet per month
                </p>
              </div>

              <button
                onClick={handleContinueToDepartment}
                className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 4: Department Assignment */}
          {step === 'department' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <button onClick={handleBack} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-500" />
                </button>
                <h3 className="text-lg font-medium text-gray-900">
                  Assign to Department
                </h3>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              {/* General option */}
              <button
                onClick={() => {
                  setDepartmentOption('general');
                  setSelectedDepartmentName(null);
                }}
                className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                  departmentOption === 'general'
                    ? 'border-[#49a034] bg-[#49a034]/5'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Wallet className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900">General Wallet</h4>
                    <p className="text-sm text-gray-500">Not assigned to any specific department</p>
                  </div>
                  {departmentOption === 'general' && (
                    <CheckCircle2 className="w-5 h-5 text-[#49a034] ml-auto" />
                  )}
                </div>
              </button>

              {/* Divider */}
              <div className="relative py-2">
                <div className="border-t border-gray-200"></div>
                <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-sm text-gray-500">
                  or assign to department
                </span>
              </div>

              {/* Department selection */}
              {departmentsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#49a034]" />
                </div>
              ) : departmentList.length > 0 ? (
                <div className="space-y-2">
                  {departmentList.map((dept) => (
                    <button
                      key={dept.id}
                      onClick={() => {
                        setDepartmentOption('existing');
                        setSelectedDepartmentName(dept.name);
                      }}
                      className={`w-full p-4 border-2 rounded-lg text-left transition-all ${
                        departmentOption === 'existing' && selectedDepartmentName === dept.name
                          ? 'border-[#49a034] bg-[#49a034]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <Building className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">{dept.name}</h4>
                          <p className="text-sm text-gray-500">
                            {dept.code ? `${dept.code} - ` : ''}Department wallet
                          </p>
                        </div>
                        {departmentOption === 'existing' && selectedDepartmentName === dept.name && (
                          <CheckCircle2 className="w-5 h-5 text-[#49a034] ml-auto" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">
                    No departments found. Go to Organization settings to create departments first.
                  </p>
                </div>
              )}

              {/* Preview */}
              <div className="bg-blue-50 rounded-lg p-4 mt-4">
                <p className="text-sm text-blue-600 font-medium">Wallet Preview</p>
                <p className="text-lg font-semibold text-blue-900 mt-1">
                  {generatedWalletName || 'Select options above'}
                </p>
                {initialBalance && (
                  <p className="text-sm text-blue-700 mt-1">
                    Initial balance: {organizationCurrency} {parseFloat(initialBalance).toLocaleString()}
                  </p>
                )}
                {monthlyBudget && (
                  <p className="text-sm text-blue-700">
                    Monthly budget: {organizationCurrency} {parseFloat(monthlyBudget).toLocaleString()}
                  </p>
                )}
              </div>

              <button
                onClick={handleSubmit}
                className="w-full bg-[#49a034] text-white py-3 rounded-lg hover:bg-[#3d8a2b] transition-colors font-medium"
              >
                Create Wallet
              </button>
            </div>
          )}

          {/* Step 5: Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="w-16 h-16 animate-spin text-[#49a034] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Creating Wallet...</h3>
              <p className="text-sm text-gray-500">
                {initialBalance ? 'Setting up wallet and transferring initial funds...' : 'Please wait while we set up your wallet'}
              </p>
            </div>
          )}

          {/* Step 6: Result */}
          {step === 'result' && (
            <div className="space-y-4">
              <div className="text-center py-6">
                {success ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Wallet Created Successfully!
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      Your new wallet &quot;{generatedWalletName}&quot; is ready to use.
                    </p>
                    {initialBalance && (
                      <p className="text-sm text-[#49a034]">
                        Initial balance of {organizationCurrency} {parseFloat(initialBalance).toLocaleString()} has been transferred.
                      </p>
                    )}
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Failed to Create Wallet
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
