'use client';

import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contactsApi, type Contact, type ContactsFilters } from '@/lib/contacts-api';
import { useSyncContacts, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Phone,
  Mail,
  Building2,
  Users,
  RefreshCw,
  ChevronRight,
  Package,
  ShoppingCart,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ContactImportDialog } from '@/components/contact-import-dialog';

// Get contact initials for avatar
function getContactInitials(name: string): string {
  if (!name) return '?';
  const words = name.split(' ').filter(Boolean);
  if (words.length >= 2) {
    return (words[0][0] + words[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default function VendorsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactsFilters>({
    search: '',
  });

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  const { mutate: syncContacts, isPending: isSyncing } = useSyncContacts();
  const { data: erpConnectionsResponse } = useERPConnections();

  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  useEffect(() => {
    if (!selectedOrganizationId) return;

    const orgConnection = erpConnections?.find(
      (conn: any) => conn.organization?.id === selectedOrganizationId && conn.is_active
    );

    setActiveConnectionId(orgConnection?.id || null);
  }, [selectedOrganizationId, erpConnections]);

  const queryFilters = {
    ...filters,
    ...(selectedOrganizationId && { organization: selectedOrganizationId }),
  };

  const { data: contactsData, isLoading, error } = useQuery({
    queryKey: ['contacts', queryFilters],
    queryFn: () => contactsApi.getContacts(queryFilters),
    retry: 1,
    enabled: !!selectedOrganizationId,
  });

  // Calculate stats from contacts
  const stats = useMemo(() => {
    const contacts = contactsData?.results || [];

    return {
      total: contacts.length,
      suppliers: contacts.filter((c: Contact) => c.is_supplier).length,
      customers: contacts.filter((c: Contact) => c.is_customer).length,
      active: contacts.filter((c: Contact) => c.contact_status === 'ACTIVE').length,
    };
  }, [contactsData]);

  const handleSearchChange = (value: string) => {
    setFilters((prev) => ({ ...prev, search: value }));
  };

  const handleTypeChange = (value: string) => {
    setFilters((prev) => ({
      ...prev,
      type: value === 'all' ? undefined : (value as 'supplier' | 'customer'),
    }));
  };

  const handleSyncContacts = () => {
    if (activeConnectionId) {
      syncContacts(activeConnectionId);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-gray-900">Contacts</h1>
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[200px] h-9 bg-gray-50 border-gray-200">
                  <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                  <SelectValue placeholder="Select organization" />
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <ContactImportDialog />
              <Button
                variant="outline"
                size="sm"
                onClick={handleSyncContacts}
                disabled={isSyncing || !activeConnectionId}
                className="h-9"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync from Xero'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Total:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Suppliers:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {stats.suppliers}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Customers:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-700">
                {stats.customers}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Active:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-amber-50 text-amber-700">
                {stats.active}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9 bg-gray-50 border-gray-200"
                />
              </div>

              <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[160px] h-9 bg-gray-50 border-gray-200">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contacts Table */}
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </div>
          ) : error ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <Users className="h-8 w-8 text-orange-400 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Error loading contacts</p>
              <p className="text-xs text-gray-400 mt-1">Please try refreshing the page</p>
            </div>
          ) : !contactsData?.results || contactsData.results.length === 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <Users className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {filters.search ? 'No contacts match your search' : 'No contacts found'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {filters.search ? 'Try a different search term' : 'Sync with Xero to get started'}
              </p>
            </div>
          ) : (
            <ContactsTable contacts={contactsData.results} />
          )}
        </div>
      </div>
    </div>
  );
}

interface ContactsTableProps {
  contacts: Contact[];
}

function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();

  const getTypeLabel = (contact: Contact) => {
    if (contact.is_supplier && contact.is_customer) return 'Both';
    if (contact.is_supplier) return 'Supplier';
    if (contact.is_customer) return 'Customer';
    return '-';
  };

  const getTypeBadge = (contact: Contact) => {
    if (contact.is_supplier && contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#638C80]/10 text-[#638C80]">
          Both
        </span>
      );
    }
    if (contact.is_supplier) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          <Package className="h-3 w-3" />
          Supplier
        </span>
      );
    }
    if (contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          <ShoppingCart className="h-3 w-3" />
          Customer
        </span>
      );
    }
    return <span className="text-xs text-gray-400">-</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
        {status}
      </span>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-100 bg-gray-50/50">
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-6">Contact</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-6">Details</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-6">Type</th>
            <th className="text-left text-xs font-medium text-gray-500 py-3 px-6">Status</th>
            <th className="w-10 py-3 px-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              className="hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => router.push(`/vendors/${contact.id}`)}
            >
              <td className="py-3 px-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center text-gray-600 font-medium text-xs">
                    {getContactInitials(contact.name)}
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                    {contact.organization_name && (
                      <div className="text-xs text-gray-500">{contact.organization_name}</div>
                    )}
                  </div>
                </div>
              </td>
              <td className="py-3 px-6">
                <div className="space-y-1">
                  {contact.primary_phone && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-3 w-3 text-gray-400" />
                      {contact.primary_phone}
                    </div>
                  )}
                  {contact.email_address && (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Mail className="h-3 w-3 text-gray-400" />
                      <span className="truncate max-w-[200px]">{contact.email_address}</span>
                    </div>
                  )}
                  {!contact.primary_phone && !contact.email_address && (
                    <span className="text-xs text-gray-400">No contact info</span>
                  )}
                </div>
              </td>
              <td className="py-3 px-6">
                {getTypeBadge(contact)}
              </td>
              <td className="py-3 px-6">
                {getStatusBadge(contact.contact_status)}
              </td>
              <td className="py-3 px-3">
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
