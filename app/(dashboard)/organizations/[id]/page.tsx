/**
 * Organization Details Page
 * Displays comprehensive organization information, members, and statistics
 */

'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
  useOrganization,
  useOrganizationMembers,
  useOrganizationStats,
} from '@/hooks/use-organization';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Building2,
  Users,
  Globe,
  Calendar,
  Settings,
  TrendingUp,
  CreditCard,
  Mail,
  MoreVertical,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const organizationId = params?.id as string;

  const { data: organization, isLoading: orgLoading } = useOrganization(organizationId);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(organizationId);
  const { data: stats, isLoading: statsLoading } = useOrganizationStats(organizationId);

  const [activeTab, setActiveTab] = useState('overview');

  // Handle OAuth callback notifications
  useEffect(() => {
    const xeroAuth = searchParams.get('xero_auth');
    const message = searchParams.get('message');

    if (xeroAuth === 'success') {
      toast.success('Xero Connected Successfully!', {
        description: 'Your organization is now connected to Xero.',
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    } else if (xeroAuth === 'error') {
      toast.error('Xero Connection Failed', {
        description: message || 'There was an error connecting to Xero.',
      });
      // Clean up URL parameters
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [searchParams]);

  if (orgLoading) {
    return <OrganizationDetailsSkeleton />;
  }

  if (!organization) {
    return (
      <div className="container py-8">
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Building2 className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">Organization Not Found</h3>
            <p className="text-gray-600">
              The organization you're looking for doesn't exist or you don't have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header Section */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-[#638C80]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#638C80]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-black">{organization.name}</h1>
              <p className="text-gray-600">@{organization.slug}</p>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-gray-200 shadow-sm">
            <DropdownMenuLabel className="text-black font-semibold">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-gray-100" />
            <DropdownMenuItem className="hover:bg-[#638C80]/10 hover:text-[#638C80]">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#638C80]/10 hover:text-[#638C80]">
              <Mail className="mr-2 h-4 w-4" />
              Invite Members
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Members"
          value={stats?.total_members || 0}
          icon={<Users className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Connections"
          value={stats?.total_connections || 0}
          icon={<Globe className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Bank Imports"
          value={stats?.total_bank_imports || 0}
          icon={<TrendingUp className="h-4 w-4" />}
          loading={statsLoading}
        />
        <StatsCard
          title="Transactions"
          value={stats?.total_transactions || 0}
          icon={<CreditCard className="h-4 w-4" />}
          loading={statsLoading}
        />
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200 p-1 rounded-lg shadow-sm">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-[#638C80] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="members"
            className="data-[state=active]:bg-[#638C80] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Members
          </TabsTrigger>
          <TabsTrigger 
            value="settings"
            className="data-[state=active]:bg-[#638C80] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organization Information */}
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-50">
                <h3 className="text-lg font-semibold text-black">Organization Information</h3>
                <p className="text-sm text-gray-600">Basic details about your organization</p>
              </div>
              <div className="p-6">
                <InfoRow label="Primary Currency" value={organization.primary_currency} />
                <InfoRow
                  label="Supported Currencies"
                  value={organization.supported_currencies.join(', ') || 'None'}
                />
                <InfoRow label="Industry" value={organization.industry || 'Not specified'} />
                <InfoRow
                  label="Company Size"
                  value={organization.company_size || 'Not specified'}
                />
                <InfoRow label="Timezone" value={organization.timezone} />
                <InfoRow
                  label="Created"
                  value={new Date(organization.created_at).toLocaleDateString()}
                  icon={<Calendar className="h-4 w-4" />}
                />
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
              <div className="p-6 border-b border-gray-50">
                <h3 className="text-lg font-semibold text-black">Quick Actions</h3>
                <p className="text-sm text-gray-600">Common tasks and operations</p>
              </div>
              <div className="p-6 space-y-2">
                <Button variant="outline" className="w-full justify-start" type="button">
                  <Mail className="h-4 w-4 text-[#638C80]" />
                  Invite New Member
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <Globe className="h-4 w-4 text-[#638C80]" />
                  Connect ERP System
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <TrendingUp className="h-4 w-4 text-[#638C80]" />
                  Import Bank Statement
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <Settings className="h-4 w-4 text-[#638C80]" />
                  Organization Settings
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black">Team Members</h3>
                <p className="text-sm text-gray-600">
                  Manage your organization's team members and their roles
                </p>
              </div>
              <Button type="button">
                <Mail className="h-4 w-4" />
                Invite Member
              </Button>
            </div>
            <div className="p-6">
              {membersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 w-full bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <div className="table-professional">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="text-gray-600 font-semibold">Member</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Role</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Joined</TableHead>
                        <TableHead className="text-right text-gray-600 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#638C80]/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#638C80]">
                                {member.user_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-black">{member.user_name}</div>
                              <div className="text-sm text-gray-600">
                                {member.user_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                            member.role === 'owner' ? 'bg-red-100 text-red-700' :
                            member.role === 'admin' ? 'bg-[#638C80]/10 text-[#638C80]' :
                            member.role === 'manager' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                            member.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                          }`}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" mode="icon" aria-label="Member actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-gray-200 shadow-sm">
                              <DropdownMenuItem className="hover:bg-[#638C80]/10 hover:text-[#638C80]">
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-[#638C80]/10 hover:text-[#638C80]">
                                View Permissions
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-gray-100" />
                              <DropdownMenuItem className="text-red-600 hover:bg-red-50">
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-gray-300 mb-4" />
                  <p className="text-gray-600">No members found</p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h3 className="text-lg font-semibold text-black">Organization Settings</h3>
              <p className="text-sm text-gray-600">Manage your organization's configuration</p>
            </div>
            <div className="p-6">
              <p className="text-gray-600">Settings configuration coming soon...</p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Helper Components
function StatsCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-lg shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-24 bg-gray-100 rounded" />
          <div className="h-4 w-4 bg-gray-100 rounded" />
        </div>
        <div className="h-8 w-16 bg-gray-100 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <div className="text-[#638C80]">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-black">{value.toLocaleString()}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-600 flex items-center gap-2">
        {icon && <span className="text-[#638C80]">{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-medium text-black">{value}</span>
    </div>
  );
}function OrganizationDetailsSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-gray-100 animate-pulse rounded-lg" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-100 animate-pulse rounded" />
            <div className="h-4 w-32 bg-gray-100 animate-pulse rounded" />
          </div>
        </div>
        <div className="h-10 w-10 bg-gray-100 animate-pulse rounded" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border border-gray-100 rounded-lg shadow-sm p-6">
            <div className="h-4 w-24 bg-gray-100 animate-pulse rounded mb-3" />
            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-50">
          <div className="h-6 w-48 bg-gray-100 animate-pulse rounded" />
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-gray-100 animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
