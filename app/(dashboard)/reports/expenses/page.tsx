"use client";

import { useState, useEffect } from "react";
import { format, subMonths } from "date-fns";
import { Calendar, DollarSign, FileText, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useExpenseReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";
import { PageHeader } from "@/components/layout/page-header";
import { ExpensePieChart } from "@/components/reports/charts/ExpensePieChart";
import { ExportButton } from "@/components/reports/export/ExportButton";

export default function ExpenseReportsPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [months, setMonths] = useState("3");

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  
  const startDate = format(subMonths(new Date(), parseInt(months)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");
  
  const { data: expenseReport, isLoading } = useExpenseReport(
    organizationId ? { organization: organizationId, start_date: startDate, end_date: endDate } : undefined
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expense Analytics"
        subtitle="Detailed breakdown of your expenses"
        breadcrumbs={[
          { label: "Reports", href: "/reports" },
          { label: "Expense Analytics" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={months} onValueChange={setMonths}>
          <SelectTrigger className="w-[160px] h-9">
            <Calendar className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Period" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Last month</SelectItem>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last year</SelectItem>
          </SelectContent>
        </Select>
        {organizationId && (
          <ExportButton
            organizationId={organizationId}
            reportType="expenses"
            startDate={startDate}
            endDate={endDate}
          />
        )}
      </PageHeader>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6">

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(expenseReport?.summary.total_amount || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bill Count</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {expenseReport?.summary.count || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Bill</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {formatCurrency(expenseReport?.summary.avg_amount || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">
                {expenseReport?.by_vendor.length || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-2">
        {isLoading ? (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Expenses by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Vendors</CardTitle>
              </CardHeader>
              <CardContent>
                <Skeleton className="h-[300px] w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <ExpensePieChart
              data={expenseReport?.summary.by_status || []}
              dataKey="status"
              title="Expenses by Status"
            />
            <ExpensePieChart
              data={expenseReport?.by_vendor.slice(0, 8) || []}
              dataKey="vendor"
              title="Top Vendors"
            />
          </>
        )}
      </div>

      {/* Vendor Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expenses by Vendor</CardTitle>
          <CardDescription>Breakdown of expenses per vendor</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {expenseReport?.by_vendor.map((vendor) => (
                <div key={vendor.vendor__id || "unknown"} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{vendor.vendor__name || "Unknown Vendor"}</p>
                    <p className="text-sm text-muted-foreground">{vendor.count} bills</p>
                  </div>
                  <p className="font-bold">{formatCurrency(vendor.total)}</p>
                </div>
              ))}
              {(!expenseReport?.by_vendor || expenseReport.by_vendor.length === 0) && (
                <p className="text-center text-muted-foreground py-4">No expense data available</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
