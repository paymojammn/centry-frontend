/**
 * Vendors/Contacts Page
 *
 * Uses the consistent Centry design system.
 */

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
import { PageHeader } from '@/components/layout/page-header';
import { StatsBar } from '@/components/layout/stats-bar';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';
import { EmptyState } from '@/components/layout/empty-state';
import { getInitials } from '@/lib/theme';

export default function VendorsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [activeConnectionId, setActiveConnectionId] = useState<string | null>(null);
  const [activeProviderName, setActiveProviderName] = useState<string>('ERP');
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
    setActiveProviderName(orgConnection?.provider_app?.provider?.name || 'ERP');
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

  if (orgsLoading) {
    return <LoadingState fullPage />;
  }

  // Stats bar data
  const statsBarData = [
    { label: 'Total', value: stats.total, color: 'rgb(var(--brand-primary))' },
    { label: 'Suppliers', value: stats.suppliers, color: '#6B8FB8' },
    { label: 'Customers', value: stats.customers, color: 'rgb(var(--brand-primary))' },
    { label: 'Active', value: stats.active, color: '#fed652' },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Contacts"
        subtitle="Manage vendors, suppliers, and customers"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <ContactImportDialog />
        <Button
          variant="outline"
          size="sm"
          onClick={handleSyncContacts}
          disabled={isSyncing || !activeConnectionId}
          className="h-8 text-muted-foreground hover:text-foreground btn-press"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Syncing...' : `Sync from ${activeProviderName}`}
        </Button>
      </PageHeader>

      <StatsBar stats={statsBarData} />

      <PageContainer>
        <div className="space-y-4 animate-fade-in-up">
          {/* Filters */}
          <div className="bg-card rounded-xl border border-border/80 shadow-sm px-4 py-3">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-8 bg-muted border-border text-sm"
                />
              </div>

              <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[140px] h-8 bg-muted border-border text-sm">
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
          <div className="bg-card rounded-xl border border-border/80 shadow-sm">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : error ? (
              <EmptyState
                icon={Users}
                title="Error Loading Contacts"
                description="Please try refreshing the page"
              />
            ) : !contactsData?.results || contactsData.results.length === 0 ? (
              <EmptyState
                icon={Users}
                title={filters.search ? 'No contacts match your search' : 'No contacts found'}
                description={filters.search ? 'Try a different search term' : 'Sync with Xero to get started'}
              />
            ) : (
              <ContactsTable contacts={contactsData.results} />
            )}
          </div>
        </div>
      </PageContainer>
    </div>
  );
}

interface ContactsTableProps {
  contacts: Contact[];
}

function ContactsTable({ contacts }: ContactsTableProps) {
  const router = useRouter();

  const getTypeBadge = (contact: Contact) => {
    if (contact.is_supplier && contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
          Both
        </span>
      );
    }
    if (contact.is_supplier) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          <Package className="h-3 w-3" />
          Supplier
        </span>
      );
    }
    if (contact.is_customer) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <ShoppingCart className="h-3 w-3" />
          Customer
        </span>
      );
    }
    return <span className="text-xs text-muted-foreground/60">-</span>;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <CheckCircle className="h-3 w-3" />
          Active
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-muted text-muted-foreground">
        {status}
      </span>
    );
  };

  return (
    <table className="table-professional w-full">
      <thead>
        <tr>
          <th>Contact</th>
          <th>Details</th>
          <th>Type</th>
          <th>Status</th>
          <th className="w-10"></th>
        </tr>
      </thead>
      <tbody className="animate-stagger">
        {contacts.map((contact) => (
          <tr
            key={contact.id}
            className="row-interactive cursor-pointer"
            onClick={() => router.push(`/vendors/${contact.id}`)}
          >
            <td className="py-3 px-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-muted-foreground font-medium text-xs">
                  {getInitials(contact.name)}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{contact.name}</div>
                  {contact.organization_name && (
                    <div className="text-xs text-muted-foreground">{contact.organization_name}</div>
                  )}
                </div>
              </div>
            </td>
            <td className="py-3 px-4">
              <div className="space-y-1">
                {contact.primary_phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3 w-3 text-muted-foreground/60" />
                    {contact.primary_phone}
                  </div>
                )}
                {contact.email_address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3 text-muted-foreground/60" />
                    <span className="truncate max-w-[200px]">{contact.email_address}</span>
                  </div>
                )}
                {!contact.primary_phone && !contact.email_address && (
                  <span className="text-xs text-muted-foreground/60">No contact info</span>
                )}
              </div>
            </td>
            <td className="py-3 px-4">
              {getTypeBadge(contact)}
            </td>
            <td className="py-3 px-4">
              {getStatusBadge(contact.contact_status)}
            </td>
            <td className="py-3 px-3">
              <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
