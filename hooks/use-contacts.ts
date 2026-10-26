/**
 * React Query hooks for vendor/contact editing + bank accounts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  type Contact,
  type ContactBankAccount,
  type ContactBankAccountInput,
  type BankAccountOwner,
  type BankOption,
  type BankBranchOption,
} from '@/lib/contacts-api';

/** Cache key shared by the list query and the mutations' invalidations. */
export function bankAccountsKey(owner: number | BankAccountOwner | undefined) {
  if (owner === undefined) return ['contact-bank-accounts', undefined];
  if (typeof owner === 'number') return ['contact-bank-accounts', owner];
  return 'contact' in owner
    ? ['contact-bank-accounts', owner.contact]
    : ['contact-bank-accounts', 'erpnext', owner.erpnext_contact];
}

export function useContactBankAccounts(owner: number | BankAccountOwner | undefined) {
  return useQuery<ContactBankAccount[], Error>({
    queryKey: bankAccountsKey(owner),
    queryFn: () => contactsApi.getContactBankAccounts(owner!),
    enabled: owner !== undefined && owner !== 0,
  });
}

export function useBankCountries() {
  return useQuery<{ id: number; code: string; name: string }[], Error>({
    queryKey: ['bank-countries'],
    queryFn: () => contactsApi.getBankCountries(),
    staleTime: 24 * 60 * 60 * 1000,
  });
}

export function useBanks(country?: string, search?: string) {
  return useQuery<BankOption[], Error>({
    queryKey: ['banks', country || '', search || ''],
    queryFn: () => contactsApi.getBanks(country, search),
    enabled: !!country,
    staleTime: 60 * 60 * 1000,
  });
}

export function useBankBranches(bankId: number | undefined) {
  return useQuery<BankBranchOption[], Error>({
    queryKey: ['bank-branches', bankId],
    queryFn: () => contactsApi.getBankBranches(bankId!),
    enabled: !!bankId,
    // Branches can be added from Banking → Banks & Branches by another user.
    staleTime: 10 * 60 * 1000,
  });
}

export function useCreateContactBankAccount(owner: number | BankAccountOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactBankAccountInput) => contactsApi.createContactBankAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsKey(owner) }),
  });
}

export function useUpdateContactBankAccount(owner: number | BankAccountOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContactBankAccountInput> }) =>
      contactsApi.updateContactBankAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsKey(owner) }),
  });
}

export function useDeleteContactBankAccount(owner: number | BankAccountOwner) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contactsApi.deleteContactBankAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bankAccountsKey(owner) }),
  });
}

export function useUpdateContactDetails(contactId: number) {
  const qc = useQueryClient();
  return useMutation<Contact, Error, { phone?: string; email_address?: string | null }>({
    mutationFn: (data) => contactsApi.updateContactDetails(contactId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['contact', contactId] });
      qc.invalidateQueries({ queryKey: ['contacts'] });
    },
  });
}
