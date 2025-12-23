'use client';

import { useState, useEffect } from 'react';
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
  MoreHorizontal,
  ChevronRight,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ContactImportDialog } from '@/components/contact-import-dialog';

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
    <div className="min-h-screen bg-gray-50/50">
      <div className="container mx-auto py-6 px-4 max-w-6xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Contacts</h1>
              <p className="text-sm text-gray-500 mt-1">
                Manage vendors, suppliers, and customers
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[220px]">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <SelectValue placeholder="Select organization" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <ContactImportDialog />

              <Button
                variant="outline"
                onClick={handleSyncContacts}
                disabled={isSyncing || !activeConnectionId}
                size="sm"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg border shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-9"
                />
              </div>

              <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[160px] h-9">
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
            <ContactsLoadingSkeleton />
          ) : error ? (
            <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
              <Users className="h-10 w-10 text-red-400 mx-auto mb-3" />
              <p className="text-gray-500">Error loading contacts</p>
            </div>
          ) : !contactsData?.results || contactsData.results.length === 0 ? (
            <div className="bg-white rounded-lg border shadow-sm p-12 text-center">
              <Users className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {filters.search ? 'No contacts match your search' : 'No contacts found'}
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

  const getTypeStyle = (contact: Contact) => {
    if (contact.is_supplier && contact.is_customer) return 'bg-purple-50 text-purple-700';
    if (contact.is_supplier) return 'bg-blue-50 text-blue-700';
    if (contact.is_customer) return 'bg-green-50 text-green-700';
    return 'bg-gray-100 text-gray-600';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-50 text-green-700';
      case 'ARCHIVED':
        return 'bg-gray-100 text-gray-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="w-10 py-3 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/vendors/${contact.id}`)}
              >
                <td className="py-3 px-4">
                  <div className="font-medium text-gray-900 text-sm">{contact.name}</div>
                  {contact.organization_name && (
                    <div className="text-xs text-gray-400">{contact.organization_name}</div>
                  )}
                </td>
                <td className="py-3 px-4">
                  <div className="space-y-1">
                    {contact.primary_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        {contact.primary_phone}
                      </div>
                    )}
                    {contact.email_address && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Mail className="h-3.5 w-3.5 text-gray-400" />
                        <span className="truncate max-w-[200px]">{contact.email_address}</span>
                      </div>
                    )}
                    {!contact.primary_phone && !contact.email_address && (
                      <span className="text-sm text-gray-400">-</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getTypeStyle(contact)}`}>
                    {getTypeLabel(contact)}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusStyle(contact.contact_status)}`}>
                    {contact.contact_status}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ContactsLoadingSkeleton() {
  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-3 bg-gray-50 rounded w-1/4" />
            </div>
            <div className="h-5 bg-gray-100 rounded w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
