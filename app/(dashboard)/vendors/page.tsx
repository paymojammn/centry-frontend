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
  UserCheck,
  Package,
  ShoppingCart,
  TrendingUp,
  ArrowUpRight,
  CheckCircle2,
  Archive,
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

// Generate consistent color based on name - Using Centry colors
function getContactColor(name: string): string {
  const colors = [
    'from-[#638C80] to-[#4a6b62]',    // Teal (primary)
    'from-[#4E97D1] to-[#3d7ab0]',    // Blue
    'from-[#49a034] to-[#3a8029]',    // Green
    'from-[#f77f00] to-[#d66d00]',    // Orange
    'from-[#638C80] to-[#49a034]',    // Teal to Green
    'from-[#4E97D1] to-[#638C80]',    // Blue to Teal
    'from-[#49a034] to-[#4E97D1]',    // Green to Blue
    'from-[#f77f00] to-[#fed652]',    // Orange to Mustard
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                <p className="text-sm text-gray-500">
                  Manage vendors, suppliers, and customers
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[220px] bg-white border-gray-200 shadow-sm">
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
                className="bg-[#638C80] border-[#638C80] text-white hover:bg-[#547568] hover:border-[#547568]"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Syncing...' : 'Sync'}
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Contacts - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#638C80] via-[#5a8073] to-[#4a6b62] rounded-2xl p-6 text-white shadow-xl shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Users className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">Total Contacts</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#49a034] text-xs font-medium bg-[#49a034]/20 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {stats.total}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {stats.active} active contacts in your directory
                </p>
              </div>
            </div>

            {/* Suppliers */}
            <StatCard
              icon={Package}
              label="Suppliers"
              value={stats.suppliers.toString()}
              color="blue"
              subtitle="Vendors you pay"
            />

            {/* Customers */}
            <StatCard
              icon={ShoppingCart}
              label="Customers"
              value={stats.customers.toString()}
              color="green"
              subtitle="Who pay you"
            />
          </div>

          {/* Mini Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MiniStatCard
              label="Total Contacts"
              value={stats.total.toString()}
              icon={Users}
              color="teal"
            />
            <MiniStatCard
              label="Suppliers"
              value={stats.suppliers.toString()}
              icon={Package}
              color="blue"
            />
            <MiniStatCard
              label="Customers"
              value={stats.customers.toString()}
              icon={ShoppingCart}
              color="green"
            />
            <MiniStatCard
              label="Active"
              value={stats.active.toString()}
              icon={CheckCircle2}
              color="mustard"
            />
          </div>

          {/* Filters */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search contacts..."
                  value={filters.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-10 bg-white border-gray-200"
                />
              </div>

              <Select value={filters.type || 'all'} onValueChange={handleTypeChange}>
                <SelectTrigger className="w-[180px] h-10 bg-white border-gray-200">
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
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-red-400" />
              </div>
              <p className="text-gray-600 font-medium">Error loading contacts</p>
              <p className="text-gray-400 text-sm mt-1">Please try refreshing the page</p>
            </div>
          ) : !contactsData?.results || contactsData.results.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-gray-600 font-medium">
                {filters.search ? 'No contacts match your search' : 'No contacts found'}
              </p>
              <p className="text-gray-400 text-sm mt-1">
                {filters.search ? 'Try a different search term' : 'Sync with your accounting software to get started'}
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

// Stat Card Component - Using Centry colors
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5',
      icon: 'bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-[#638C80]/30',
      text: 'text-[#638C80]',
      border: 'border-[#638C80]/20',
    },
    blue: {
      bg: 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/5',
      icon: 'bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-[#4E97D1]/30',
      text: 'text-[#4E97D1]',
      border: 'border-[#4E97D1]/20',
    },
    green: {
      bg: 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/5',
      icon: 'bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-[#49a034]/30',
      text: 'text-[#49a034]',
      border: 'border-[#49a034]/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/5',
      icon: 'bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-[#f77f00]/30',
      text: 'text-[#f77f00]',
      border: 'border-[#f77f00]/20',
    },
    mustard: {
      bg: 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/5',
      icon: 'bg-gradient-to-br from-[#fed652] to-[#e6c149] shadow-[#fed652]/30',
      text: 'text-[#d4a843]',
      border: 'border-[#fed652]/20',
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} rounded-2xl p-5 border ${style.border} shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${style.icon} shadow-lg flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${style.text}`}>{value}</div>
      {subtitle && (
        <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
      )}
    </div>
  );
}

// Mini Stat Card Component - Using Centry colors
interface MiniStatCardProps {
  label: string;
  value: string;
  icon: React.ElementType;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
}

function MiniStatCard({ label, value, icon: Icon, color }: MiniStatCardProps) {
  const colorStyles = {
    teal: 'text-[#638C80] bg-[#638C80]/10',
    blue: 'text-[#4E97D1] bg-[#4E97D1]/10',
    green: 'text-[#49a034] bg-[#49a034]/10',
    orange: 'text-[#f77f00] bg-[#f77f00]/10',
    mustard: 'text-[#d4a843] bg-[#fed652]/20',
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${colorStyles[color]} flex items-center justify-center`}>
          <Icon className="h-4 w-4" />
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
    if (contact.is_supplier && contact.is_customer) {
      return 'bg-gradient-to-r from-[#638C80] to-[#4a6b62] text-white';
    }
    if (contact.is_supplier) {
      return 'bg-gradient-to-r from-[#4E97D1] to-[#3d7ab0] text-white';
    }
    if (contact.is_customer) {
      return 'bg-gradient-to-r from-[#49a034] to-[#3a8029] text-white';
    }
    return 'bg-[#bec3c6]/30 text-gray-600';
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-gradient-to-r from-[#49a034] to-[#3a8029] text-white';
      case 'ARCHIVED':
        return 'bg-[#bec3c6]/30 text-gray-600';
      default:
        return 'bg-[#bec3c6]/30 text-gray-600';
    }
  };

  const getTypeIcon = (contact: Contact) => {
    if (contact.is_supplier && contact.is_customer) {
      return <UserCheck className="h-3 w-3" />;
    }
    if (contact.is_supplier) {
      return <Package className="h-3 w-3" />;
    }
    if (contact.is_customer) {
      return <ShoppingCart className="h-3 w-3" />;
    }
    return null;
  };

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
              <th className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              <th className="w-12 py-4 px-4"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contacts.map((contact) => (
              <tr
                key={contact.id}
                className="hover:bg-gray-50/80 transition-all duration-200 cursor-pointer group"
                onClick={() => router.push(`/vendors/${contact.id}`)}
              >
                <td className="py-4 px-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getContactColor(contact.name)} flex items-center justify-center text-white font-semibold text-sm shadow-sm`}>
                      {getContactInitials(contact.name)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm group-hover:text-[#638C80] transition-colors">{contact.name}</div>
                      {contact.organization_name && (
                        <div className="text-xs text-gray-400">{contact.organization_name}</div>
                      )}
                    </div>
                  </div>
                </td>
                <td className="py-4 px-4">
                  <div className="space-y-1">
                    {contact.primary_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                          <Phone className="h-3 w-3 text-gray-500" />
                        </div>
                        {contact.primary_phone}
                      </div>
                    )}
                    {contact.email_address && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <div className="w-6 h-6 rounded-md bg-gray-100 flex items-center justify-center">
                          <Mail className="h-3 w-3 text-gray-500" />
                        </div>
                        <span className="truncate max-w-[200px]">{contact.email_address}</span>
                      </div>
                    )}
                    {!contact.primary_phone && !contact.email_address && (
                      <span className="text-sm text-gray-400">No contact info</span>
                    )}
                  </div>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${getTypeStyle(contact)}`}>
                    {getTypeIcon(contact)}
                    {getTypeLabel(contact)}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${getStatusStyle(contact.contact_status)}`}>
                    {contact.contact_status}
                  </span>
                </td>
                <td className="py-4 px-4">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-[#638C80]/10 transition-colors">
                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-[#638C80] transition-colors" />
                  </div>
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
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-6">
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-200 rounded-xl" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-3 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="h-6 bg-gray-200 rounded-full w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
