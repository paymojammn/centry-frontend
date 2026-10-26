"use client";

import { useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentCard } from "@/components/layout/content-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Link2,
  RefreshCw,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import {
  useBankAccounts,
  useBankPaymentExports,
  usePaymentExportStatuses,
  usePaymentExportStatusDetail,
  useRelinkUnmatchedPain002,
  type BankPaymentExport,
  type PaymentExportStatus,
  type PaymentTransactionStatus,
} from "@/hooks/use-banking";

interface Pain002StatusProps {
  organizationId?: string;
  onSelectExport?: (exportId: number) => void;
  selectedExportId?: number;
}

function formatDate(dateString: string): string {
  return format(new Date(dateString), "dd MMM yyyy HH:mm");
}

function formatCurrency(amount: string | null, currency: string): string {
  if (!amount) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(parseFloat(amount));
}

// Semantic status-pill tints (success / warning / danger / info / neutral).
const PILL_SUCCESS = "bg-success-500/10 text-success-700 border-success-500/20";
const PILL_WARNING = "bg-warning-500/10 text-warning-700 border-warning-500/20";
const PILL_DANGER = "bg-danger-500/10 text-danger-700 border-danger-500/20";
const PILL_INFO = "bg-info-500/10 text-info-700 border-info-500/20";
const PILL_NEUTRAL = "bg-muted text-muted-foreground border-border";

/** Per-transaction ISO 20022 status (ACSP / ACWC / PDNG / RJCT). */
function getStatusBadge(status: string) {
  switch (status) {
    case "ACSP":
      return (
        <span className={`status-pill ${PILL_SUCCESS}`}>
          <CheckCircle2 className="h-3 w-3 shrink-0" />
          Accepted
        </span>
      );
    case "ACWC":
      return (
        <span className={`status-pill ${PILL_WARNING}`}>
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Accepted with change
        </span>
      );
    case "PDNG":
      return (
        <span className={`status-pill ${PILL_WARNING}`}>
          <Clock className="h-3 w-3 shrink-0" />
          Pending
        </span>
      );
    case "RJCT":
      return (
        <span className={`status-pill ${PILL_DANGER}`}>
          <XCircle className="h-3 w-3 shrink-0" />
          Rejected
        </span>
      );
    default:
      return <span className={`status-pill ${PILL_NEUTRAL}`}>{status || "Unknown"}</span>;
  }
}

/** Group-level outcome of a pain.002 report. */
function getGroupStatusBadge(status: string | null) {
  switch (status) {
    case "RCVD":
      return <span className={`status-pill ${PILL_INFO}`}>Received</span>;
    case "ACSP":
      return <span className={`status-pill ${PILL_SUCCESS}`}>All accepted</span>;
    case "PART":
      return <span className={`status-pill ${PILL_WARNING}`}>Partial</span>;
    case "PDNG":
      return <span className={`status-pill ${PILL_WARNING}`}>Pending</span>;
    case "RJCT":
      return <span className={`status-pill ${PILL_DANGER}`}>Rejected</span>;
    default:
      return null;
  }
}

/** Report type of a pain.002 (ACK / NACK / INTERIM / FINAL / …). */
function getReportTypeBadge(type: string) {
  switch (type) {
    case "ACK":
      return (
        <span className={`status-pill ${PILL_SUCCESS}`}>
          <FileCheck className="h-3 w-3 shrink-0" />
          ACK
        </span>
      );
    case "NACK":
      return (
        <span className={`status-pill ${PILL_DANGER}`}>
          <XCircle className="h-3 w-3 shrink-0" />
          NACK
        </span>
      );
    case "INTERIM":
      return <span className={`status-pill ${PILL_INFO}`}>Interim</span>;
    case "FINAL":
      return <span className={`status-pill ${PILL_NEUTRAL}`}>Final</span>;
    default:
      return <span className={`status-pill ${PILL_NEUTRAL}`}>{type}</span>;
  }
}

/** Export file waiting on its pain.002. */
function AwaitingBankPill() {
  return (
    <span className={`status-pill ${PILL_WARNING}`}>
      <Clock className="h-3 w-3 shrink-0" />
      Awaiting bank
    </span>
  );
}

function TransactionStatusRow({ tx }: { tx: PaymentTransactionStatus }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr>
        <td>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? "Hide transaction details" : "Show transaction details"}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </td>
        <td className="cell-primary">
          <span className="font-mono">{tx.original_end_to_end_id}</span>
        </td>
        <td>{getStatusBadge(tx.status)}</td>
        <td className="cell-muted">{tx.status_code || "-"}</td>
        <td className="cell-amount">{formatCurrency(tx.original_amount, tx.original_currency)}</td>
        <td className="cell-muted pl-4">{tx.payment_event_id ? `#${tx.payment_event_id}` : "-"}</td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={6}>
            <div className="ml-6 space-y-2 text-sm">
              {tx.creditor_name && (
                <div>
                  <span className="text-muted-foreground">Creditor:</span>{" "}
                  <span className="text-foreground">{tx.creditor_name}</span>
                </div>
              )}
              {tx.invoice_number && (
                <div>
                  <span className="text-muted-foreground">Invoice:</span>{" "}
                  <span className="text-foreground">{tx.invoice_number}</span>
                </div>
              )}
              {tx.status_description && (
                <div>
                  <span className="text-muted-foreground">Description:</span>{" "}
                  <span className="text-foreground">{tx.status_description}</span>
                </div>
              )}
              {tx.original_instruction_id && (
                <div>
                  <span className="text-muted-foreground">Instruction ID:</span>{" "}
                  <span className="font-mono text-foreground">{tx.original_instruction_id}</span>
                </div>
              )}
              {tx.additional_info && tx.additional_info.length > 0 && (
                <div>
                  <span className="text-muted-foreground">Additional Info:</span>
                  <ul className="list-disc list-inside mt-1 text-foreground">
                    {tx.additional_info.map((info, i) => (
                      <li key={i}>{info}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function StatusDetail({ status }: { status: PaymentExportStatus }) {
  const [showTransactions, setShowTransactions] = useState(false);
  const { data: detailData, isLoading: detailLoading } = usePaymentExportStatusDetail(
    showTransactions ? status.id : undefined
  );
  const transactions = detailData?.transaction_statuses || [];

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {getReportTypeBadge(status.report_type)}
          {getGroupStatusBadge(status.group_status)}
          <span className="text-xs text-muted-foreground tabular-nums">
            {formatDate(status.received_at)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm tabular-nums">
          <span className="text-success-700">{status.successful_count} accepted</span>
          <span className="text-danger-700">{status.rejected_count} rejected</span>
          <span className="text-warning-700">{status.pending_count} pending</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <span className="text-muted-foreground">Message ID:</span>
          <p className="font-mono text-xs text-foreground truncate" title={status.message_id}>
            {status.message_id}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Original Message:</span>
          <p className="font-mono text-xs text-foreground truncate" title={status.original_message_id}>
            {status.original_message_id}
          </p>
        </div>
        <div>
          <span className="text-muted-foreground">Source:</span>
          <p className="text-xs text-foreground truncate" title={status.source_file || undefined}>
            {status.source_file || "-"}
          </p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowTransactions(!showTransactions)}
        className="h-7 text-xs"
      >
        {showTransactions ? (
          <>
            <ChevronDown className="h-3 w-3 mr-1" />
            Hide transactions
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3 mr-1" />
            View {status.total_transactions} transactions
          </>
        )}
      </Button>

      {showTransactions && (
        <div className="mt-3 border border-border rounded-lg overflow-hidden">
          {detailLoading ? (
            <LoadingState />
          ) : transactions.length === 0 ? (
            <EmptyState icon={FileText} title="No transaction details available" />
          ) : (
            <table className="w-full table-professional">
              <colgroup>
                <col className="w-10" />
                <col />{/* End-to-End ID — flexible */}
                <col className="w-[180px]" />{/* Status */}
                <col className="w-[90px]" />{/* Code */}
                <col className="w-[140px]" />{/* Amount */}
                <col className="w-[100px]" />{/* Payment */}
              </colgroup>
              <thead>
                <tr>
                  <th></th>
                  <th>End-to-End ID</th>
                  <th>Status</th>
                  <th>Code</th>
                  <th className="text-right">Amount</th>
                  <th>Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {transactions.map((tx) => (
                  <TransactionStatusRow key={tx.id} tx={tx} />
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}

const EXPORT_COLUMNS = 6;

function ExportStatusRow({
  exportFile,
  isSelected,
  onSelect,
}: {
  exportFile: BankPaymentExport;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data: statusesData, isLoading: statusesLoading } = usePaymentExportStatuses(exportFile.id);
  const statuses = statusesData?.results || [];
  const latestStatus = statuses[0];

  return (
    <>
      <tr
        className={`${isSelected ? "is-selected" : ""} cursor-pointer`}
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect();
        }}
      >
        <td className="text-muted-foreground/60">
          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </td>
        <td className="cell-primary">
          <div className="min-w-0">
            <div className="truncate" title={exportFile.file_name}>
              {exportFile.file_name}
            </div>
            <span className="cell-sub truncate">
              {exportFile.bank_account?.account_name}
              {exportFile.format ? ` · ${exportFile.format}` : ""}
            </span>
          </div>
        </td>
        <td className="cell-muted">
          {exportFile.sftp_uploaded_at ? (
            <>
              {format(new Date(exportFile.sftp_uploaded_at), "dd MMM yyyy")}
              <span className="cell-sub">{format(new Date(exportFile.sftp_uploaded_at), "HH:mm")}</span>
            </>
          ) : (
            "—"
          )}
        </td>
        <td className="cell-amount">{exportFile.payment_count}</td>
        <td className="cell-amount">{formatCurrency(exportFile.total_amount, exportFile.currency)}</td>
        <td className="pl-4">
          {latestStatus ? (
            <div className="flex items-center gap-2 flex-wrap">
              {getReportTypeBadge(latestStatus.report_type)}
              {getGroupStatusBadge(latestStatus.group_status)}
              <span className="text-xs text-muted-foreground tabular-nums">
                {latestStatus.successful_count}/{latestStatus.total_transactions} OK
              </span>
            </div>
          ) : statusesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          ) : (
            <AwaitingBankPill />
          )}
        </td>
      </tr>

      {isExpanded && (
        <tr className="bg-muted/20">
          <td colSpan={EXPORT_COLUMNS} className="p-0">
            {statusesLoading ? (
              <LoadingState />
            ) : statuses.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="Awaiting bank"
                description="Pull pain.002 files from SFTP to get status updates"
              />
            ) : (
              <div className="divide-y divide-border">
                {statuses.map((status) => (
                  <StatusDetail key={status.id} status={status} />
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

export function Pain002Status({ organizationId, onSelectExport, selectedExportId }: Pain002StatusProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  const {
    data: exportsData,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useBankPaymentExports({
    bankAccountId: selectedAccountId,
    organizationId,
  });

  const relinkUnmatched = useRelinkUnmatchedPain002();

  const handleRelink = async () => {
    try {
      const result = await relinkUnmatched.mutateAsync({ organizationId });
      if (result.relinked > 0) {
        toast.success(
          `Re-linked ${result.relinked} bank response${result.relinked === 1 ? "" : "s"}` +
            (result.still_unmatched > 0
              ? `; ${result.still_unmatched} still unmatched`
              : "")
        );
      } else if (result.examined === 0) {
        toast.info("No unmatched bank responses to re-link.");
      } else {
        toast.info(
          `Checked ${result.examined} unmatched response${result.examined === 1 ? "" : "s"}, none could be re-linked.`
        );
      }
      refetchExports();
    } catch (err: any) {
      toast.error(err?.response?.data?.error || err?.message || "Re-link failed");
    }
  };

  const exports = exportsData?.results || [];

  // Filter exports that have been uploaded (have bank response potential).
  // "completed" / "partial" are legacy backend values outside the typed
  // union; compare as strings so they keep matching if they ever appear.
  const uploadedExports = exports.filter((e) => {
    const status = e.status as string;
    return (
      status === "uploaded" ||
      status === "processed" ||
      status === "completed" ||
      status === "partial" ||
      status === "failed"
    );
  });

  return (
    <ContentCard noPadding>
      {/* Toolbar: account select + re-link + refresh */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        <Select
          value={selectedAccountId?.toString() || "all"}
          onValueChange={(value) =>
            setSelectedAccountId(value === "all" ? undefined : Number(value))
          }
          disabled={accountsLoading}
        >
          <SelectTrigger className="w-[200px] h-9">
            <SelectValue placeholder="All accounts" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All accounts</SelectItem>
            {bankAccounts.map((account: any) => (
              <SelectItem key={account.id} value={account.id.toString()}>
                {account.account_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRelink}
            disabled={relinkUnmatched.isPending}
            title="Retry matching unmatched bank responses to their payment exports"
            className="h-9 btn-press"
          >
            {relinkUnmatched.isPending ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Link2 className="h-3.5 w-3.5 mr-1.5" />
            )}
            Re-link unmatched
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExports()}
            disabled={exportsLoading}
            title="Refresh"
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${exportsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {exportsLoading ? (
        <LoadingState />
      ) : uploadedExports.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No uploaded exports yet"
          description="Upload payment files from the Files tab to track their status"
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full table-professional">
            <colgroup>
              <col className="w-10" />{/* Expand */}
              <col />{/* Export file — flexible */}
              <col className="w-[140px]" />{/* Uploaded */}
              <col className="w-[90px]" />{/* Payments */}
              <col className="w-[150px]" />{/* Amount */}
              <col className="w-[320px]" />{/* Bank response */}
            </colgroup>
            <thead>
              <tr>
                <th></th>
                <th>Export file</th>
                <th>Uploaded</th>
                <th className="text-right">Payments</th>
                <th className="text-right">Amount</th>
                <th>Bank response</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {uploadedExports.map((exportFile) => (
                <ExportStatusRow
                  key={exportFile.id}
                  exportFile={exportFile}
                  isSelected={selectedExportId === exportFile.id}
                  onSelect={() => onSelectExport?.(exportFile.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ContentCard>
  );
}
