"use client";

/**
 * Banking → Dashboard · Files tab
 *
 * The single list of bank payment files (BankPaymentExport). Replaces the
 * former Upload + Outbox tabs, which listed the same rows twice. One grid,
 * every status, with Download / Upload / Details on the row.
 *
 * Upload is self-healing: a file whose value date has lapsed is regenerated
 * with the earliest date the bank accepts, then uploaded; a 409 from the
 * bank-side guard is retried the same way. Both dates are persisted on the
 * export (`created_at`, `sftp_uploaded_at`) and shown as a pair.
 */

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentCard } from "@/components/layout/content-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { Upload, RefreshCw, Loader2, Download, Search, FolderOpen, ListTree } from "lucide-react";
import { toast } from "sonner";
import {
  useBankAccounts,
  useBankPaymentExports,
  useSFTPUpload,
  useSFTPTaskStatus,
  useSFTPCredentials,
  useRegenerateExport,
  type BankPaymentExport,
  type SFTPCredential,
} from "@/hooks/use-banking";
import { api } from "@/lib/api";
import { parseIsoDate } from "@/lib/value-date";

interface SFTPExportProps {
  organizationId?: string;
  onExportComplete?: () => void;
  onSelectExport?: (exportId: number) => void;
  selectedExportId?: number;
  /** Initial status-pill filter, e.g. deep-linked from the dashboard. */
  initialStatus?: string;
  /** Whether the viewer may upload (banking.export); everyone may download. */
  canUpload?: boolean;
}

// One vocabulary for file status across the banking tabs.
const FILE_STATUS: Record<string, { label: string; pill: string }> = {
  generated: { label: "Ready", pill: "bg-warning-500/10 text-warning-700 border-warning-500/20" },
  pending: { label: "Ready", pill: "bg-warning-500/10 text-warning-700 border-warning-500/20" },
  uploading: { label: "Uploading", pill: "bg-info-500/10 text-info-700 border-info-500/20" },
  uploaded: { label: "Awaiting bank", pill: "bg-info-500/10 text-info-700 border-info-500/20" },
  processed: { label: "Processed", pill: "bg-success-500/10 text-success-700 border-success-500/20" },
  failed: { label: "Failed", pill: "bg-danger-500/10 text-danger-700 border-danger-500/20" },
  superseded: { label: "Superseded", pill: "bg-muted text-muted-foreground border-border" },
};

function FileStatus({ status }: { status: string }) {
  const s = FILE_STATUS[status] || { label: status, pill: "bg-muted text-muted-foreground border-border" };
  return <span className={`status-pill ${s.pill}`}>{s.label}</span>;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatAmount(amount: string): string {
  return parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

function formatValueDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return parseIsoDate(iso).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

function DateCell({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  const d = new Date(iso);
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm")}</span>
    </>
  );
}

export function SFTPExport({
  organizationId,
  onExportComplete,
  onSelectExport,
  selectedExportId,
  initialStatus,
  canUpload: mayUpload = true,
}: SFTPExportProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [uploadingFileId, setUploadingFileId] = useState<number | undefined>();
  const [downloadingFileId, setDownloadingFileId] = useState<number | undefined>();
  const [statusFilter, setStatusFilter] = useState(initialStatus || "all");
  const [fileSearch, setFileSearch] = useState("");

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  const {
    data: exportsData,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useBankPaymentExports({ bankAccountId: selectedAccountId, organizationId });

  const uploadFile = useSFTPUpload();
  const regenerate = useRegenerateExport();
  const { data: taskStatus } = useSFTPTaskStatus(activeTaskId);

  useEffect(() => {
    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const activeCredential = sftpCredentials.find((c: SFTPCredential) => c.is_active);
      setSelectedSFTPCredentialId(activeCredential ? activeCredential.id : sftpCredentials[0].id);
    }
  }, [sftpCredentials, selectedSFTPCredentialId, selectedAccountId]);

  useEffect(() => {
    if (taskStatus?.status === "SUCCESS" || taskStatus?.status === "FAILURE") {
      setTimeout(() => {
        setActiveTaskId(undefined);
        setUploadingFileId(undefined);
        refetchExports();
        if (taskStatus.status === "SUCCESS" && onExportComplete) onExportComplete();
      }, 3000);
    }
  }, [taskStatus, onExportComplete, refetchExports]);

  const exports = exportsData?.results || [];

  const isReady = (e: BankPaymentExport) => e.status === "generated" || e.status === "pending";
  // A file whose value date the bank can no longer honour is refreshed as part
  // of Upload (the backend refuses a stale date — Stanbic would bounce it with FI/E8).
  const isStale = (e: BankPaymentExport) => (isReady(e) || e.status === "failed") && !!e.value_date_passed;
  const canUpload = (e: BankPaymentExport) => isReady(e) || isStale(e);

  const count = (pred: (e: BankPaymentExport) => boolean) => exports.filter(pred).length;
  const pills = [
    { value: "all", label: "All", count: count((e) => e.status !== "superseded") },
    { value: "ready", label: "Ready", count: count(canUpload) },
    { value: "uploaded", label: "Awaiting bank", count: count((e) => e.status === "uploaded") },
    { value: "processed", label: "Processed", count: count((e) => e.status === "processed") },
    { value: "failed", label: "Failed", count: count((e) => e.status === "failed") },
    { value: "superseded", label: "Superseded", count: count((e) => e.status === "superseded") },
  ];

  const filteredExports = exports.filter((e) => {
    if (statusFilter === "ready" && !canUpload(e)) return false;
    if (statusFilter === "uploaded" && e.status !== "uploaded") return false;
    if (statusFilter === "processed" && e.status !== "processed") return false;
    if (statusFilter === "failed" && e.status !== "failed") return false;
    if (statusFilter === "superseded" && e.status !== "superseded") return false;
    // Replaced files are history; only show them when asked for explicitly.
    if (statusFilter === "all" && e.status === "superseded") return false;
    if (fileSearch) {
      const q = fileSearch.toLowerCase();
      if (
        !(e.file_name || "").toLowerCase().includes(q) &&
        !(e.bank_account?.account_name || "").toLowerCase().includes(q) &&
        !(e.currency || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const uploadExport = (exportFile: BankPaymentExport, credentialId: number) =>
    uploadFile.mutateAsync({
      bank_account_id: exportFile.bank_account.id,
      sftp_credential_id: credentialId,
      file_path: exportFile.file_path,
      remote_filename: exportFile.file_name,
      export_id: exportFile.id,
      async_upload: true,
    });

  // Regenerate the file with the earliest value date the bank accepts now and
  // return the replacement (uploaded with the connection chosen on this tab).
  const refreshExport = async (exportFile: BankPaymentExport) => {
    const result = await regenerate.mutateAsync({ exportId: exportFile.id });
    return result.export;
  };

  const handleUploadFile = async (exportFile: BankPaymentExport) => {
    if (!exportFile.bank_account?.id || !selectedSFTPCredentialId) return;
    const credentialId = selectedSFTPCredentialId;
    try {
      setUploadingFileId(exportFile.id);
      let target = exportFile;
      if (isStale(exportFile)) target = await refreshExport(exportFile);
      let result;
      try {
        result = await uploadExport(target, credentialId);
      } catch (error: any) {
        if (error?.response?.data?.code !== "value_date_passed") throw error;
        target = await refreshExport(target);
        result = await uploadExport(target, credentialId);
      }
      if (target.id !== exportFile.id) {
        toast.success(
          `Payment date updated to ${formatValueDate(target.requested_execution_date)}; uploading ${target.file_name}`,
        );
        setUploadingFileId(target.id);
        refetchExports();
      }
      if (result.task_id) setActiveTaskId(result.task_id);
    } catch (error: any) {
      setUploadingFileId(undefined);
      toast.error(error?.response?.data?.error || error?.message || "Upload failed");
    }
  };

  const handleDownloadFile = async (exportFile: BankPaymentExport) => {
    try {
      setDownloadingFileId(exportFile.id);
      const blob = await api.get<Blob>(`/api/v1/banking/exports/files/${exportFile.id}/`, { responseType: "blob" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportFile.file_name || "export.xml";
      a.click();
      window.URL.revokeObjectURL(url);
    } finally {
      setDownloadingFileId(undefined);
    }
  };

  const isUploading = uploadFile.isPending || regenerate.isPending || !!activeTaskId;
  const hasFilters = fileSearch !== "" || statusFilter !== "all";

  return (
    <ContentCard noPadding>
      {/* Toolbar: status pills + account/connection + search/refresh */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        {pills.map((p) => {
          const active = statusFilter === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setStatusFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
              }`}
            >
              {p.label} ({p.count})
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <Select
            value={selectedAccountId?.toString() || "all"}
            onValueChange={(value) => {
              setSelectedAccountId(value === "all" ? undefined : Number(value));
              setSelectedSFTPCredentialId(undefined);
            }}
            disabled={accountsLoading}
          >
            <SelectTrigger className="w-[190px] h-9">
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

          <Select
            value={selectedSFTPCredentialId?.toString() || ""}
            onValueChange={(value) => setSelectedSFTPCredentialId(value ? Number(value) : undefined)}
            disabled={!selectedAccountId || credentialsLoading || sftpCredentials.length === 0}
          >
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue
                placeholder={credentialsLoading ? "Loading..." : sftpCredentials.length === 0 ? "No connection" : "Connection"}
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

          <div className="relative w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input placeholder="Search files..." value={fileSearch} onChange={(e) => setFileSearch(e.target.value)} className="pl-9 h-9" />
          </div>

          <Button variant="outline" size="sm" onClick={() => refetchExports()} disabled={exportsLoading} className="h-9 btn-press" aria-label="Refresh">
            <RefreshCw className={`h-3.5 w-3.5 ${exportsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      {exportsLoading ? (
        <LoadingState />
      ) : filteredExports.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={hasFilters ? "No files match your filters" : "No payment files yet"}
          description={hasFilters ? "Try adjusting your filters" : "Generate a payment file from Bills to see it here"}
        />
      ) : (
        <div className="table-scroll-container">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Created</th>
                <th>File</th>
                <th>Account</th>
                <th>Value date</th>
                <th>Uploaded</th>
                <th className="text-right">Payments</th>
                <th className="cell-currency">Ccy</th>
                <th className="text-right">Amount</th>
                <th>Status</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              {filteredExports.map((e) => (
                <tr key={e.id} className={selectedExportId === e.id ? "is-selected" : undefined}>
                  <td className="cell-muted whitespace-nowrap">
                    <DateCell iso={e.created_at} />
                  </td>
                  <td className="cell-primary">
                    <span className="block truncate max-w-[220px]">{e.file_name || "—"}</span>
                    <span className="cell-sub">
                      {e.file_size ? formatFileSize(e.file_size) : "—"}
                      {e.superseded_by ? ` · replaced by #${e.superseded_by}` : ""}
                    </span>
                  </td>
                  <td className="cell-muted">
                    <span className="block truncate max-w-[160px]">{e.bank_account?.account_name || "—"}</span>
                  </td>
                  <td
                    className={`whitespace-nowrap tabular-nums ${e.value_date_passed ? "text-danger-700" : ""}`}
                    title={
                      e.value_date_passed
                        ? `The bank can no longer pay on this date. Upload moves it to ${formatValueDate(e.earliest_value_date)}.`
                        : undefined
                    }
                  >
                    {formatValueDate(e.requested_execution_date)}
                  </td>
                  <td className="cell-muted whitespace-nowrap">
                    <DateCell iso={e.sftp_uploaded_at} />
                  </td>
                  <td className="cell-amount">{e.payment_count}</td>
                  <td className="cell-currency">{e.currency}</td>
                  <td className="cell-amount">{formatAmount(e.total_amount)}</td>
                  <td>
                    <FileStatus status={e.status} />
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      {onSelectExport && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                          onClick={() => onSelectExport(e.id)}
                          aria-label="Details"
                          title="Payments in this file"
                        >
                          <ListTree className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-primary"
                        onClick={() => handleDownloadFile(e)}
                        disabled={downloadingFileId === e.id}
                        aria-label="Download"
                        title="Download file"
                      >
                        {downloadingFileId === e.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
                      </Button>
                      {mayUpload && canUpload(e) && (
                        <Button
                          size="sm"
                          onClick={() => handleUploadFile(e)}
                          disabled={isUploading || uploadingFileId === e.id || !selectedSFTPCredentialId}
                          className="h-8 btn-press"
                        >
                          {uploadingFileId === e.id ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Upload className="h-3 w-3 mr-1" />}
                          Upload
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ContentCard>
  );
}
