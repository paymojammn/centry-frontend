"use client";

import { useState } from "react";
import { format, subMonths } from "date-fns";
import { ArrowDownRight, ArrowUpRight, Calendar, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useTransactionReport, useCashFlow } from "@/hooks/use-reports";
import { useOrganization } from "@/hooks/use-organization";
import { CashFlowChart } from "@/components/reports/charts/CashFlowChart";
import { ExportButton } from "@/components/reports/export/ExportButton";

export default function TransactionReportsPage() {
  const { currentOrganization } = useOrganization();
  const organizationId = currentOrganization?.id;
  
  const [months, setMonths] = useState("6");
  
  const startDate = format(subMonths(new Date(), parseInt(months)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");
  
  const filters = organizationId ? { organization: organizationId, start_date: startDate, end_date: endDate } : undefined;
  
  const { data: transactionReport, isLoading: isLoadingReport } = useTransactionReport(filters);
  const { data: cashFlowData, isLoading: isLoadingCashFlow } = useCashFlow(filters);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
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

  const totalTransactions = (transactionReport?.summary.credit_count || 0) + (transactionReport?.summary.debit_count || 0);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Transaction Reports</h1>
          <p className="text-muted-foreground">
            Bank transaction analysis and cash flow
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
            reportType="transactions"
            startDate={startDate}
            endDate={endDate}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Inflows</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(transactionReport?.summary.total_credits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {transactionReport?.summary.credit_count || 0} transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outflows</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <>
                <div className="text-2xl font-bold text-red-600">
                  {formatCurrency(transactionReport?.summary.total_debits || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {transactionReport?.summary.debit_count || 0} transactions
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className={(transactionReport?.summary.net_flow || 0) >= 0 ? "text-2xl font-bold text-green-600" : "text-2xl font-bold text-red-600"}>
                {formatCurrency(transactionReport?.summary.net_flow || 0)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoadingReport ? (
              <Skeleton className="h-8 w-32" />
            ) : (
              <div className="text-2xl font-bold">{totalTransactions}</div>
            )}
          </CardContent>
        </Card>
      </div>

      {isLoadingCashFlow ? (
        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      ) : (
        <CashFlowChart data={cashFlowData?.cash_flow || []} title="Cash Flow Over Time" />
      )}

      <Card>
        <CardHeader>
          <CardTitle>Monthly Breakdown</CardTitle>
          <CardDescription>Cash flow by month</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingCashFlow ? (
            <div className="space-y-2">
              {[1,2,3,4,5].map((i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : cashFlowData?.cash_flow && cashFlowData.cash_flow.length > 0 ? (
            <div className="space-y-4">
              {cashFlowData.cash_flow.map((month) => (
                <div key={month.period} className="flex items-center justify-between border-b pb-2">
                  <div>
                    <p className="font-medium">{format(new Date(month.period), "MMMM yyyy")}</p>
                  </div>
                  <div className="flex gap-8 text-right">
                    <div>
                      <p className="text-sm text-muted-foreground">Inflows</p>
                      <p className="font-medium text-green-600">{formatCurrency(month.credits)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Outflows</p>
                      <p className="font-medium text-red-600">{formatCurrency(month.debits)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Net</p>
                      <p className={month.net >= 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>
                        {formatCurrency(month.net)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No transaction data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
