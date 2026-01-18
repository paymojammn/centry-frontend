/**
 * Expenses Page - Petty Cash Management
 *
 * Uses the consistent Centry design system.
 */

'use client';

import { useState, useEffect } from 'react';
import { useExpenses, useExpenseStats, useApproveExpense } from '@/hooks/use-expenses';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { ExpenseFilters, Expense, ExpenseCategory, ExpenseStatus } from '@/types/expense';
import { EXPENSE_CATEGORIES } from '@/types/expense';
import CreateExpenseModal from '@/components/expenses/CreateExpenseModal';
import PayExpensesModal from '@/components/expenses/PayExpensesModal';
import { PageHeader } from '@/components/layout/page-header';
import { StatsBar } from '@/components/layout/stats-bar';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';
import { EmptyState } from '@/components/layout/empty-state';
import { STATUS_COLORS } from '@/lib/theme';

// Expense status colors matching the design system
const EXPENSE_STATUS_COLORS = {
  pending_manager_approval: { bg: '#fed652', text: '#7a5c00', light: '#FFF9E5' },
  pending_finance_approval: { bg: '#9b59b6', text: '#ffffff', light: '#F3E8F7' },
  manager_approved: { bg: '#4E97D1', text: '#ffffff', light: '#E8F2FA' },
  approved: { bg: '#49a034', text: '#ffffff', light: '#E8F5E5' },
  rejected: { bg: '#dc2626', text: '#ffffff', light: '#FEE2E2' },
  draft: { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7' },
  submitted: { bg: '#4E97D1', text: '#ffffff', light: '#E8F2FA' },
  cancelled: { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7' },
} as const;

export default function ExpensesPage() {
  const [filters, setFilters] = useState<ExpenseFilters>({ status: 'all' });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<Expense[]>([]);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Include organization in filters for API query
  const expenseFilters = {
    ...filters,
    organization: selectedOrganizationId || undefined,
  };

  const { data: expensesResponse, isLoading, error, refetch } = useExpenses(expenseFilters);
  const { data: stats } = useExpenseStats(selectedOrganizationId || undefined);

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
      color: EXPENSE_STATUS_COLORS.pending_manager_approval.bg,
    },
    {
      label: 'Finance Review',
      value: stats?.pending_finance_approval || 0,
      color: EXPENSE_STATUS_COLORS.pending_finance_approval.bg,
    },
    {
      label: 'Awaiting Receipts',
      value: stats?.awaiting_receipts || 0,
      color: EXPENSE_STATUS_COLORS.manager_approved.bg,
    },
    {
      label: 'Approved',
      value: stats?.approved || 0,
      color: EXPENSE_STATUS_COLORS.approved.bg,
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
    <div className="min-h-screen bg-[#f8f9fa]">
      <PageHeader
        title="Expenses"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          className="h-8 text-gray-600 hover:text-gray-900"
        >
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
          Refresh
        </Button>
        <Button
          size="sm"
          onClick={() => setIsCreateModalOpen(true)}
          className="h-8 bg-[#638C80] hover:bg-[#547568] text-white"
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          New Expense
        </Button>
      </PageHeader>

      <StatsBar stats={statsBarData} />

      <PageContainer>
        <div className="space-y-4">
          {/* Tabs and Filters */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between gap-4">
                {/* Tabs */}
                <div className="flex items-center gap-1">
                  {tabOptions.map((tab) => (
                    <button
                      key={tab.value}
                      onClick={() => setFilters((prev) => ({ ...prev, status: tab.value as ExpenseStatus | 'all' }))}
                      className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                        filters.status === tab.value
                          ? 'bg-[#638C80] text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search expenses..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 bg-gray-50 border-gray-200 text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Expenses Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
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
                    className="bg-[#638C80] text-white hover:bg-[#547568]"
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
              />
            )}
          </div>
        </div>
      </PageContainer>

      {/* Floating Pay Button */}
      {selectedExpenses.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={() => setIsPayModalOpen(true)}
            className="bg-[#638C80] hover:bg-[#547568] text-white shadow-lg px-6 py-5 text-sm rounded-lg"
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
            currency={organizations?.find((org: any) => org.id === selectedOrganizationId)?.currency || 'UGX'}
          />

          <PayExpensesModal
            isOpen={isPayModalOpen}
            onClose={() => {
              setIsPayModalOpen(false);
              setSelectedExpenses([]);
            }}
            expenses={selectedExpenses}
            organizationId={selectedOrganizationId}
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
}

function ExpensesTable({ expenses, selectedExpenses, onSelectExpenses, onRefresh }: ExpensesTableProps) {
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

  // Only approved and unpaid expenses can be selected for payment
  const payableExpenses = expenses.filter(
    (expense) => expense.status === 'approved' && expense.payment_status === 'unpaid'
  );

  const isExpenseSelected = (expense: Expense) => {
    return selectedExpenses.some((e) => e.id === expense.id);
  };

  const canSelectExpense = (expense: Expense) => {
    return expense.status === 'approved' && expense.payment_status === 'unpaid';
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

  const getStatusBadge = (status: ExpenseStatus) => {
    const colors = EXPENSE_STATUS_COLORS[status] || { bg: '#bec3c6', text: '#4a5568', light: '#F5F6F7' };
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
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            <th className="px-4 py-3 text-left w-10">
              {payableExpenses.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedExpenses.length === payableExpenses.length && payableExpenses.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 text-[#638C80] bg-gray-100 border-gray-300 rounded focus:ring-[#638C80] focus:ring-2 cursor-pointer"
                />
              )}
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Date
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Employee
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Description
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Amount
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Payment
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {expenses.map((expense) => {
            const categoryInfo = getCategoryInfo(expense.category);
            const statusColors = getStatusBadge(expense.status);

            return (
              <tr
                key={expense.id}
                className={`hover:bg-gray-50 transition-colors ${
                  isExpenseSelected(expense) ? 'bg-[#638C80]/5' : ''
                }`}
              >
                <td className="px-4 py-3">
                  {canSelectExpense(expense) && (
                    <input
                      type="checkbox"
                      checked={isExpenseSelected(expense)}
                      onChange={() => toggleExpenseSelection(expense)}
                      className="w-4 h-4 text-[#638C80] bg-gray-100 border-gray-300 rounded focus:ring-[#638C80] focus:ring-2 cursor-pointer"
                    />
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {new Date(expense.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">{expense.employee_name}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[150px]">{expense.employee_email}</div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{categoryInfo.icon}</span>
                    <span className="text-sm text-gray-700">{categoryInfo.label}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm text-gray-900 max-w-[200px] truncate">{expense.description}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {expense.currency} {parseFloat(expense.amount).toLocaleString()}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span
                    className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: statusColors.light,
                      color: statusColors.bg === '#fed652' ? statusColors.text : statusColors.bg,
                    }}
                  >
                    {formatStatusLabel(expense.status)}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {expense.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
                      <CheckCircle2 className="w-3 h-3" />
                      Paid
                    </span>
                  ) : expense.payment_status === 'processing' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                      <Clock className="w-3 h-3" />
                      Processing
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      Unpaid
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-1">
                    {(expense.status === 'pending_manager_approval' || expense.status === 'pending_finance_approval') && (
                      <>
                        <Button
                          onClick={() => handleApprove(expense.id)}
                          disabled={isApproving}
                          size="sm"
                          className="h-7 px-2 bg-green-500 hover:bg-green-600 text-white"
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
