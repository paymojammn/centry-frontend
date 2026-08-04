/**
 * Expenses Page - Petty Cash Management
 *
 * Uses the consistent Paymoja design system.
 */

'use client';

import { useState, useEffect } from 'react';
import { useExpenses, useExpenseStats, useApproveExpense, usePaymentRequestStats } from '@/hooks/use-expenses';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Receipt,
  Plus,
  DollarSign,
  Clock,
  CheckCircle2,
  Search,
  RefreshCw,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Loader2,
  CreditCard,
  Pencil,
  Upload,
  Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ExpenseFilters, Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import { EXPENSE_CATEGORIES } from '@/types/expense';
import CreateExpenseModal from '@/components/expenses/CreateExpenseModal';
import PayExpensesModal from '@/components/expenses/PayExpensesModal';
import PaymentApprovalQueue from '@/components/expenses/PaymentApprovalQueue';
import EditExpenseModal from '@/components/expenses/EditExpenseModal';
import ExpenseDetailModal from '@/components/expenses/ExpenseDetailModal';
import { PageHeader } from '@/components/layout/page-header';
import { StatsBar } from '@/components/layout/stats-bar';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';
import { EmptyState } from '@/components/layout/empty-state';
import { STATUS_COLORS, getStatusColor } from '@/lib/theme';
import { StatusBadge } from '@/components/layout/status-badge';

export default function ExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Expense[]>([]);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [expenseToView, setExpenseToView] = useState<Expense | null>(null);
  const [activeView, setActiveView] = useState<'expenses' | 'payment-queue'>('expenses');

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Include organization in filters for API query
  const expenseFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined,
  };

  const { data: expensesResponse, isLoading, error, refetch } = useExpenses(expenseFilters);
  const { data: stats } = useExpenseStats(selectedOrganizationId || undefined);
  const { data: paymentRequestStats } = usePaymentRequestStats(selectedOrganizationId || undefined);

  // Handle both array format and paginated format { results: [] }
  const expenses = Array.isArray(expensesResponse)
    ? expensesResponse
    : (expensesResponse as any)?.results || [];

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

  // Filter expenses by search query
  const filteredExpenses = expenses?.filter((expense: Expense) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      expense.description?.toLowerCase().includes(query) ||
      expense.employee_name?.toLowerCase().includes(query) ||
      expense.category?.toLowerCase().includes(query)
    );
  });

  // Filter by status tab
  const displayExpenses = filters.status === 'all'
    ? filteredExpenses
    : filteredExpenses?.filter((expense: Expense) => expense.status === filters.status);

  const handleRefresh = () => {
    refetch();
  };

  if (orgsLoading) {
    return <LoadingState fullPage />;
  }

  // Stats bar data
  const statsBarData = [
    {
      label: 'Manager Review',
      value: stats?.pending_manager_approval || 0,
      color: getStatusColor('pending_manager_approval').bg,
    },
    {
      label: 'Finance Review',
      value: stats?.pending_finance_approval || 0,
      color: getStatusColor('pending_finance_approval').bg,
    },
    {
      label: 'Awaiting Receipts',
      value: stats?.awaiting_receipts || 0,
      color: getStatusColor('manager_approved').bg,
    },
    {
      label: 'Approved',
      value: stats?.approved || 0,
      color: getStatusColor('approved').bg,
    },
    {
      label: 'Paid',
      value: stats?.paid || 0,
      color: STATUS_COLORS.paid.bg,
    },
  ];

  // Tab options for filtering
  const tabOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending_manager_approval', label: 'Manager' },
    { value: 'pending_finance_approval', label: 'Finance' },
    { value: 'manager_approved', label: 'Receipts' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Expenses"
        subtitle="Manage petty cash and employee reimbursements"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          <button
            onClick={() => setActiveView('expenses')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              activeView === 'expenses'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Receipt className="h-3.5 w-3.5 inline mr-1.5" />
            Expenses
          </button>
          <button
            onClick={() => setActiveView('payment-queue')}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors relative ${
              activeView === 'payment-queue'
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <CreditCard className="h-3.5 w-3.5 inline mr-1.5" />
            Payment Queue
            {paymentRequestStats?.pending?.count && paymentRequestStats.pending.count > 0 && (
              <span className="absolute -top-1 -right-1 bg-destructive text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                {paymentRequestStats.pending.count}
              </span>
            )}
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-8 text-muted-foreground hover:text-foreground btn-press"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
        {activeView === 'expenses' && (
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-8 bg-primary hover:bg-primary/90 text-white btn-press"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            New Expense
          </Button>
        )}
      </PageHeader>

      <StatsBar stats={statsBarData} />

      <PageContainer>
        {activeView === 'expenses' ? (
          <div className="space-y-4 animate-fade-in-up">
            {/* Tabs and Filters */}
            <div className="bg-card rounded-xl border border-border shadow-sm">
              <div className="px-4 py-3 border-b border-border">
                <div className="flex items-center justify-between gap-4">
                  {/* Tabs */}
                  <div className="flex items-center gap-1">
                    {tabOptions.map((tab) => (
                      <button
                        key={tab.value}
                        onClick={() => setFilters((prev) => ({ ...prev, status: tab.value as ExpenseStatus | 'all' }))}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition-colors btn-press ${
                          filters.status === tab.value
                            ? 'bg-primary text-white'
                            : 'text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Search */}
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Search expenses..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 h-8 bg-muted border-border text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Expenses Table */}
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : error ? (
                <EmptyState
                  icon={Receipt}
                  title="Error Loading Expenses"
                  description={(error as any).message}
                />
              ) : !displayExpenses || displayExpenses.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="No Expenses Found"
                  description={searchQuery ? 'Try adjusting your search criteria' : 'There are no expenses to display'}
                  action={
                    <Button
                      onClick={() => setIsCreateModalOpen(true)}
                      size="sm"
                      className="bg-primary text-white hover:bg-primary/90 btn-press"
                    >
                      <Plus className="w-4 h-4 mr-1.5" />
                      Create Expense
                    </Button>
                  }
                />
              ) : (
                <ExpensesTable
                  expenses={displayExpenses}
                  selectedExpenses={selectedExpenses}
                  onSelectExpenses={setSelectedExpenses}
                  onRefresh={handleRefresh}
                  onViewExpense={(expense) => {
                    setExpenseToView(expense);
                    setIsViewModalOpen(true);
                  }}
                  onEditExpense={(expense) => {
                    setExpenseToEdit(expense);
                    setIsEditModalOpen(true);
                  }}
                />
              )}
            </div>
          </div>
        ) : (
          <PaymentApprovalQueue
            organizationId={selectedOrganizationId || undefined}
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.primary_currency || organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />
        )}
      </PageContainer>

      {/* Floating Pay Button */}
      {activeView === 'expenses' && selectedExpenses.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsPayModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white shadow-lg px-6 py-5 text-sm rounded-lg"
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Pay {selectedExpenses.length} Expense{selectedExpenses.length > 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {/* Modals */}
      {selectedOrganizationId && (
        <>
          <CreateExpenseModal
            isOpen={isCreateModalOpen}
            onClose={() => setIsCreateModalOpen(false)}
            organizationId={selectedOrganizationId}
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.primary_currency || organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />

          <PayExpensesModal
            isOpen={isPayModalOpen}
            onClose={() => {
              setIsPayModalOpen(false);
              setSelectedExpenses([]);
            }}
            expenses={selectedExpenses}
            organizationId={selectedOrganizationId}
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.primary_currency || organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />

          <EditExpenseModal
            isOpen={isEditModalOpen}
            onClose={() => {
              setIsEditModalOpen(false);
              setExpenseToEdit(null);
              handleRefresh();
            }}
            expense={expenseToEdit}
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.primary_currency || organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />

          <ExpenseDetailModal
            isOpen={isViewModalOpen}
            onClose={() => {
              setIsViewModalOpen(false);
              setExpenseToView(null);
            }}
            expense={expenseToView}
            onEdit={() => {
              setExpenseToEdit(expenseToView);
              setIsEditModalOpen(true);
            }}
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.primary_currency || organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />
        </>
      )}
    </div>
  );
}

// Expenses Table Component
interface ExpensesTableProps {
  expenses: Expense[];
  selectedExpenses: Expense[];
  onSelectExpenses: (expenses: Expense[]) => void;
  onRefresh: () => void;
  onViewExpense: (expense: Expense) => void;
  onEditExpense: (expense: Expense) => void;
}

function ExpensesTable({ expenses, selectedExpenses, onSelectExpenses, onRefresh, onViewExpense, onEditExpense }: ExpensesTableProps) {
  const { mutate: approveExpense, isPending: isApproving } = useApproveExpense();

  // Handle approve/reject actions
  const handleApprove = (expenseId: string) => {
    approveExpense(
      { expense_id: expenseId, approved: true },
      { onSuccess: onRefresh }
    );
  };

  const handleReject = (expenseId: string, reason?: string) => {
    approveExpense(
      { expense_id: expenseId, approved: false, rejection_reason: reason || 'Rejected by approver' },
      { onSuccess: onRefresh }
    );
  };

  // Approved, manager_approved (pay before receipts), and partially paid expenses can be selected
  const payableExpenses = expenses.filter(
    (expense) =>
      (expense.status === 'approved' || expense.status === 'manager_approved') &&
      (expense.payment_status === 'unpaid' || expense.payment_status === 'partial')
  );

  const isExpenseSelected = (expense: Expense) => {
    return selectedExpenses.some((e) => e.id === expense.id);
  };

  const canSelectExpense = (expense: Expense) => {
    return (
      (expense.status === 'approved' || expense.status === 'manager_approved') &&
      (expense.payment_status === 'unpaid' || expense.payment_status === 'partial')
    );
  };

  const toggleExpenseSelection = (expense: Expense) => {
    if (!canSelectExpense(expense)) return;

    if (isExpenseSelected(expense)) {
      onSelectExpenses(selectedExpenses.filter((e) => e.id !== expense.id));
    } else {
      onSelectExpenses([...selectedExpenses, expense]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedExpenses.length === payableExpenses.length) {
      onSelectExpenses([]);
    } else {
      onSelectExpenses(payableExpenses);
    }
  };

  const getCategoryInfo = (category: ExpenseCategory) => {
    return EXPENSE_CATEGORIES.find((c) => c.value === category) || EXPENSE_CATEGORIES[EXPENSE_CATEGORIES.length - 1];
  };

  // Check if expense can be edited/have receipts uploaded
  const canEditExpense = (expense: Expense) => {
    return (
      expense.status === 'draft' ||
      expense.status === 'rejected' ||
      expense.status === 'manager_approved'
    );
  };

  const getStatusBadge = (status: ExpenseStatus) => {
    const colors = getStatusColor(status);
    return colors;
  };

  const formatStatusLabel = (status: ExpenseStatus): string => {
    const labels: Record<ExpenseStatus, string> = {
      draft: 'Draft',
      submitted: 'Submitted',
      pending_manager_approval: 'Pending Manager',
      manager_approved: 'Manager Approved',
      pending_finance_approval: 'Pending Finance',
      approved: 'Approved',
      rejected: 'Rejected',
      cancelled: 'Cancelled',
    };
    return labels[status] || status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="overflow-x-auto">
      <table className="table-professional w-full">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left w-10">
              {payableExpenses.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedExpenses.length === payableExpenses.length && payableExpenses.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
                />
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Employee
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Payment
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="animate-stagger">
          {expenses.map((expense) => {
            const categoryInfo = getCategoryInfo(expense.category);
            const statusColors = getStatusBadge(expense.status);

            return (
              <tr
                key={expense.id}
                className={`row-interactive ${
                  isExpenseSelected(expense) ? 'bg-primary/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  {canSelectExpense(expense) && (
                    <input
                      type="checkbox"
                      checked={isExpenseSelected(expense)}
                      onChange={() => toggleExpenseSelection(expense)}
                      className="w-4 h-4 text-primary bg-muted border-border rounded focus:ring-primary focus:ring-2 cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-foreground">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-foreground">{expense.employee_name}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[150px]">{expense.employee_email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{categoryInfo.icon}</span>
                    <span className="text-sm text-foreground">{categoryInfo.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-foreground max-w-[200px] truncate">{expense.description}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-foreground">
                    {expense.currency} {parseFloat(expense.amount).toLocaleString()}
                  </div>
                  {expense.payment_status === 'partial' && expense.remaining_amount && (
                    <div className="text-xs text-amber-600">
                      Remaining: {expense.currency} {parseFloat(expense.remaining_amount).toLocaleString()}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge status={expense.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <StatusBadge
                    status={
                      expense.payment_status === 'paid' ? 'paid' :
                      expense.payment_status === 'partial' ? 'warning' :
                      expense.payment_status === 'processing' ? 'processing' : 'pending'
                    }
                    label={
                      expense.payment_status === 'paid' ? 'Paid' :
                      expense.payment_status === 'partial' ? 'Partial' :
                      expense.payment_status === 'processing' ? 'Processing' : 'Unpaid'
                    }
                  />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    {/* View button */}
                    <Button
                      onClick={() => onViewExpense(expense)}
                      size="sm"
                      variant="outline"
                      className="h-7 px-2 text-muted-foreground hover:text-foreground border-border"
                      title="View Details"
                    >
                      <Eye className="h-3 w-3" />
                    </Button>

                    {/* Edit/Upload Receipts button */}
                    {canEditExpense(expense) && (
                      <Button
                        onClick={() => onEditExpense(expense)}
                        size="sm"
                        variant="outline"
                        className="h-7 px-2 text-muted-foreground hover:text-foreground border-border"
                        title={expense.status === 'manager_approved' ? 'Upload Receipts' : 'Edit'}
                      >
                        {expense.status === 'manager_approved' ? (
                          <Upload className="h-3 w-3" />
                        ) : (
                          <Pencil className="h-3 w-3" />
                        )}
                      </Button>
                    )}

                    {/* Approve/Reject buttons */}
                    {(expense.status === 'pending_manager_approval' || expense.status === 'pending_finance_approval') && (
                      <>
                        <Button
                          onClick={() => handleApprove(expense.id)}
                          disabled={isApproving}
                          size="sm"
                          className="h-7 px-2 bg-primary hover:bg-primary/90 text-white"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          onClick={() => handleReject(expense.id)}
                          disabled={isApproving}
                          size="sm"
                          variant="destructive"
                          className="h-7 px-2"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
