/**
 * React Query hooks for vendor/contact editing + bank accounts.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  contactsApi,
  type Contact,
  type ContactBankAccount,
  type ContactBankAccountInput,
  type BankOption,
  type BankBranchOption,
} from '@/lib/contacts-api';

export function useContactBankAccounts(contactId: number | undefined) {
  return useQuery<ContactBankAccount[], Error>({
    queryKey: ['contact-bank-accounts', contactId],
    queryFn: () => contactsApi.getContactBankAccounts(contactId!),
    enabled: !!contactId,
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
    staleTime: 60 * 60 * 1000,
  });
}

export function useCreateContactBankAccount(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ContactBankAccountInput) => contactsApi.createContactBankAccount(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-bank-accounts', contactId] }),
  });
}

export function useUpdateContactBankAccount(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<ContactBankAccountInput> }) =>
      contactsApi.updateContactBankAccount(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-bank-accounts', contactId] }),
  });
}

export function useDeleteContactBankAccount(contactId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => contactsApi.deleteContactBankAccount(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['contact-bank-accounts', contactId] }),
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
