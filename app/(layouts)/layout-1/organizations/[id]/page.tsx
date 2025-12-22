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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
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
  ShieldCheck,
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

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
            <button 
              className="h-10 w-10 border border-gray-200 rounded-lg flex items-center justify-center hover:border-[#638C80] hover:bg-[#638C80]/5 transition-all shadow-sm hover:shadow"
              aria-label="More options"
            >
              <MoreVertical className="h-4 w-4 text-gray-600" />
            </button>
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
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organization Information */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Information</CardTitle>
                <CardDescription>Basic details about your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
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
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>Common tasks and operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <Mail className="mr-2 h-4 w-4" />
                  Invite New Member
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Globe className="mr-2 h-4 w-4" />
                  Connect ERP System
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Import Bank Statement
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="mr-2 h-4 w-4" />
                  Organization Settings
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Members Tab */}
        <TabsContent value="members">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    Manage your organization's team members and their roles
                  </CardDescription>
                </div>
                <Button>
                  <Mail className="mr-2 h-4 w-4" />
                  Invite Member
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {membersLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                  ))}
                </div>
              ) : members && members.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarFallback>
                                {member.user_name
                                  .split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium font-inter">{member.user_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {member.user_email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getRoleBadgeVariant(member.role)}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={member.is_active ? 'default' : 'secondary'}>
                            {member.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(member.joined_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>Edit Role</DropdownMenuItem>
                              <DropdownMenuItem>View Permissions</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive">
                                Remove Member
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No members found</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Organization Settings</CardTitle>
              <CardDescription>Manage your organization's configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">Settings configuration coming soon...</p>
            </CardContent>
          </Card>
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
}

function getRoleBadgeVariant(
  role: string
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'owner':
      return 'destructive';
    case 'admin':
      return 'default';
    case 'manager':
      return 'secondary';
    default:
      return 'outline';
  }
}

function OrganizationDetailsSkeleton() {
  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-10 w-10" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="space-y-2 pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
