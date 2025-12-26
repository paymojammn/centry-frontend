"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TrendingUp,
  Database,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  DollarSign,
  ArrowUpFromLine,
} from "lucide-react";
import { useImportStats, useExportStats } from "@/hooks/use-banking";

interface StatsOverviewProps {
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
  mode?: "import" | "export";
}

export function StatsOverview({ dateFrom, dateTo, organizationId, mode = "import" }: StatsOverviewProps) {
  const { data: importStats, isLoading: importLoading, error: importError } = useImportStats({
    date_from: dateFrom,
    date_to: dateTo,
    organizationId,
  });

  const { data: exportStats, isLoading: exportLoading, error: exportError } = useExportStats({
    date_from: dateFrom,
    date_to: dateTo,
    organizationId,
  });

  const isLoading = mode === "import" ? importLoading : exportLoading;
  const error = mode === "import" ? importError : exportError;
  const stats = mode === "import" ? importStats : exportStats;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 rounded-2xl bg-[#f77f00]/10 flex items-center justify-center mx-auto mb-4">
          <XCircle className="h-8 w-8 text-[#f77f00]" />
        </div>
        <p className="text-sm text-gray-600">Failed to load statistics</p>
      </div>
    );
  }

  const statCards = mode === "import" && importStats ? [
    {
      title: "Total Imports",
      value: importStats.total_imports,
      icon: Database,
      gradient: "from-[#638C80] to-[#4a6b62]",
      shadow: "shadow-[#638C80]/20",
    },
    {
      title: "Total Transactions",
      value: importStats.total_transactions,
      icon: TrendingUp,
      gradient: "from-[#4E97D1] to-[#3d7ab0]",
      shadow: "shadow-[#4E97D1]/20",
    },
    {
      title: "Synced",
      value: importStats.synced_transactions,
      icon: CheckCircle,
      gradient: "from-[#49a034] to-[#3a8029]",
      shadow: "shadow-[#49a034]/20",
      subtitle: `${importStats.sync_percentage.toFixed(1)}%`,
    },
    {
      title: "Pending",
      value: importStats.pending_transactions,
      icon: Clock,
      gradient: "from-[#fed652] to-[#e6c149]",
      shadow: "shadow-[#fed652]/20",
      textColor: "text-gray-800",
    },
    {
      title: "Failed",
      value: importStats.failed_transactions,
      icon: XCircle,
      gradient: "from-[#f77f00] to-[#d66d00]",
      shadow: "shadow-[#f77f00]/20",
    },
  ] : exportStats ? [
    {
      title: "Total Exports",
      value: exportStats.total_exports,
      icon: ArrowUpFromLine,
      gradient: "from-[#638C80] to-[#4a6b62]",
      shadow: "shadow-[#638C80]/20",
    },
    {
      title: "Total Payments",
      value: exportStats.total_payments,
      icon: TrendingUp,
      gradient: "from-[#4E97D1] to-[#3d7ab0]",
      shadow: "shadow-[#4E97D1]/20",
    },
    {
      title: "Pending Upload",
      value: exportStats.pending_exports,
      icon: Clock,
      gradient: "from-[#fed652] to-[#e6c149]",
      shadow: "shadow-[#fed652]/20",
      textColor: "text-gray-800",
    },
    {
      title: "Uploaded",
      value: exportStats.uploaded_exports,
      icon: CheckCircle,
      gradient: "from-[#49a034] to-[#3a8029]",
      shadow: "shadow-[#49a034]/20",
    },
    {
      title: "Failed",
      value: exportStats.failed_exports,
      icon: XCircle,
      gradient: "from-[#f77f00] to-[#d66d00]",
      shadow: "shadow-[#f77f00]/20",
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Main Stats with vibrant gradients */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 shadow-xl ${stat.shadow} hover:scale-[1.02] transition-all cursor-pointer`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                  <stat.icon className={`h-5 w-5 ${stat.textColor || 'text-white'}`} />
                </div>
              </div>
              <div className={`text-sm font-medium mb-1 ${stat.textColor ? 'text-gray-600' : 'text-white/80'}`}>{stat.title}</div>
              <div className={`text-3xl font-bold ${stat.textColor || 'text-white'}`}>{stat.value.toLocaleString()}</div>
              {stat.subtitle && (
                <p className={`text-xs mt-2 ${stat.textColor ? 'text-gray-500' : 'text-white/70'}`}>
                  {stat.subtitle} completion rate
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* By Provider/Bank Stats */}
      {mode === "import" && importStats?.by_provider && importStats.by_provider.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-lg shadow-[#4E97D1]/30 flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">By Bank Provider</h3>
                <p className="text-sm text-gray-500">Import summary by financial institution</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {importStats.by_provider.map((provider, index) => (
                <div
                  key={provider.bank_provider__code}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200/50 hover:border-[#638C80]/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/20 flex items-center justify-center group-hover:from-[#638C80]/20 group-hover:to-[#638C80]/30 transition-all">
                      <span className="text-[#638C80] font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{provider.bank_provider__name}</p>
                      <p className="text-xs text-gray-500 mt-0.5 font-mono">
                        {provider.bank_provider__code}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#638C80]">
                      {provider.count} {provider.count === 1 ? 'import' : 'imports'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {provider.total_txs.toLocaleString()} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mode === "export" && exportStats?.by_bank && exportStats.by_bank.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-lg shadow-[#4E97D1]/30 flex items-center justify-center">
                <Database className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">By Bank Account</h3>
                <p className="text-sm text-gray-500">Export summary by bank account</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {exportStats.by_bank.map((bank, index) => (
                <div
                  key={`${bank.bank_account__account_name}-${index}`}
                  className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200/50 hover:border-[#638C80]/30 hover:shadow-md transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/20 flex items-center justify-center group-hover:from-[#638C80]/20 group-hover:to-[#638C80]/30 transition-all">
                      <span className="text-[#638C80] font-bold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{bank.bank_account__account_name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {bank.bank_account__bank_provider__name || 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-[#638C80]">
                      {bank.count} {bank.count === 1 ? 'export' : 'exports'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {bank.total_payments.toLocaleString()} payments
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Imports */}
      {mode === "import" && importStats?.recent_imports && importStats.recent_imports.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-lg shadow-[#49a034]/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Imports</h3>
                <p className="text-sm text-gray-500">Latest bank statement imports</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {importStats.recent_imports.slice(0, 5).map((imp) => {
                const syncPercentage = imp.transactions_count > 0
                  ? (imp.transactions_synced / imp.transactions_count) * 100
                  : 0;
                const isFullySynced = imp.transactions_synced === imp.transactions_count;

                return (
                  <div
                    key={imp.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200/50 hover:border-[#638C80]/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isFullySynced
                          ? 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/20'
                          : 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/20'
                      }`}>
                        {isFullySynced ? (
                          <CheckCircle className="h-5 w-5 text-[#49a034]" />
                        ) : (
                          <Clock className="h-5 w-5 text-[#d4a843]" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{imp.original_filename}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(imp.imported_at).toLocaleDateString()} • {imp.bank_provider.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${isFullySynced ? 'text-[#49a034]' : 'text-[#d4a843]'}`}>
                        {imp.transactions_synced}/{imp.transactions_count}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {syncPercentage.toFixed(0)}% synced
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Recent Exports */}
      {mode === "export" && exportStats?.recent_exports && exportStats.recent_exports.length > 0 && (
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-lg shadow-[#49a034]/30 flex items-center justify-center">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Recent Exports</h3>
                <p className="text-sm text-gray-500">Latest payment file exports</p>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {exportStats.recent_exports.slice(0, 5).map((exp) => {
                const statusColor = exp.status === 'uploaded'
                  ? 'text-[#49a034]'
                  : exp.status === 'pending'
                  ? 'text-[#d4a843]'
                  : exp.status === 'failed'
                  ? 'text-[#f77f00]'
                  : 'text-[#4E97D1]';

                const statusIcon = exp.status === 'uploaded'
                  ? CheckCircle
                  : exp.status === 'pending'
                  ? Clock
                  : exp.status === 'failed'
                  ? XCircle
                  : ArrowUpFromLine;

                const StatusIcon = statusIcon;

                return (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200/50 hover:border-[#638C80]/30 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        exp.status === 'uploaded'
                          ? 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/20'
                          : exp.status === 'pending'
                          ? 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/20'
                          : exp.status === 'failed'
                          ? 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/20'
                          : 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/20'
                      }`}>
                        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{exp.filename}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Date(exp.created_at).toLocaleDateString()} • {exp.bank_account_name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${statusColor}`}>
                        {exp.payment_count} {exp.payment_count === 1 ? 'payment' : 'payments'}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5 capitalize">
                        {exp.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
