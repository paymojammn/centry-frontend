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
import {
  useDepartments,
  useCreateDepartment,
  useUpdateDepartment,
  useDeleteDepartment,
} from '@/hooks/use-departments';
import type { Department, CreateDepartmentPayload, UpdateDepartmentPayload } from '@/types/department';
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
  FolderTree,
  Plus,
  Pencil,
  Trash2,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const organizationId = params?.id as string;

  const { data: organization, isLoading: orgLoading } = useOrganization(organizationId);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(organizationId);
  const { data: stats, isLoading: statsLoading } = useOrganizationStats(organizationId);
  const { data: departments, isLoading: departmentsLoading } = useDepartments({ organization_id: organizationId });

  const { mutate: createDepartment, isPending: isCreating } = useCreateDepartment();
  const { mutate: updateDepartment, isPending: isUpdating } = useUpdateDepartment();
  const { mutate: deleteDepartment, isPending: isDeleting } = useDeleteDepartment();

  const [activeTab, setActiveTab] = useState('overview');
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    description: '',
    monthly_budget: '',
    currency: 'UGX',
  });

  const resetDepartmentForm = () => {
    setDepartmentForm({
      name: '',
      code: '',
      description: '',
      monthly_budget: '',
      currency: 'UGX',
    });
    setEditingDepartment(null);
  };

  const openAddDepartment = () => {
    resetDepartmentForm();
    setIsDepartmentModalOpen(true);
  };

  const openEditDepartment = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({
      name: dept.name,
      code: dept.code || '',
      description: dept.description || '',
      monthly_budget: dept.monthly_budget?.toString() || '',
      currency: dept.currency || 'UGX',
    });
    setIsDepartmentModalOpen(true);
  };

  const handleSaveDepartment = () => {
    if (!departmentForm.name.trim()) {
      toast.error('Department name is required');
      return;
    }

    if (editingDepartment) {
      const payload: UpdateDepartmentPayload = {
        name: departmentForm.name,
        code: departmentForm.code || undefined,
        description: departmentForm.description || undefined,
        monthly_budget: departmentForm.monthly_budget ? parseFloat(departmentForm.monthly_budget) : null,
        currency: departmentForm.currency,
      };
      updateDepartment(
        { departmentId: editingDepartment.id, payload },
        {
          onSuccess: () => {
            setIsDepartmentModalOpen(false);
            resetDepartmentForm();
          },
        }
      );
    } else {
      const payload: CreateDepartmentPayload = {
        organization_id: organizationId,
        name: departmentForm.name,
        code: departmentForm.code || undefined,
        description: departmentForm.description || undefined,
        monthly_budget: departmentForm.monthly_budget ? parseFloat(departmentForm.monthly_budget) : null,
        currency: departmentForm.currency,
      };
      createDepartment(payload, {
        onSuccess: () => {
          setIsDepartmentModalOpen(false);
          resetDepartmentForm();
        },
      });
    }
  };

  const handleDeleteDepartment = (deptId: string) => {
    if (confirm('Are you sure you want to delete this department?')) {
      deleteDepartment(deptId);
    }
  };

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
            <div className="h-12 w-12 rounded-lg bg-[#49a034]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#49a034]" />
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
            <DropdownMenuItem className="hover:bg-[#49a034]/10 hover:text-[#49a034]">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-[#49a034]/10 hover:text-[#49a034]">
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
            className="data-[state=active]:bg-[#49a034] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-[#49a034] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Members
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="data-[state=active]:bg-[#49a034] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Departments
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-[#49a034] data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
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
                  <Mail className="h-4 w-4 text-[#49a034]" />
                  Invite New Member
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <Globe className="h-4 w-4 text-[#49a034]" />
                  Connect ERP System
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <TrendingUp className="h-4 w-4 text-[#49a034]" />
                  Import Bank Statement
                </Button>
                <Button variant="outline" className="w-full justify-start" type="button">
                  <Settings className="h-4 w-4 text-[#49a034]" />
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
                            <div className="h-10 w-10 rounded-full bg-[#49a034]/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-[#49a034]">
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
                            member.role === 'admin' ? 'bg-[#49a034]/10 text-[#49a034]' :
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
                              <DropdownMenuItem className="hover:bg-[#49a034]/10 hover:text-[#49a034]">
                                Edit Role
                              </DropdownMenuItem>
                              <DropdownMenuItem className="hover:bg-[#49a034]/10 hover:text-[#49a034]">
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

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-6">
          <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
            <div className="p-6 border-b border-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-black">Departments</h3>
                <p className="text-sm text-gray-600">
                  Manage your organization's departments and teams
                </p>
              </div>
              <Button type="button" onClick={openAddDepartment}>
                <Plus className="h-4 w-4" />
                Add Department
              </Button>
            </div>
            <div className="p-6">
              {departmentsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 w-full bg-gray-100 animate-pulse rounded" />
                  ))}
                </div>
              ) : departments && departments.length > 0 ? (
                <div className="table-professional">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-gray-200">
                        <TableHead className="text-gray-600 font-semibold">Department</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Code</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Manager</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Budget</TableHead>
                        <TableHead className="text-gray-600 font-semibold">Status</TableHead>
                        <TableHead className="text-right text-gray-600 font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {departments.map((dept) => (
                        <TableRow key={dept.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-[#49a034]/10 flex items-center justify-center">
                                <FolderTree className="h-5 w-5 text-[#49a034]" />
                              </div>
                              <div>
                                <div className="font-medium text-black">{dept.name}</div>
                                {dept.description && (
                                  <div className="text-sm text-gray-600 truncate max-w-[200px]">
                                    {dept.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="px-2.5 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                              {dept.code || '-'}
                            </span>
                          </TableCell>
                          <TableCell>
                            {dept.manager_name ? (
                              <div>
                                <div className="text-sm font-medium text-black">{dept.manager_name}</div>
                                <div className="text-xs text-gray-600">{dept.manager_email}</div>
                              </div>
                            ) : (
                              <span className="text-gray-400">Not assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {dept.monthly_budget ? (
                              <span className="font-medium text-black">
                                {dept.currency} {parseFloat(dept.monthly_budget).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                              dept.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                            }`}>
                              {dept.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDepartment(dept)}
                                aria-label="Edit department"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteDepartment(dept.id)}
                                disabled={isDeleting}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label="Delete department"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderTree className="h-12 w-12 text-gray-300 mb-4" />
                  <h3 className="text-lg font-semibold text-black mb-2">No Departments</h3>
                  <p className="text-gray-600 mb-4">Create your first department to organize your team</p>
                  <Button type="button" onClick={openAddDepartment}>
                    <Plus className="h-4 w-4" />
                    Add Department
                  </Button>
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

      {/* Add/Edit Department Modal */}
      <Dialog open={isDepartmentModalOpen} onOpenChange={setIsDepartmentModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingDepartment ? 'Edit Department' : 'Add Department'}</DialogTitle>
            <DialogDescription>
              {editingDepartment
                ? 'Update the department details below.'
                : 'Fill in the details to create a new department.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dept-name">Name *</Label>
              <Input
                id="dept-name"
                placeholder="e.g., Engineering, Finance, HR"
                value={departmentForm.name}
                onChange={(e) => setDepartmentForm({ ...departmentForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-code">Code</Label>
              <Input
                id="dept-code"
                placeholder="e.g., ENG, FIN, HR"
                value={departmentForm.code}
                onChange={(e) => setDepartmentForm({ ...departmentForm, code: e.target.value.toUpperCase() })}
                maxLength={10}
              />
              <p className="text-xs text-gray-500">Short code for the department (auto-generated if empty)</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dept-description">Description</Label>
              <Textarea
                id="dept-description"
                placeholder="Brief description of the department's function"
                value={departmentForm.description}
                onChange={(e) => setDepartmentForm({ ...departmentForm, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dept-budget">Monthly Budget</Label>
                <Input
                  id="dept-budget"
                  type="number"
                  placeholder="0.00"
                  value={departmentForm.monthly_budget}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, monthly_budget: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dept-currency">Currency</Label>
                <Input
                  id="dept-currency"
                  value={departmentForm.currency}
                  onChange={(e) => setDepartmentForm({ ...departmentForm, currency: e.target.value.toUpperCase() })}
                  maxLength={3}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDepartmentModalOpen(false);
                resetDepartmentForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveDepartment}
              disabled={isCreating || isUpdating}
            >
              {isCreating || isUpdating ? 'Saving...' : editingDepartment ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
        <div className="text-[#49a034]">{icon}</div>
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
        {icon && <span className="text-[#49a034]">{icon}</span>}
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
