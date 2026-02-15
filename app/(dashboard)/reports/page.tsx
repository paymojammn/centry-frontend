"use client";

import { useState } from "react";
import { format, subDays, subMonths } from "date-fns";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useReportsDashboard, useFinancialTrends } from "@/hooks/use-reports";
import { useOrganization } from "@/hooks/use-organization";
import { TrendChart } from "@/components/reports/charts/TrendChart";
import { ExportButton } from "@/components/reports/export/ExportButton";
import Link from "next/link";

export default function ReportsPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  
  const [dateRange, setDateRange] = useState("30");
  
  const { data: dashboardStats, isLoading: isLoadingDashboard } = useReportsDashboard(organizationId);
  const { data: trendsData, isLoading: isLoadingTrends } = useFinancialTrends(organizationId, 6);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatChange = (change: number) => {
    const isPositive = change >= 0;
    return (
      <span className={isPositive ? "text-primary" : "text-destructive"}>
        {isPositive ? <ArrowUpRight className="inline h-4 w-4" /> : <ArrowDownRight className="inline h-4 w-4" />}
        {Math.abs(change)}%
      </span>
    );
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

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of your financial data and analytics
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <ExportButton 
            organizationId={organizationId} 
            reportType="financial"
            startDate={format(subDays(new Date(), parseInt(dateRange)), "yyyy-MM-dd")}
            endDate={format(new Date(), "yyyy-MM-dd")}
          />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Expenses Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingDashboard ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.expenses.total || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatChange(dashboardStats?.expenses.change || 0)} from last period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Income Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Inflows</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingDashboard ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.transactions.credits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total credits this period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Outflows Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Outflows</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingDashboard ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.transactions.debits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total debits this period
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Net Flow Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingDashboard ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(dashboardStats?.transactions.net_flow || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatChange(dashboardStats?.transactions.change || 0)} from last period
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Trends Chart */}
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
            <TrendChart data={trendsData?.trends || []} title="Financial Trends" />
          )}
        </div>

        {/* Quick Links */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Access</CardTitle>
            <CardDescription>Navigate to detailed reports</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Link href="/reports/financial" className="block">
              <Button variant="outline" className="w-full justify-start">
                <DollarSign className="mr-2 h-4 w-4" />
                Financial Overview
              </Button>
            </Link>
            <Link href="/reports/expenses" className="block">
              <Button variant="outline" className="w-full justify-start">
                <TrendingDown className="mr-2 h-4 w-4" />
                Expense Analytics
              </Button>
            </Link>
            <Link href="/reports/transactions" className="block">
              <Button variant="outline" className="w-full justify-start">
                <BarChart3 className="mr-2 h-4 w-4" />
                Transaction Reports
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
