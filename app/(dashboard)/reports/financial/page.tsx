"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Calendar, DollarSign, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useFinancialOverview, useFinancialTrends, useAccountBalances } from "@/hooks/use-reports";
import { useOrganization } from "@/hooks/use-organization";
import { TrendChart } from "@/components/reports/charts/TrendChart";
import { ExportButton } from "@/components/reports/export/ExportButton";

export default function FinancialOverviewPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  
  const [months, setMonths] = useState("6");
  
  const startDate = format(subMonths(new Date(), parseInt(months)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");
  
  const filters = organizationId ? { organization: organizationId, start_date: startDate, end_date: endDate } : undefined;
  
  const { data: overview, isLoading: isLoadingOverview } = useFinancialOverview(filters);
  const { data: trendsData, isLoading: isLoadingTrends } = useFinancialTrends(organizationId, parseInt(months));
  const { data: balances, isLoading: isLoadingBalances } = useAccountBalances(organizationId);

  const formatCurrency = (value: number, currency: string = "UGX") => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (!organizationId) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Please select an organization to view reports.</p>
        </div>
      </div>
    );
  }

  const expensesPaidPercent = overview?.expenses.total 
    ? Math.round((overview.expenses.paid / overview.expenses.total) * 100) 
    : 0;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground">
            Comprehensive view of your financial position
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Last month</SelectItem>
              <SelectItem value="3">Last 3 months</SelectItem>
              <SelectItem value="6">Last 6 months</SelectItem>
              <SelectItem value="12">Last year</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton 
            organizationId={organizationId} 
            reportType="financial"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            {isLoadingOverview ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-primary">
                {formatCurrency(overview?.income.total || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {isLoadingOverview ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {formatCurrency(overview?.expenses.total || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Position</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOverview ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={(overview?.net_position || 0) >= 0 ? "text-2xl font-bold text-primary" : "text-2xl font-bold text-destructive"}>
                {formatCurrency(overview?.net_position || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingOverview ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={(overview?.cash_flow.net || 0) >= 0 ? "text-2xl font-bold text-primary" : "text-2xl font-bold text-destructive"}>
                {formatCurrency(overview?.cash_flow.net || 0)}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {isLoadingTrends ? (
            <Card>
              <CardHeader>
                <CardTitle>Financial Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[350px] w-full" />
              </CardContent>
            </Card>
          ) : (
            <TrendChart data={trendsData?.trends || []} title="Income vs Expenses" />
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Expense Status</CardTitle>
            <CardDescription>Payment status breakdown</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {isLoadingOverview ? (
              <div className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Paid</span>
                    <span className="font-medium">{formatCurrency(overview?.expenses.paid || 0)}</span>
                  </div>
                  <Progress value={expensesPaidPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground">{expensesPaidPercent}% of total expenses</p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pending</span>
                    <span className="font-medium text-[#D4B35A]">{formatCurrency(overview?.expenses.pending || 0)}</span>
                  </div>
                  <Progress value={100 - expensesPaidPercent} className="h-2 [&>div]:bg-[#D4B35A]" />
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Cash Flow Summary</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inflows</span>
                      <span className="text-primary">{formatCurrency(overview?.cash_flow.inflow || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outflows</span>
                      <span className="text-destructive">{formatCurrency(overview?.cash_flow.outflow || 0)}</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Bank Account Balances
          </CardTitle>
          <CardDescription>Current balances across all accounts</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingBalances ? (
            <div className="space-y-2">
              {[1,2,3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : balances?.accounts && balances.accounts.length > 0 ? (
            <div className="space-y-4">
              {balances.accounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{account.name}</p>
                    <p className="text-sm text-muted-foreground">{account.account_number}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(account.balance, account.currency)}</p>
                    <p className="text-xs text-muted-foreground">{account.currency}</p>
                  </div>
                </div>
              ))}
              
              {balances.totals_by_currency && Object.keys(balances.totals_by_currency).length > 0 && (
                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-2">Total by Currency</h4>
                  <div className="flex flex-wrap gap-4">
                    {Object.entries(balances.totals_by_currency).map(([currency, total]) => (
                      <div key={currency} className="bg-muted px-4 py-2 rounded-md">
                        <p className="text-sm text-muted-foreground">{currency}</p>
                        <p className="font-bold">{formatCurrency(total, currency)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No bank accounts found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
