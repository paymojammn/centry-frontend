"use client";

import { useState, useEffect } from "react";
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Accepted
        </span>
      );
    case "ACWC":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
          <AlertTriangle className="h-3 w-3" />
          Accepted with Change
        </span>
      );
    case "PDNG":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          <Clock className="h-3 w-3" />
          Pending
        </span>
      );
    case "RJCT":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          <XCircle className="h-3 w-3" />
          Rejected
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700">
          {status || "Unknown"}
        </span>
      );
  }
}

function getGroupStatusBadge(status: string | null) {
  switch (status) {
    case "RCVD":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          Received
        </span>
      );
    case "ACSP":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          All Accepted
        </span>
      );
    case "PART":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
          Partial
        </span>
      );
    case "PDNG":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          Pending
        </span>
      );
    case "RJCT":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          <FileCheck className="h-3 w-3" />
          ACK
        </span>
      );
    case "NACK":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700">
          <XCircle className="h-3 w-3" />
          NACK
        </span>
      );
    case "INTERIM":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          Interim
        </span>
      );
    case "FINAL":
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700">
          Final
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-700">
          {type}
        </span>
      );
  }
}

function TransactionStatusRow({ tx }: { tx: PaymentTransactionStatus }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <tr className="hover:bg-gray-50">
        <td className="px-4 py-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </td>
        <td className="px-4 py-2">
          <p className="text-sm font-mono text-gray-900">{tx.original_end_to_end_id}</p>
        </td>
        <td className="px-4 py-2">
          {getStatusBadge(tx.status)}
        </td>
        <td className="px-4 py-2 text-sm text-gray-600">
          {tx.status_code || "-"}
        </td>
        <td className="px-4 py-2 text-sm text-gray-900">
          {formatCurrency(tx.original_amount, tx.original_currency)}
        </td>
        <td className="px-4 py-2 text-sm text-gray-600">
          {tx.payment_event_id ? `#${tx.payment_event_id}` : "-"}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-gray-50/50">
          <td colSpan={6} className="px-4 py-3">
            <div className="ml-6 space-y-2 text-sm">
              {tx.creditor_name && (
                <div>
                  <span className="font-medium text-gray-500">Creditor:</span>{" "}
                  <span className="text-gray-900">{tx.creditor_name}</span>
                </div>
              )}
              {tx.invoice_number && (
                <div>
                  <span className="font-medium text-gray-500">Invoice:</span>{" "}
                  <span className="text-gray-900">{tx.invoice_number}</span>
                </div>
              )}
              {tx.status_description && (
                <div>
                  <span className="font-medium text-gray-500">Description:</span>{" "}
                  <span className="text-gray-900">{tx.status_description}</span>
                </div>
              )}
              {tx.original_instruction_id && (
                <div>
                  <span className="font-medium text-gray-500">Instruction ID:</span>{" "}
                  <span className="font-mono text-gray-900">{tx.original_instruction_id}</span>
                </div>
              )}
              {tx.additional_info && tx.additional_info.length > 0 && (
                <div>
                  <span className="font-medium text-gray-500">Additional Info:</span>
                  <ul className="list-disc list-inside mt-1 text-gray-700">
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
      className={`bg-white rounded-lg border transition-colors ${
        isSelected ? "border-[#49a034] ring-1 ring-[#49a034]/20" : "border-gray-200"
      }`}
    >
      <div
        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-50"
        onClick={() => {
          setIsExpanded(!isExpanded);
          onSelect();
        }}
      >
        <div className="flex items-center gap-3">
          <button className="text-gray-400 hover:text-gray-600">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
          <div>
            <p className="text-sm font-medium text-gray-900">{exportFile.file_name}</p>
            <p className="text-xs text-gray-500">
              {exportFile.payment_count} payments · {formatCurrency(exportFile.total_amount, exportFile.currency)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {latestStatus ? (
            <div className="flex items-center gap-2">
              {getReportTypeBadge(latestStatus.report_type)}
              {getGroupStatusBadge(latestStatus.group_status)}
              <div className="text-xs text-gray-500">
                {latestStatus.successful_count}/{latestStatus.total_transactions} OK
              </div>
            </div>
          ) : statusesLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
          ) : (
            <span className="text-xs text-gray-400">No bank response yet</span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100">
          {statusesLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-6 w-6 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Awaiting bank response</p>
              <p className="text-xs text-gray-400 mt-1">
                Pull pain.002 files from SFTP to get status updates
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
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
          <span className="text-xs text-gray-500">
            {formatDate(status.received_at)}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-green-600">{status.successful_count} accepted</span>
          <span className="text-red-600">{status.rejected_count} rejected</span>
          <span className="text-blue-600">{status.pending_count} pending</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-3 text-sm">
        <div>
          <span className="text-gray-500">Message ID:</span>
          <p className="font-mono text-xs text-gray-900 truncate">{status.message_id}</p>
        </div>
        <div>
          <span className="text-gray-500">Original Message:</span>
          <p className="font-mono text-xs text-gray-900 truncate">{status.original_message_id}</p>
        </div>
        <div>
          <span className="text-gray-500">Source:</span>
          <p className="text-xs text-gray-900">{status.source_file || "-"}</p>
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
        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
          {detailLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-6 text-sm text-gray-500">
              No transaction details available
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="w-8 px-4 py-2"></th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">End-to-End ID</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Code</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Amount</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
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
      await pullPain002.mutateAsync({
        sftp_credential_id: selectedSFTPCredentialId,
        auto_process: true,
      });
      refetchExports();
      refetchRemoteFiles();
    } catch (error) {
      console.error("Failed to pull pain.002 files:", error);
    } finally {
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
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Bank Response (pain.002)</h3>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Pull payment status reports from the bank to track transaction outcomes
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Bank Account</Label>
              <Select
                value={selectedAccountId?.toString() || "all"}
                onValueChange={(value) => {
                  setSelectedAccountId(value === "all" ? undefined : Number(value));
                  setSelectedSFTPCredentialId(undefined);
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
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
              <Label className="text-sm font-medium text-gray-700">SFTP Connection</Label>
              <Select
                value={selectedSFTPCredentialId?.toString() || ""}
                onValueChange={(value) => setSelectedSFTPCredentialId(value ? Number(value) : undefined)}
                disabled={!selectedAccountId || credentialsLoading || sftpCredentials.length === 0}
              >
                <SelectTrigger className="h-10 bg-gray-50 border-gray-200">
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
                        {credential.is_active && <span className="h-2 w-2 rounded-full bg-green-500" />}
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
                className="h-10 bg-[#49a034] hover:bg-[#547568]"
              >
                {isPulling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Pulling...
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
            <div className="mt-4 pt-4 border-t border-gray-100">
              {(() => {
                const cred = sftpCredentials.find((c: SFTPCredential) => c.id === selectedSFTPCredentialId);
                if (!cred) return null;
                return (
                  <div className="flex items-center gap-6 text-sm text-gray-600">
                    <span>
                      <span className="text-gray-400">Host:</span> {cred.host}:{cred.port}
                    </span>
                    <span>
                      <span className="text-gray-400">Download:</span>{" "}
                      <code className="text-xs bg-gray-100 px-1 rounded">{cred.download_path}</code>
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
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <h3 className="text-sm font-medium text-gray-900">Available on SFTP</h3>
              </div>
              <p className="text-xs text-gray-500 mt-1">{pain002Files.length} pain.002 files found</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchRemoteFiles()}
              disabled={remoteFilesLoading}
              className="h-8"
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
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded border border-gray-200 text-sm"
                >
                  <FileText className="h-3 w-3 text-gray-400" />
                  <span className="text-gray-900">{file.name}</span>
                  <span className="text-gray-400">{formatFileSize(file.size)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Export Status List */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FileCheck className="h-4 w-4 text-gray-400" />
              <h3 className="text-sm font-medium text-gray-900">Payment Export Status</h3>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Track bank responses for uploaded payment files
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExports()}
            disabled={exportsLoading}
            className="h-8"
          >
            <RefreshCw className={`h-3 w-3 mr-1.5 ${exportsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {exportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : uploadedExports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No uploaded exports yet</p>
            <p className="text-xs text-gray-400 mt-1">
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
        <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
          <AlertCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">Select a bank account to view payment status</p>
        </div>
      )}
    </div>
  );
}
