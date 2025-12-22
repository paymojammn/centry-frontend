'use client';

/**
 * Financial Dashboard
 * 
 * Simple overlay showing:
 * - Bills to pay
 * - Payment options (Bank & Mobile Money)
 * - Invoice collections
 * - Bank transaction monitoring
 */

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { usePayables, usePayableStats } from '@/hooks/use-purchases';
import { CreditCard, Smartphone, TrendingUp, TrendingDown, AlertCircle, CheckCircle2 } from 'lucide-react';
import type { Payable } from '@/types/purchases';

// Helper to safely format currency
function formatCurrency(amount: string | number, currencyCode: string): string {
  try {
    // Clean currency code (remove any "CurrencyCode." prefix if present)
    const cleanCurrency = currencyCode.includes('.') 
      ? currencyCode.split('.').pop() || 'USD'
      : currencyCode || 'USD';
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: cleanCurrency,
      minimumFractionDigits: 0,
    }).format(parseFloat(amount.toString()));
  } catch {
    // Fallback to simple format if currency code is invalid
    return `${currencyCode || 'USD'} ${parseFloat(amount.toString()).toLocaleString()}`;
  }
}

export default function DashboardPage() {
  const { data: payables, isLoading: loadingPayables } = usePayables({ status: 'open' });
  const { data: stats, isLoading: loadingStats } = usePayableStats();

  if (loadingPayables || loadingStats) {
    return <DashboardSkeleton />;
  }

  const openBills = payables || [];
  const overdueBills = openBills.filter(bill => {
    if (!bill.due_date) return false;
    return new Date(bill.due_date) < new Date();
  });

  return (
    <div className="space-y-6 p-6 bg-white min-h-screen">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-black">Financial Dashboard</h1>
        <p className="text-muted-foreground mt-1">Manage your bills, expenses, and payments</p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Open Bills"
          value={stats?.total_open || 0}
          amount={stats?.total_open_amount}
          icon={<AlertCircle className="h-4 w-4 text-[#638C80]" />}
          trend="neutral"
        />
        <StatCard
          title="Scheduled"
          value={stats?.total_scheduled || 0}
          icon={<CheckCircle2 className="h-4 w-4 text-[#638C80]" />}
          trend="up"
        />
        <StatCard
          title="Paid"
          value={stats?.total_paid || 0}
          icon={<CheckCircle2 className="h-4 w-4 text-[#638C80]" />}
          trend="up"
        />
        <StatCard
          title="Overdue"
          value={stats?.overdue_count || 0}
          amount={stats?.overdue_amount}
          icon={<AlertCircle className="h-4 w-4 text-red-600" />}
          trend="down"
        />
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Bills to Pay */}
        <Card className="border border-gray-100 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Bills to Pay</CardTitle>
            <CardDescription>
              {openBills.length} open bills • {overdueBills.length} overdue
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {openBills.length === 0 ? (
              <EmptyState message="No bills to pay" />
            ) : (
              openBills.slice(0, 5).map((bill) => (
                <BillItem key={bill.id} bill={bill} />
              ))
            )}
            {openBills.length > 5 && (
              <Button variant="ghost" className="w-full">
                View all {openBills.length} bills
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="border border-gray-100 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Payment Options</CardTitle>
            <CardDescription>Choose how you want to pay</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <PaymentOption
              icon={<CreditCard className="h-5 w-5" />}
              title="Bank Transfer"
              description="Direct transfer from your bank account"
              available={true}
            />
            <PaymentOption
              icon={<Smartphone className="h-5 w-5" />}
              title="MTN Mobile Money"
              description="Pay instantly with MTN MoMo"
              available={true}
            />
            <PaymentOption
              icon={<Smartphone className="h-5 w-5" />}
              title="Airtel Money"
              description="Pay instantly with Airtel Money"
              available={true}
            />
          </CardContent>
        </Card>

        {/* Bank Transactions */}
        <Card className="border border-gray-100 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Bank account activity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <TransactionItem
              type="inflow"
              description="Invoice payment received"
              amount="2,500,000"
              currency="UGX"
              date="Today"
            />
            <TransactionItem
              type="outflow"
              description="Supplier payment"
              amount="1,200,000"
              currency="UGX"
              date="Yesterday"
            />
            <TransactionItem
              type="inflow"
              description="Mobile money collection"
              amount="850,000"
              currency="UGX"
              date="2 days ago"
            />
          </CardContent>
        </Card>

        {/* Invoice Collections */}
        <Card className="border border-gray-100 shadow-sm rounded-lg">
          <CardHeader>
            <CardTitle>Invoice Collections</CardTitle>
            <CardDescription>Payments received via mobile money</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No collections yet</p>
              <p className="text-xs mt-1">Payments from customers will appear here</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Components

function StatCard({ 
  title, 
  value, 
  amount, 
  icon,
}: { 
  title: string; 
  value: number; 
  amount?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
}) {
  return (
    <Card className="bg-white border border-gray-100 shadow-sm hover:shadow-md transition-shadow rounded-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-black">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-black">{value}</div>
        {amount && (
          <p className="text-xs text-muted-foreground mt-1">
            {new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'UGX',
              minimumFractionDigits: 0,
            }).format(parseFloat(amount))}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function BillItem({ bill }: { bill: Payable }) {
  const isOverdue = bill.due_date && new Date(bill.due_date) < new Date();

  return (
    <div className="table-row-hover flex items-center justify-between p-4 bg-white border border-gray-50 rounded-lg transition-all hover:border-gray-100 hover:shadow-sm">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-black">{bill.vendor_name}</p>
          {isOverdue && (
            <Badge variant="destructive" className="text-xs">
              Overdue
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{bill.description || 'No description'}</p>
        {bill.due_date && (
          <p className="text-xs text-muted-foreground mt-1">
            Due: {new Date(bill.due_date).toLocaleDateString()}
          </p>
        )}
      </div>
      <div className="text-right ml-4">
        <p className="font-bold text-black">
          {formatCurrency(bill.amount, bill.currency)}
        </p>
        <div className="flex gap-2 mt-2">
          <Button size="sm" variant="outline" className="text-xs border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            <CreditCard className="h-3 w-3 mr-1" />
            Bank
          </Button>
          <Button size="sm" className="text-xs bg-[#638C80] hover:bg-[#4f7068] text-white shadow-sm hover:shadow transition-all">
            <Smartphone className="h-3 w-3 mr-1" />
            MoMo
          </Button>
        </div>
      </div>
    </div>
  );
}

function PaymentOption({
  icon,
  title,
  description,
  available,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  available: boolean;
}) {
  return (
    <div className="table-row-hover flex items-center gap-4 p-4 bg-white border border-gray-50 rounded-lg transition-all hover:border-gray-100 hover:shadow-sm">
      <div className="flex-shrink-0 w-10 h-10 bg-gray-50 border border-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-[#638C80]">{icon}</div>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-black">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Badge variant={available ? 'success' : 'secondary'} className="border-[rgb(var(--divider-warm))]">
        {available ? 'Available' : 'Coming Soon'}
      </Badge>
    </div>
  );
}

function TransactionItem({
  type,
  description,
  amount,
  currency,
  date,
}: {
  type: 'inflow' | 'outflow';
  description: string;
  amount: string;
  currency: string;
  date: string;
}) {
  return (
    <div className="table-row-hover flex items-center justify-between p-3 border-b border-gray-50 last:border-0 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          type === 'inflow' ? 'bg-[#638C80]/10' : 'bg-red-50'
        }`}>
          {type === 'inflow' ? (
            <TrendingUp className="h-4 w-4 text-[#638C80]" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </div>
        <div>
          <p className="text-sm font-semibold text-black">{description}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <p className={`font-semibold ${
        type === 'inflow' ? 'text-[#638C80]' : 'text-red-600'
      }`}>
        {type === 'inflow' ? '+' : '-'}{' '}
        {formatCurrency(amount, currency)}
      </p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-muted-foreground">
      <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30 text-[#638C80]" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-10 w-64" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="h-96" />
        ))}
      </div>
    </div>
  );
}
