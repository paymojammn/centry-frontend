'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { contactsApi, type Contact, type ContactsFilters } from '@/lib/contacts-api';
import { useSyncContacts, useERPConnections } from '@/hooks/use-erp';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Phone, Mail, Building2, Users, RefreshCw, Upload } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ContactImportDialog } from '@/components/contact-import-dialog';

export default function VendorsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [filters, setFilters] = useState<ContactsFilters>({
    search: '',
  });

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Add organization to filters
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

  const { mutate: syncContacts, isPending: isSyncing } = useSyncContacts();
  const { data: erpConnectionsResponse } = useERPConnections();

  // Extract connections from paginated response or array
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as any)?.results || [];

  // Find active connection for selected organization
  const activeConnection = erpConnections?.find(
    (c: any) => c.is_active && c.organization_id === selectedOrganizationId
  );
  const activeConnectionId = activeConnection?.id;

  // Debug logging
  if (error) {
    console.error('Contacts API Error:', error);
  }
  if (contactsData) {
    console.log('Contacts Data:', contactsData);
  }

  const { data: stats } = useQuery({
    queryKey: ['contact-stats', selectedOrganizationId],
    queryFn: () => contactsApi.getContactStats(selectedOrganizationId ? { organization: selectedOrganizationId } : {}),
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header with brand gradient background */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div className="text-white">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <Users className="h-8 w-8" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight">Address Book</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Manage your vendors, suppliers, and business contacts
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Organization Selector */}
                <Select
                  value={selectedOrganizationId || undefined}
                  onValueChange={setSelectedOrganizationId}
                  disabled={orgsLoading || !organizations?.length}
                >
                  <SelectTrigger className="w-[280px] bg-white/95 backdrop-blur-sm border-white/20 text-gray-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#638C80]" />
                      <SelectValue placeholder="Select organization..." />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {organizations?.map((org: any) => (
                      <SelectItem key={org.id} value={org.id}>
                        <div className="flex items-center gap-2">
                          <span>{org.name}</span>
                          {org.external_id?.startsWith('xero_') && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                              Xero
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <ContactImportDialog />
                <Button
                  onClick={handleSyncContacts}
                  disabled={isSyncing || !activeConnectionId}
                  className="bg-white/95 backdrop-blur-sm text-[#638C80] hover:bg-white shadow-lg hover:shadow-xl transition-all"
                  size="lg"
                  title={
                    !selectedOrganizationId
                      ? 'Select an organization first'
                      : !activeConnectionId
                        ? 'No ERP connection for this organization'
                        : isSyncing
                          ? 'Syncing contacts...'
                          : 'Sync contacts from Xero'
                  }
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Contacts'}
                </Button>
              </div>
            </div>
          </div>

          {/* Stats Cards with vibrant brand-themed gradients */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-4">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#638C80] to-[#547568] p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Total Contacts</div>
                  <div className="text-4xl font-bold text-white">{stats.total}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-400 to-purple-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Building2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Suppliers</div>
                  <div className="text-4xl font-bold text-white">{stats.suppliers}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-400 to-blue-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Customers</div>
                  <div className="text-4xl font-bold text-white">{stats.customers}</div>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-400 to-green-500 p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer">
                <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                      <Users className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <div className="text-white/80 text-sm font-medium mb-1">Active</div>
                  <div className="text-4xl font-bold text-white">{stats.active}</div>
                </div>
              </div>
            </div>
          )}

          {/* Filters with modern design */}
          <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[#638C80]" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-[#638C80] rounded-xl text-base"
                />
              </div>
              <Select
                value={filters.type || 'all'}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="w-full sm:w-[200px] h-12 border-2 border-gray-200 rounded-xl">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Contacts</SelectItem>
                  <SelectItem value="supplier">Suppliers</SelectItem>
                  <SelectItem value="customer">Customers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading contacts...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-destructive">
                Error loading contacts. Please try again.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contacts Grid */}
        {contactsData && contactsData.results && contactsData.results.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {contactsData.results.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
          </div>
        )}

          {/* Empty State */}
          {contactsData && (!contactsData.results || contactsData.results.length === 0) && (
            <Card>
              <CardContent className="pt-6 text-center py-12">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No contacts found. Try adjusting your filters.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

interface ContactCardProps {
  contact: Contact;
}

function ContactCard({ contact }: ContactCardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/vendors/${contact.id}`);
  };

  // Generate a brand-themed color based on contact name
  const getInitialsColor = (name: string) => {
    const colors = [
      'from-[#638C80] to-[#547568]', // Primary brand
      'from-[#7BA895] to-[#638C80]', // Lighter brand
      'from-[#456050] to-[#3A5043]', // Darker brand
      'from-[#8BA89E] to-[#6D9686]', // Muted brand
      'from-[#5A7C72] to-[#4A6B61]', // Medium brand
      'from-[#729284] to-[#5E7D71]', // Soft brand
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className="group relative bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 cursor-pointer border border-gray-100 overflow-hidden"
      onClick={handleClick}
    >
      {/* Colored top border */}
      <div className={`h-1.5 bg-gradient-to-r ${getInitialsColor(contact.name)}`}></div>

      <div className="p-6">
        {/* Header with Avatar */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`flex-shrink-0 h-14 w-14 rounded-xl bg-gradient-to-br ${getInitialsColor(contact.name)} flex items-center justify-center text-white font-bold text-lg shadow-lg`}>
            {getInitials(contact.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg text-gray-900 truncate group-hover:text-[#638C80] transition-colors">
              {contact.name}
            </h3>
            {contact.organization_name && (
              <p className="text-sm text-gray-500 truncate mt-0.5">
                {contact.organization_name}
              </p>
            )}
            {/* Type Badges */}
            <div className="flex gap-2 mt-2">
              {contact.is_supplier && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#7BA895]/20 text-[#456050]">
                  Supplier
                </span>
              )}
              {contact.is_customer && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#638C80]/20 text-[#3A5043]">
                  Customer
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Contact Details */}
        <div className="space-y-3">
          {/* Phone */}
          {contact.primary_phone && (
            <div className="flex items-center gap-3 text-sm group/item">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#638C80]/10 flex items-center justify-center">
                <Phone className="h-4 w-4 text-[#638C80]" />
              </div>
              <span className="text-gray-700 font-medium group-hover/item:text-[#638C80] transition-colors">
                {contact.primary_phone}
              </span>
            </div>
          )}

          {/* Email */}
          {contact.email_address && (
            <div className="flex items-center gap-3 text-sm group/item">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#7BA895]/10 flex items-center justify-center">
                <Mail className="h-4 w-4 text-[#7BA895]" />
              </div>
              <span className="text-gray-600 truncate group-hover/item:text-[#7BA895] transition-colors">
                {contact.email_address}
              </span>
            </div>
          )}

          {/* Additional Phones */}
          {contact.phones && contact.phones.length > 1 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-medium text-gray-500 mb-2">Additional contacts</p>
              <div className="space-y-2">
                {contact.phones.slice(0, 2).map((phone, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs">
                    <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600 font-medium">
                      {phone.phone_type}
                    </span>
                    <span className="text-gray-600">{phone.phone_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Status */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
            contact.contact_status === 'ACTIVE'
              ? 'bg-[#7BA895]/20 text-[#456050]'
              : 'bg-gray-100 text-gray-800'
          }`}>
            {contact.contact_status}
          </span>
          <div className="text-xs text-gray-400 group-hover:text-[#638C80] transition-colors flex items-center gap-1">
            View details
            <svg className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}
