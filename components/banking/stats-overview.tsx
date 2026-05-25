"use client";

import {
  Database,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  ArrowUpFromLine,
} from "lucide-react";
import { useImportStats, useExportStats } from "@/hooks/use-banking";

interface StatsOverviewProps {
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
  mode?: "import" | "export";
}

function StatPill({ label, value, color }: { label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    blue: "bg-[#6B8FB8]/10 text-[#6B8FB8]",
    green: "bg-primary/5 text-primary",
    amber: "bg-[#D4B35A]/10 text-[#D4B35A]",
    orange: "bg-[#D4944A]/10 text-[#D4944A]",
    teal: "bg-[#6B8FB8]/10 text-[#6B8FB8]",
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground text-sm">{label}:</span>
      <span className={`px-2 py-0.5 rounded text-sm font-normal ${colors[color] || colors.blue}`}>
        {typeof value === 'number' ? value.toLocaleString() : value}
      </span>
    </div>
  );
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
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8">
        <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="bg-card rounded-lg border border-border px-6 py-4">
        {mode === "import" && importStats ? (
          <div className="flex items-center gap-8 flex-wrap">
            <StatPill label="Imports" value={importStats.total_imports} color="blue" />
            <StatPill label="Transactions" value={importStats.total_transactions} color="teal" />
            <StatPill label="Synced" value={`${importStats.synced_transactions} (${importStats.sync_percentage.toFixed(0)}%)`} color="green" />
            <StatPill label="Pending" value={importStats.pending_transactions} color="amber" />
            <StatPill label="Failed" value={importStats.failed_transactions} color="orange" />
          </div>
        ) : exportStats ? (
          <div className="flex items-center gap-8 flex-wrap">
            <StatPill label="Exports" value={exportStats.total_exports} color="blue" />
            <StatPill label="Payments" value={exportStats.total_payments} color="teal" />
            <StatPill label="Pending" value={exportStats.pending_exports} color="amber" />
            <StatPill label="Uploaded" value={exportStats.uploaded_exports} color="green" />
            <StatPill label="Failed" value={exportStats.failed_exports} color="orange" />
          </div>
        ) : null}
      </div>

      {/* By Provider/Bank */}
      {mode === "import" && importStats?.by_provider && importStats.by_provider.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-sm font-normal text-foreground">By Bank Provider</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {importStats.by_provider.map((provider) => (
              <div
                key={provider.bank_provider__code}
                className="px-6 py-3 flex items-center justify-between hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-normal text-foreground">{provider.bank_provider__name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{provider.bank_provider__code}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-normal text-primary">
                    {provider.count} {provider.count === 1 ? 'import' : 'imports'}
                  </p>
                  <p className="text-xs text-muted-foreground">{provider.total_txs.toLocaleString()} txns</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {mode === "export" && exportStats?.by_bank && exportStats.by_bank.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-sm font-normal text-foreground">By Bank Account</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {exportStats.by_bank.map((bank, index) => (
              <div
                key={`${bank.bank_account__account_name}-${index}`}
                className="px-6 py-3 flex items-center justify-between hover:bg-muted"
              >
                <div>
                  <p className="text-sm font-normal text-foreground">{bank.bank_account__account_name}</p>
                  <p className="text-xs text-muted-foreground">{bank.bank_account__bank_provider__name || 'N/A'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-normal text-primary">
                    {bank.count} {bank.count === 1 ? 'export' : 'exports'}
                  </p>
                  <p className="text-xs text-muted-foreground">{bank.total_payments.toLocaleString()} payments</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Imports */}
      {mode === "import" && importStats?.recent_imports && importStats.recent_imports.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-sm font-normal text-foreground">Recent Imports</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {importStats.recent_imports.slice(0, 5).map((imp) => {
              const isFullySynced = imp.transactions_synced === imp.transactions_count;
              return (
                <div
                  key={imp.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    {isFullySynced ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <Clock className="h-4 w-4 text-[#D4B35A]" />
                    )}
                    <div>
                      <p className="text-sm font-normal text-foreground">{imp.original_filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(imp.imported_at).toLocaleDateString()} · {imp.bank_provider.name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-normal ${isFullySynced ? 'text-primary' : 'text-[#D4B35A]'}`}>
                      {imp.transactions_synced}/{imp.transactions_count}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {imp.transactions_count > 0 ? ((imp.transactions_synced / imp.transactions_count) * 100).toFixed(0) : 0}% synced
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Exports */}
      {mode === "export" && exportStats?.recent_exports && exportStats.recent_exports.length > 0 && (
        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground/60" />
              <h3 className="text-sm font-normal text-foreground">Recent Exports</h3>
            </div>
          </div>
          <div className="divide-y divide-border">
            {exportStats.recent_exports.slice(0, 5).map((exp) => {
              const statusColor = exp.status === 'uploaded'
                ? 'text-primary'
                : exp.status === 'pending'
                ? 'text-[#D4B35A]'
                : exp.status === 'failed'
                ? 'text-[#D4944A]'
                : 'text-[#6B8FB8]';

              const StatusIcon = exp.status === 'uploaded'
                ? CheckCircle
                : exp.status === 'pending'
                ? Clock
                : exp.status === 'failed'
                ? XCircle
                : ArrowUpFromLine;

              return (
                <div
                  key={exp.id}
                  className="px-6 py-3 flex items-center justify-between hover:bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                    <div>
                      <p className="text-sm font-normal text-foreground">{exp.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(exp.created_at).toLocaleDateString()} · {exp.bank_account_name}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-normal ${statusColor}`}>
                      {exp.payment_count} {exp.payment_count === 1 ? 'payment' : 'payments'}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{exp.status.replace('_', ' ')}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
