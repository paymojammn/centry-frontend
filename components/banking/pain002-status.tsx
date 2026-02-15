"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Download,
  RefreshCw,
  FileText,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import {
  useBankAccounts,
  useBankPaymentExports,
  usePain002RemoteFiles,
  usePain002Pull,
  useTaskStatus,
  usePaymentExportStatuses,
  usePaymentExportStatusDetail,
  useSFTPCredentials,
  type BankPaymentExport,
  type PaymentExportStatus,
  type PaymentTransactionStatus,
  type SFTPCredential,
  type Pain002RemoteFile,
} from "@/hooks/use-banking";

interface Pain002StatusProps {
  organizationId?: string;
  onSelectExport?: (exportId: number) => void;
  selectedExportId?: number;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleString();
}

function formatCurrency(amount: string | null, currency: string): string {
  if (!amount) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(parseFloat(amount));
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACSP":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <CheckCircle2 className="h-3 w-3" />
          Accepted
        </span>
      );
    case "ACWC":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
          <AlertTriangle className="h-3 w-3" />
          Accepted with Change
        </span>
      );
    case "PDNG":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case "RJCT":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/5 text-destructive">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
          {status || "Unknown"}
        </span>
      );
  }
}

function getGroupStatusBadge(status: string | null) {
  switch (status) {
    case "RCVD":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          Received
        </span>
      );
    case "ACSP":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          All Accepted
        </span>
      );
    case "PART":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
          Partial
        </span>
      );
    case "PDNG":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          Pending
        </span>
      );
    case "RJCT":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/5 text-destructive">
          Rejected
        </span>
      );
    default:
      return null;
  }
}

function getReportTypeBadge(type: string) {
  switch (type) {
    case "ACK":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <FileCheck className="h-3 w-3" />
          ACK
        </span>
      );
    case "NACK":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-destructive/5 text-destructive">
          <XCircle className="h-3 w-3" />
          NACK
        </span>
      );
    case "INTERIM":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          Interim
        </span>
      );
    case "FINAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#8B7BB8]/10 text-[#8B7BB8]">
          Final
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted text-foreground">
          {type}
        </span>
      );
  }
}

function TransactionStatusRow({ tx }: { tx: PaymentTransactionStatus }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-muted">
        <td className="px-4 py-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </td>
        <td className="px-4 py-2">
          <p className="text-sm font-mono text-foreground">{tx.original_end_to_end_id}</p>
        </td>
        <td className="px-4 py-2">
          {getStatusBadge(tx.status)}
        </td>
        <td className="px-4 py-2 text-sm text-muted-foreground">
          {tx.status_code || "-"}
        </td>
        <td className="px-4 py-2 text-sm text-foreground">
          {formatCurrency(tx.original_amount, tx.original_currency)}
        </td>
        <td className="px-4 py-2 text-sm text-muted-foreground">
          {tx.payment_event_id ? `#${tx.payment_event_id}` : "-"}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-muted/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="ml-6 space-y-2 text-sm">
              {tx.creditor_name && (
                <div>
                  <span className="font-medium text-muted-foreground">Creditor:</span>{" "}
                  <span className="text-foreground">{tx.creditor_name}</span>
                </div>
              )}
              {tx.invoice_number && (
                <div>
                  <span className="font-medium text-muted-foreground">Invoice:</span>{" "}
                  <span className="text-foreground">{tx.invoice_number}</span>
                </div>
              )}
              {tx.status_description && (
                <div>
                  <span className="font-medium text-muted-foreground">Description:</span>{" "}
                  <span className="text-foreground">{tx.status_description}</span>
                </div>
              )}
              {tx.original_instruction_id && (
                <div>
                  <span className="font-medium text-muted-foreground">Instruction ID:</span>{" "}
                  <span className="font-mono text-foreground">{tx.original_instruction_id}</span>
                </div>
              )}
              {tx.additional_info && tx.additional_info.length > 0 && (
                <div>
                  <span className="font-medium text-muted-foreground">Additional Info:</span>
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

function ExportStatusCard({
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
    <div
      className={`bg-card rounded-lg border transition-colors ${
        isSelected ? "border-[#49a034] ring-1 ring-[#49a034]/20" : "border-border"
      }`}
    >
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-muted"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect();
        }}
      >
        <div className="flex items-center gap-3">
          <button className="text-muted-foreground/60 hover:text-muted-foreground">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div>
            <p className="text-sm font-medium text-foreground">{exportFile.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {exportFile.payment_count} payments · {formatCurrency(exportFile.total_amount, exportFile.currency)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestStatus ? (
            <div className="flex items-center gap-2">
              {getReportTypeBadge(latestStatus.report_type)}
              {getGroupStatusBadge(latestStatus.group_status)}
              <div className="text-xs text-muted-foreground">
                {latestStatus.successful_count}/{latestStatus.total_transactions} OK
              </div>
            </div>
          ) : statusesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
          ) : (
            <span className="text-xs text-muted-foreground/60">No bank response yet</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-border">
          {statusesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Awaiting bank response</p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Pull pain.002 files from SFTP to get status updates
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {statuses.map((status) => (
                <StatusDetail key={status.id} status={status} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {getReportTypeBadge(status.report_type)}
          {getGroupStatusBadge(status.group_status)}
          <span className="text-xs text-muted-foreground">
            {formatDate(status.received_at)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-primary">{status.successful_count} accepted</span>
          <span className="text-destructive">{status.rejected_count} rejected</span>
          <span className="text-[#6B8FB8]">{status.pending_count} pending</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <span className="text-muted-foreground">Message ID:</span>
          <p className="font-mono text-xs text-foreground truncate">{status.message_id}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Original Message:</span>
          <p className="font-mono text-xs text-foreground truncate">{status.original_message_id}</p>
        </div>
        <div>
          <span className="text-muted-foreground">Source:</span>
          <p className="text-xs text-foreground">{status.source_file || "-"}</p>
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
            Hide Transactions
          </>
        ) : (
          <>
            <ChevronRight className="h-3 w-3 mr-1" />
            View {status.total_transactions} Transactions
          </>
        )}
      </Button>

      {showTransactions && (
        <div className="mt-3 border border-border rounded-lg overflow-hidden">
          {detailLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/60" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No transaction details available
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b border-border">
                  <th className="w-8 px-4 py-2"></th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">End-to-End ID</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Code</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-muted-foreground">Payment</th>
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

export function Pain002Status({ organizationId, onSelectExport, selectedExportId }: Pain002StatusProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();
  const [isPulling, setIsPulling] = useState(false);
  const [pullTaskId, setPullTaskId] = useState<string | undefined>();

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  const {
    data: exportsData,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useBankPaymentExports({
    bankAccountId: selectedAccountId,
    organizationId,
  });

  const {
    data: remoteFilesData,
    isLoading: remoteFilesLoading,
    refetch: refetchRemoteFiles,
  } = usePain002RemoteFiles(selectedAccountId);

  const pullPain002 = usePain002Pull();

  // Poll task status after pull is initiated
  const { data: taskStatus } = useTaskStatus(pullTaskId);

  useEffect(() => {
    if (!taskStatus || !pullTaskId) return;

    if (taskStatus.status === "SUCCESS") {
      setPullTaskId(undefined);
      setIsPulling(false);
      refetchExports();
      refetchRemoteFiles();
      const result = taskStatus.result;
      if (result?.total_downloaded > 0) {
        toast.success(
          `Pulled ${result.total_downloaded} file(s), processed ${result.total_processed || 0}`
        );
      } else {
        toast.info("No new pain.002 files found on SFTP");
      }
    } else if (taskStatus.status === "FAILURE") {
      setPullTaskId(undefined);
      setIsPulling(false);
      const errorMsg = taskStatus.result?.error || "Task failed";
      toast.error(`Pull failed: ${errorMsg}`);
    }
  }, [taskStatus, pullTaskId]);

  useEffect(() => {
    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const activeCredential = sftpCredentials.find((c: SFTPCredential) => c.is_active);
      if (activeCredential) {
        setSelectedSFTPCredentialId(activeCredential.id);
      } else {
        setSelectedSFTPCredentialId(sftpCredentials[0].id);
      }
    }
  }, [sftpCredentials, selectedSFTPCredentialId, selectedAccountId]);

  const exports = exportsData?.results || [];
  const remoteFiles = remoteFilesData?.files || [];
  const pain002Files = remoteFiles.filter(
    (f) => f.name.toLowerCase().includes("pain") || f.name.toLowerCase().includes(".002")
  );

  const handlePullFiles = async () => {
    if (!selectedSFTPCredentialId) return;
    try {
      setIsPulling(true);
      const result = await pullPain002.mutateAsync({
        sftp_credential_id: selectedSFTPCredentialId,
        auto_process: true,
      });
      if (result.task_id) {
        setPullTaskId(result.task_id);
        toast.info("Pulling bank responses...");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to pull pain.002 files";
      toast.error(message);
      setIsPulling(false);
    }
  };

  // Filter exports that have been uploaded (have bank response potential)
  const uploadedExports = exports.filter(
    (e) => e.status === "uploaded" || e.status === "processed" || e.status === "completed" || e.status === "partial" || e.status === "failed"
  );

  return (
    <div className="space-y-6">
      {/* Config Section */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-[#49a034]" />
            <h3 className="text-sm font-medium text-foreground">Bank Response (pain.002)</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pull payment status reports from the bank to track transaction outcomes
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Bank Account</Label>
              <Select
                value={selectedAccountId?.toString() || "all"}
                onValueChange={(value) => {
                  setSelectedAccountId(value === "all" ? undefined : Number(value));
                  setSelectedSFTPCredentialId(undefined);
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      {account.account_name} ({account.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">SFTP Connection</Label>
              <Select
                value={selectedSFTPCredentialId?.toString() || ""}
                onValueChange={(value) => setSelectedSFTPCredentialId(value ? Number(value) : undefined)}
                disabled={!selectedAccountId || credentialsLoading || sftpCredentials.length === 0}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue
                    placeholder={
                      credentialsLoading
                        ? "Loading..."
                        : sftpCredentials.length === 0
                        ? "No connections"
                        : "Select connection"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sftpCredentials.map((credential: SFTPCredential) => (
                    <SelectItem key={credential.id} value={credential.id.toString()}>
                      <div className="flex items-center gap-2">
                        <span>{credential.host}</span>
                        {credential.is_active && <span className="h-2 w-2 rounded-full bg-primary" />}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handlePullFiles}
                disabled={!selectedSFTPCredentialId || isPulling}
                className="h-10 bg-[#49a034] hover:bg-[#3d8a2b] btn-press"
              >
                {isPulling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {pullTaskId ? "Processing..." : "Pulling..."}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Pull Bank Responses
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedSFTPCredentialId && sftpCredentials.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              {(() => {
                const cred = sftpCredentials.find((c: SFTPCredential) => c.id === selectedSFTPCredentialId);
                if (!cred) return null;
                return (
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span>
                      <span className="text-muted-foreground/60">Host:</span> {cred.host}:{cred.port}
                    </span>
                    <span>
                      <span className="text-muted-foreground/60">Download:</span>{" "}
                      <code className="text-xs bg-muted px-1 rounded">{cred.download_path}</code>
                    </span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Remote Files Available */}
      {selectedAccountId && pain002Files.length > 0 && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-[#49a034]" />
                <h3 className="text-sm font-medium text-foreground">Available on SFTP</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{pain002Files.length} pain.002 files found</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRemoteFiles()}
              disabled={remoteFilesLoading}
              className="h-8 btn-press"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${remoteFilesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {pain002Files.map((file) => (
                <div
                  key={file.name}
                  className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded border border-border text-sm"
                >
                  <FileText className="h-3 w-3 text-muted-foreground/60" />
                  <span className="text-foreground">{file.name}</span>
                  <span className="text-muted-foreground/60">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Status List */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-[#49a034]" />
              <h3 className="text-sm font-medium text-foreground">Payment Export Status</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Track bank responses for uploaded payment files
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExports()}
            disabled={exportsLoading}
            className="h-8 btn-press"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${exportsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {exportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#49a034]" />
          </div>
        ) : uploadedExports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No uploaded exports yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Upload payment files from the SFTP Export tab to track their status
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {uploadedExports.map((exportFile) => (
              <ExportStatusCard
                key={exportFile.id}
                exportFile={exportFile}
                isSelected={selectedExportId === exportFile.id}
                onSelect={() => onSelectExport?.(exportFile.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* No account selected */}
      {!selectedAccountId && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm text-center py-12">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a bank account to view payment status</p>
        </div>
      )}
    </div>
  );
}
