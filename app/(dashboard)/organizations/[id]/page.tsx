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
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { clearOrganizationData, resyncOrganizationData } from '@/lib/organization-api';
import { MembersPanel } from '@/components/organizations/members-panel';

export default function OrganizationDetailsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const organizationId = params?.id as string;

  const { data: organization, isLoading: orgLoading } = useOrganization(organizationId);
  const { data: members } = useOrganizationMembers(organizationId);
  const { data: stats, isLoading: statsLoading } = useOrganizationStats(organizationId);
  const { data: departments, isLoading: departmentsLoading } = useDepartments({ organization_id: organizationId });

  const { mutate: createDepartment, isPending: isCreating } = useCreateDepartment();
  const { mutate: updateDepartment, isPending: isUpdating } = useUpdateDepartment();
  const { mutate: deleteDepartment, isPending: isDeleting } = useDeleteDepartment();

  const [activeTab, setActiveTab] = useState('overview');
  const [isClearDataOpen, setIsClearDataOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isClearing, setIsClearing] = useState(false);
  const [isResyncOpen, setIsResyncOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({
    name: '',
    code: '',
    description: '',
    monthly_budget: '',
    currency: 'UGX',
    manager_id: '',
  });

  const resetDepartmentForm = () => {
    setDepartmentForm({
      name: '',
      code: '',
      description: '',
      monthly_budget: '',
      currency: 'UGX',
      manager_id: '',
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
      manager_id: dept.manager || '',
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
        manager_id: departmentForm.manager_id || null,
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
        manager_id: departmentForm.manager_id || undefined,
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

  const DATA_CATEGORIES = [
    { key: 'members', label: 'Users & Invitations' },
    { key: 'departments', label: 'Departments' },
    { key: 'payments', label: 'Payments' },
    { key: 'banking', label: 'Banking Data' },
    { key: 'expenses', label: 'Expenses' },
    { key: 'reports', label: 'Reports' },
    { key: 'wallet', label: 'Wallet' },
    { key: 'purchases', label: 'Purchases' },
    { key: 'integrations', label: 'ERP Connections' },
    { key: 'checkout', label: 'Checkout' },
    { key: 'approvals', label: 'Approvals' },
  ];

  const allCategoryKeys = DATA_CATEGORIES.map((c) => c.key);
  const allSelected = selectedCategories.length === allCategoryKeys.length;

  const toggleCategory = (key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const toggleAll = () => {
    setSelectedCategories(allSelected ? [] : [...allCategoryKeys]);
  };

  const handleClearData = async () => {
    if (selectedCategories.length === 0) return;
    setIsClearing(true);
    try {
      const result = await clearOrganizationData(organizationId, selectedCategories);
      const total = Object.values(result.cleared).reduce((sum, n) => sum + n, 0);
      toast.success(`Cleared ${total} records`, {
        description: Object.entries(result.cleared)
          .filter(([, count]) => count > 0)
          .map(([cat, count]) => `${cat}: ${count}`)
          .join(', ') || 'No records found in selected categories',
      });
      setIsClearDataOpen(false);
      setSelectedCategories([]);
    } catch (err: any) {
      toast.error('Failed to clear data', {
        description: err.message || 'An error occurred',
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleResync = async () => {
    setIsResyncing(true);
    try {
      const result = await resyncOrganizationData(organizationId);
      const syncedItems = Object.entries(result.results)
        .filter(([, val]) => typeof val === 'number' && val > 0)
        .map(([key, val]) => `${key}: ${val}`)
        .join(', ');
      toast.success(`Synced from ${result.connections_synced} connection(s)`, {
        description: syncedItems || 'No new data found',
      });
      if (result.errors && result.errors.length > 0) {
        toast.warning('Some connections had errors', {
          description: result.errors.map((e) => e.error).join('; '),
        });
      }
      setIsResyncOpen(false);
    } catch (err: any) {
      toast.error('Re-sync failed', {
        description: err.message || 'An error occurred',
      });
    } finally {
      setIsResyncing(false);
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
      <div className="px-6 py-6">
        <div className="bg-card border border-border rounded-lg shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Building2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Organization Not Found</h3>
            <p className="text-muted-foreground">
              The organization you're looking for doesn't exist or you don't have access.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      {/* Header Section */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border px-6 py-3 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-sage/20 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-forest" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">{organization.name}</h1>
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="icon" aria-label="More options">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="border-border shadow-sm">
            <DropdownMenuLabel className="text-foreground font-semibold">Actions</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-muted" />
            <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary">
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem className="hover:bg-primary/10 hover:text-primary">
              <Mail className="mr-2 h-4 w-4" />
              Invite Members
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="px-6 py-6 space-y-6">

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
        <TabsList className="bg-card border border-border p-1 rounded-lg shadow-sm">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="members"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Users
          </TabsTrigger>
          <TabsTrigger
            value="departments"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Departments
          </TabsTrigger>
          <TabsTrigger
            value="settings"
            className="data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md px-4 py-2 transition-all"
          >
            Settings
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Organization Information */}
            <div className="bg-card border border-border rounded-lg shadow-sm">
              <div className="p-6 border-b border-border">
                <h3 className="text-lg font-semibold text-foreground">Organization Information</h3>
                <p className="text-sm text-muted-foreground">Basic details about your organization</p>
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

            {/* Danger Zone */}
            <div className="bg-card border border-destructive/30 rounded-lg shadow-sm">
              <div className="p-6 border-b border-destructive/30">
                <h3 className="text-lg font-semibold text-foreground">Danger Zone</h3>
                <p className="text-sm text-muted-foreground">Irreversible data operations</p>
              </div>
              <div className="px-6 py-6 space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  type="button"
                  onClick={() => setIsResyncOpen(true)}
                  disabled={isResyncing}
                >
                  <RefreshCw className={`h-4 w-4 ${isResyncing ? 'animate-spin' : ''}`} />
                  {isResyncing ? 'Re-syncing...' : 'Re-sync from ERP'}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full justify-start"
                  type="button"
                  onClick={() => setIsClearDataOpen(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Clear Organization Data
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Users Tab — shared panel, same as /organizations/members */}
        <TabsContent value="members" className="mt-6">
          <MembersPanel organizationId={organizationId} organizationName={organization?.name} />
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-6">
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-foreground">Departments</h3>
                <p className="text-sm text-muted-foreground">
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
                    <div key={i} className="h-16 w-full bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : departments && departments.length > 0 ? (
                <div className="table-professional">
                  <table className="table-professional">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-muted-foreground font-semibold">Department</th>
                        <th className="text-muted-foreground font-semibold">Code</th>
                        <th className="text-muted-foreground font-semibold">Manager</th>
                        <th className="text-muted-foreground font-semibold">Budget</th>
                        <th className="text-muted-foreground font-semibold">Status</th>
                        <th className="text-right text-muted-foreground font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departments.map((dept) => (
                        <tr key={dept.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                <FolderTree className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium text-foreground">{dept.name}</div>
                                {dept.description && (
                                  <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                                    {dept.description}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="px-2.5 py-0.5 rounded bg-muted text-foreground text-xs font-medium">
                              {dept.code || '-'}
                            </span>
                          </td>
                          <td>
                            {dept.manager_name ? (
                              <div>
                                <div className="text-sm font-medium text-foreground">{dept.manager_name}</div>
                                <div className="text-xs text-muted-foreground">{dept.manager_email}</div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground/60">Not assigned</span>
                            )}
                          </td>
                          <td>
                            {dept.monthly_budget ? (
                              <span className="font-medium text-foreground">
                                {dept.currency} {parseFloat(dept.monthly_budget).toLocaleString()}
                              </span>
                            ) : (
                              <span className="text-muted-foreground/60">-</span>
                            )}
                          </td>
                          <td>
                            <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${
                              dept.is_active ? 'bg-primary/10 text-primary' : 'bg-muted text-foreground'
                            }`}>
                              {dept.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="text-right">
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
                                className="text-destructive hover:text-destructive hover:bg-destructive/5"
                                aria-label="Delete department"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <FolderTree className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">No Departments</h3>
                  <p className="text-muted-foreground mb-4">Create your first department to organize your team</p>
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
          <div className="bg-card border border-border rounded-lg shadow-sm">
            <div className="p-6 border-b border-border">
              <h3 className="text-lg font-semibold text-foreground">Organization Settings</h3>
              <p className="text-sm text-muted-foreground">Manage your organization's configuration</p>
            </div>
            <div className="p-6">
              <p className="text-muted-foreground">Settings configuration coming soon...</p>
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
              <p className="text-xs text-muted-foreground">Short code for the department (auto-generated if empty)</p>
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
            <div className="space-y-2">
              <Label htmlFor="dept-manager">Manager</Label>
              <Select
                value={departmentForm.manager_id || "none"}
                onValueChange={(value) => setDepartmentForm({ ...departmentForm, manager_id: value === "none" ? "" : value })}
              >
                <SelectTrigger size="lg">
                  <SelectValue placeholder="No manager assigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No manager assigned</SelectItem>
                  {members?.map((member) => (
                    <SelectItem key={member.id} value={member.user}>
                      {member.user_name || member.user_email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      {/* Re-sync from ERP Dialog */}
      <AlertDialog open={isResyncOpen} onOpenChange={setIsResyncOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Re-sync from ERP
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will pull the latest data from your connected ERP systems and override local data.
              Existing records will be updated with fresh data from the ERP.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isResyncing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleResync}
              disabled={isResyncing}
            >
              {isResyncing ? 'Syncing...' : 'Re-sync Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Organization Data Dialog */}
      <AlertDialog open={isClearDataOpen} onOpenChange={(open) => {
        setIsClearDataOpen(open);
        if (!open) setSelectedCategories([]);
      }}>
        <AlertDialogContent className="sm:max-w-[480px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Clear Organization Data
            </AlertDialogTitle>
            <AlertDialogDescription>
              Select the data categories you want to permanently delete. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-3 max-h-[340px] overflow-y-auto">
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
              <Checkbox
                id="select-all"
                checked={allSelected}
                onCheckedChange={toggleAll}
              />
              <label htmlFor="select-all" className="text-sm font-semibold cursor-pointer">
                Select All
              </label>
            </div>
            {DATA_CATEGORIES.map((cat) => (
              <div key={cat.key} className="flex items-center space-x-2">
                <Checkbox
                  id={`cat-${cat.key}`}
                  checked={selectedCategories.includes(cat.key)}
                  onCheckedChange={() => toggleCategory(cat.key)}
                />
                <label htmlFor={`cat-${cat.key}`} className="text-sm cursor-pointer">
                  {cat.label}
                </label>
              </div>
            ))}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isClearing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={selectedCategories.length === 0 || isClearing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearing ? 'Clearing...' : `Clear Selected Data (${selectedCategories.length})`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
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
      <div className="bg-card border border-border rounded-lg shadow-sm p-6 animate-pulse">
        <div className="flex items-center justify-between mb-2">
          <div className="h-4 w-24 bg-muted rounded" />
          <div className="h-4 w-4 bg-muted rounded" />
        </div>
        <div className="h-8 w-16 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-all p-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        <div className="text-primary">{icon}</div>
      </div>
      <div className="text-2xl font-bold text-foreground">{value.toLocaleString()}</div>
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
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {icon && <span className="text-primary">{icon}</span>}
        {label}
      </span>
      <span className="text-sm font-medium text-foreground">{value}</span>
    </div>
  );
}function OrganizationDetailsSkeleton() {
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))] px-6 py-6 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 bg-muted animate-pulse rounded-lg" />
          <div className="space-y-2">
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
          </div>
        </div>
        <div className="h-10 w-10 bg-muted animate-pulse rounded" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card border border-border rounded-lg shadow-sm p-6">
            <div className="h-4 w-24 bg-muted animate-pulse rounded mb-3" />
            <div className="h-8 w-16 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm">
        <div className="p-6 border-b border-border">
          <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 w-full bg-muted animate-pulse rounded" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
