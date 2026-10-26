"use client";

/**
 * Transactions report.
 *
 * Every gateway payment in the period: four headline tiles, outcome by
 * channel and by status, the transaction grid (filterable by status,
 * channel and free text) and the payment files those transactions were
 * submitted in. Built on the shared report scaffold like every other report.
 */

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  FileText,
  Landmark,
  PieChart,
  Receipt,
  Search,
  Send,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { MetricTile } from "@/components/reports/MetricTile";
import { ReportRow, ReportSection, ReportShell, ReportSummary } from "@/components/reports/report-shell";
import { ReportBarChart, ReportPieChart } from "@/components/reports/charts/ReportCharts";
import { CHART_COLORS, formatCurrencyCompact, formatNumber } from "@/components/reports/chart-theme";
import { ExportButton } from "@/components/reports/export/ExportButton";
import { usePaymentTransactionList, usePaymentTransactions } from "@/hooks/use-reports";
import { useReportOrganization, useReportPeriod } from "@/hooks/use-report-context";
import type { PaymentFile, PaymentTransaction } from "@/types/reports";

// ---------------------------------------------------------------------
// Vocabulary
// ---------------------------------------------------------------------

type PillTone = "success" | "warning" | "danger" | "info" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  success: "bg-success-500/10 text-success-700 border-success-500/20",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  danger: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  neutral: "bg-neutral-500/10 text-neutral-700 border-neutral-500/20",
};

/** Gateway transaction status → the shared status words. */
const TXN_STATUS: Record<string, { label: string; tone: PillTone }> = {
  SUCCESS_PAYMENT: { label: "Processed", tone: "success" },
  FAILED_PAYMENT: { label: "Failed", tone: "danger" },
  ERROR_PAYMENT: { label: "Failed", tone: "danger" },
  REJECTED: { label: "Rejected", tone: "danger" },
  PENDING_APPROVAL: { label: "Pending approval", tone: "warning" },
  PENDING: { label: "Pending approval", tone: "warning" },
  PROCESSING: { label: "Awaiting bank", tone: "info" },
  SENT_PAYMENT: { label: "Awaiting bank", tone: "info" },
  REVERSED: { label: "Reversed", tone: "neutral" },
};

/** Bank file status (ISO pain.002 codes and our own) → the same words. */
const FILE_STATUS: Record<string, { label: string; tone: PillTone }> = {
  ACSP: { label: "Processed", tone: "success" },
  PART: { label: "Processed", tone: "warning" },
  processed: { label: "Processed", tone: "success" },
  RCVD: { label: "Awaiting bank", tone: "info" },
  PDNG: { label: "Awaiting bank", tone: "info" },
  uploaded: { label: "Awaiting bank", tone: "info" },
  pending: { label: "Ready", tone: "warning" },
  RJCT: { label: "Rejected", tone: "danger" },
  failed: { label: "Failed", tone: "danger" },
};

/** Aggregate status names from the overview endpoint. */
const AGG_STATUS: Record<string, { label: string; color: string }> = {
  Success: { label: "Processed", color: CHART_COLORS.success },
  Processing: { label: "Awaiting bank", color: CHART_COLORS.warning },
  Failed: { label: "Failed", color: CHART_COLORS.danger },
};

const CHANNEL_LABELS: Record<string, string> = {
  bank_transfer: "Bank transfer",
  mtn_momo: "MTN MoMo",
  airtel_momo: "Airtel Money",
  cash: "Cash",
  card: "Card",
};

const amount = (value: number) =>
  new Intl.NumberFormat("en-UG", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

function StatusPill({ label, tone }: { label: string; tone: PillTone }) {
  return <span className={`status-pill ${PILL_TONE[tone]}`}>{label}</span>;
}

function DateCell({ iso }: { iso: string }) {
  const d = new Date(iso);
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm")}</span>
    </>
  );
}

// ---------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------

function TransactionsTable({ rows }: { rows: PaymentTransaction[] }) {
  return (
    <div className="table-scroll-container">
      <table className="table-professional">
        <thead>
          <tr>
            <th>Date</th>
            <th>Recipient</th>
            <th>Channel</th>
            <th className="cell-currency">Ccy</th>
            <th className="text-right">Amount</th>
            <th>Status</th>
            <th>Initiated by</th>
            <th>Approved by</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((txn) => {
            const status = TXN_STATUS[txn.status] || { label: txn.status_label, tone: "neutral" as PillTone };
            return (
              <tr key={txn.id}>
                <td className="cell-muted whitespace-nowrap">
                  <DateCell iso={txn.date} />
                </td>
                <td className="cell-primary">
                  <span className="block truncate max-w-[220px]" title={txn.recipient}>
                    {txn.recipient}
                  </span>
                  <span className="cell-sub truncate max-w-[220px]" title={txn.note || txn.reference}>
                    {txn.reference}
                  </span>
                </td>
                <td className="cell-muted whitespace-nowrap">{CHANNEL_LABELS[txn.method] || txn.channel}</td>
                <td className="cell-currency">{txn.currency}</td>
                <td className="cell-amount">{amount(txn.amount)}</td>
                <td>
                  <StatusPill label={status.label} tone={status.tone} />
                </td>
                <td className="cell-muted">
                  <span className="block truncate max-w-[160px]" title={txn.initiated_by?.email}>
                    {txn.initiated_by?.name || "—"}
                  </span>
                </td>
                <td className="cell-muted">
                  {txn.approved_by ? (
                    <span className="block truncate max-w-[160px]" title={txn.approved_by.email}>
                      {txn.approved_by.name}
                    </span>
                  ) : txn.rejected_by ? (
                    <>
                      <span className="block truncate max-w-[160px]" title={txn.rejected_by.email}>
                        {txn.rejected_by.name}
                      </span>
                      <span className="cell-sub truncate max-w-[160px]" title={txn.rejected_by.reason}>
                        Rejected{txn.rejected_by.reason ? ` · ${txn.rejected_by.reason}` : ""}
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function FilesTable({ files }: { files: PaymentFile[] }) {
  return (
    <div className="table-scroll-container">
      <table className="table-professional">
        <thead>
          <tr>
            <th>Submitted</th>
            <th>File</th>
            <th>Account</th>
            <th className="text-right">Payments</th>
            <th className="cell-currency">Ccy</th>
            <th className="text-right">Amount</th>
            <th>Results</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {files.map((file) => {
            const status = FILE_STATUS[file.bank_status] ||
              FILE_STATUS[file.status] || { label: file.status, tone: "neutral" as PillTone };
            const resolved = file.successful_count + file.failed_count + file.pending_count;
            return (
              <tr key={file.id}>
                <td className="cell-muted whitespace-nowrap">
                  <DateCell iso={file.created_at} />
                </td>
                <td className="cell-primary">
                  <span className="block truncate max-w-[240px]" title={file.filename}>
                    {file.filename}
                  </span>
                </td>
                <td className="cell-muted">
                  <span className="block truncate max-w-[160px]">{file.bank_account_name || "—"}</span>
                </td>
                <td className="cell-amount">{file.payment_count}</td>
                <td className="cell-currency">{file.currency}</td>
                <td className="cell-amount">{amount(file.total_amount)}</td>
                <td className="cell-muted whitespace-nowrap">
                  {resolved > 0
                    ? `${file.successful_count} processed · ${file.failed_count} failed · ${file.pending_count} awaiting`
                    : "Awaiting response"}
                </td>
                <td>
                  <StatusPill label={status.label} tone={status.tone} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------

export default function TransactionReportsPage() {
  const org = useReportOrganization();
  const period = useReportPeriod("90d");
  const organizationId = org.organizationId || undefined;

  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [search, setSearch] = useState("");
  const hasFilters = statusFilter !== "all" || methodFilter !== "all" || search !== "";

  const { data: report, isLoading: loadingOverview } = usePaymentTransactions(
    organizationId,
    period.startDate,
    period.endDate
  );

  const listFilters = useMemo(
    () =>
      organizationId
        ? {
            organization: organizationId,
            start_date: period.startDate,
            end_date: period.endDate,
            ...(statusFilter !== "all" && { status: statusFilter }),
            ...(methodFilter !== "all" && { method: methodFilter }),
          }
        : undefined,
    [organizationId, period.startDate, period.endDate, statusFilter, methodFilter]
  );
  const { data: listData, isLoading: loadingList } = usePaymentTransactionList(listFilters);

  const transactions = useMemo(() => {
    const rows = listData?.transactions || [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((t) =>
      [t.recipient, t.reference, t.note, t.initiated_by?.name, t.approved_by?.name]
        .some((v) => v?.toLowerCase().includes(q))
    );
  }, [listData, search]);

  const overview = report?.overview;
  const channelData = useMemo(
    () =>
      (report?.by_channel || []).map((ch) => ({
        channel: CHANNEL_LABELS[ch.method] || ch.channel,
        processed: ch.successful.count,
        failed: ch.failed.count,
        pending: ch.pending.count,
      })),
    [report]
  );
  const statusData = useMemo(
    () =>
      (report?.status_distribution || []).map((s) => ({
        name: AGG_STATUS[s.status]?.label || s.status,
        value: s.count,
        color: AGG_STATUS[s.status]?.color,
      })),
    [report]
  );

  const failedCount = overview?.failed.count || 0;
  const processingCount = overview?.processing.count || 0;
  const successCount = overview?.successful.count || 0;

  return (
    <ReportShell
      title="Transactions"
      organizations={org.organizations}
      organizationId={org.organizationId}
      onOrganizationChange={org.setOrganizationId}
      isLoadingOrgs={org.isLoading}
      period={period}
      filters={
        <>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="success">Processed</SelectItem>
              <SelectItem value="processing">Awaiting bank</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="reversed">Reversed</SelectItem>
            </SelectContent>
          </Select>
          <Select value={methodFilter} onValueChange={setMethodFilter}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All channels</SelectItem>
              {Object.entries(CHANNEL_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="relative w-56 max-w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search recipient, reference…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-card border-border text-sm text-foreground"
            />
          </div>
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => {
                setStatusFilter("all");
                setMethodFilter("all");
                setSearch("");
              }}
            >
              Clear
            </Button>
          )}
        </>
      }
      actions={
        organizationId && (
          <ExportButton
            organizationId={organizationId}
            reportType="payment-transactions"
            startDate={period.startDate}
            endDate={period.endDate}
            status={statusFilter !== "all" ? statusFilter : undefined}
            method={methodFilter !== "all" ? methodFilter : undefined}
          />
        )
      }
    >
      {loadingOverview ? (
        <LoadingState />
      ) : (
        <>
          <ReportSummary>
            <MetricTile
              label="Submitted"
              value={formatCurrencyCompact(overview?.total_submitted.amount || 0)}
              hint={`${formatNumber(overview?.total_submitted.count || 0)} payments · ${period.label.toLowerCase()}`}
              icon={Send}
              trend={overview ? { value: overview.change } : undefined}
            />
            <MetricTile
              label="Processed"
              value={formatCurrencyCompact(overview?.successful.amount || 0)}
              hint={`${formatNumber(successCount)} payments cleared by the bank`}
              icon={CheckCircle2}
              tone={successCount > 0 ? "success" : "default"}
            />
            <MetricTile
              label="Failed"
              value={formatCurrencyCompact(overview?.failed.amount || 0)}
              hint={failedCount > 0 ? `${formatNumber(failedCount)} payments failed or rejected` : "No failures in this period"}
              icon={XCircle}
              tone={failedCount > 0 ? "danger" : "default"}
            />
            <MetricTile
              label="Awaiting bank"
              value={formatCurrencyCompact(overview?.processing.amount || 0)}
              hint={processingCount > 0 ? `${formatNumber(processingCount)} payments awaiting a response` : "Nothing in flight"}
              icon={Clock}
              tone={processingCount > 0 ? "warning" : "default"}
            />
          </ReportSummary>

          <ReportRow>
            <ReportSection
              title="Outcome by channel"
              subtitle="Payments per channel, split by outcome"
              icon={<BarChart3 className="h-4 w-4" />}
              padded
            >
              <ReportBarChart
                data={channelData}
                xKey="channel"
                series={[
                  { key: "processed", label: "Processed", color: CHART_COLORS.success, stackId: "outcome" },
                  { key: "pending", label: "Awaiting bank", color: CHART_COLORS.warning, stackId: "outcome" },
                  { key: "failed", label: "Failed", color: CHART_COLORS.danger, stackId: "outcome" },
                ]}
                valueFormatter={formatNumber}
                emptyTitle="No payments in this period"
              />
            </ReportSection>
            <ReportSection
              title="Status breakdown"
              subtitle="Share of payments by outcome"
              icon={<PieChart className="h-4 w-4" />}
              padded
            >
              <ReportPieChart
                data={statusData}
                height={280}
                valueFormatter={(v) => `${formatNumber(v)} payments`}
                emptyTitle="No payments in this period"
              />
            </ReportSection>
          </ReportRow>
        </>
      )}

      <ReportSection
        title="Transactions"
        subtitle={period.label}
        icon={<Receipt className="h-4 w-4" />}
        right={
          !loadingList && (
            <span className="text-xs text-muted-foreground">
              {formatNumber(transactions.length)}
              {search && listData ? ` of ${formatNumber(listData.total_count)}` : ""} transactions
            </span>
          )
        }
      >
        {loadingList ? (
          <LoadingState />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No transactions found"
            description={hasFilters ? "Try adjusting your filters." : "Payment transactions will appear here once processed."}
          />
        ) : (
          <TransactionsTable rows={transactions} />
        )}
      </ReportSection>

      {!loadingOverview && (
        <ReportSection
          title="Payment files"
          subtitle="Files submitted to the bank in this period"
          icon={<FileText className="h-4 w-4" />}
          right={
            report?.recent_files?.length ? (
              <span className="text-xs text-muted-foreground">{report.recent_files.length} files</span>
            ) : undefined
          }
        >
          {report?.recent_files?.length ? (
            <FilesTable files={report.recent_files} />
          ) : (
            <EmptyState
              icon={Landmark}
              title="No payment files yet"
              description="Payment files will appear here once submitted to your bank."
            />
          )}
        </ReportSection>
      )}
    </ReportShell>
  );
}
