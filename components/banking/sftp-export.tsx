"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ContentCard } from "@/components/layout/content-card";
import {
  Upload,
  RefreshCw,
  Loader2,
  Download,
  Search,
} from "lucide-react";
import {
  useBankAccounts,
  useBankPaymentExports,
  useSFTPUpload,
  useSFTPTaskStatus,
  useSFTPCredentials,
  type BankPaymentExport,
  type SFTPCredential,
} from "@/hooks/use-banking";
import { api } from "@/lib/api";
import { PILL_COLORS } from "@/lib/theme";

interface SFTPExportProps {
  organizationId?: string;
  onExportComplete?: () => void;
  onSelectExport?: (exportId: number) => void;
  selectedExportId?: number;
  /** Initial status-pill filter (All/Ready/Uploaded), e.g. deep-linked in. */
  initialStatus?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(parseFloat(amount));
}

function renderStatusBadge(status: string) {
  const style =
    status === "uploaded"
      ? "bg-blue-500/10 text-blue-700 border-blue-500/20"
      : status === "processed"
      ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20"
      : status === "failed"
      ? "bg-red-500/10 text-red-700 border-red-500/20"
      : "bg-amber-500/10 text-amber-700 border-amber-500/20";
  const label =
    status === "generated" || status === "pending"
      ? "Ready"
      : status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span
      className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-normal border ${style}`}
    >
      {label}
    </span>
  );
}

export function SFTPExport({ organizationId, onExportComplete, initialStatus }: SFTPExportProps) {
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
  } = useBankPaymentExports({
    bankAccountId: selectedAccountId,
    organizationId,
  });

  const uploadFile = useSFTPUpload();
  const { data: taskStatus } = useSFTPTaskStatus(activeTaskId);

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

  useEffect(() => {
    if (taskStatus?.status === "SUCCESS" || taskStatus?.status === "FAILURE") {
      setTimeout(() => {
        setActiveTaskId(undefined);
        setUploadingFileId(undefined);
        refetchExports();
        if (taskStatus.status === "SUCCESS" && onExportComplete) {
          onExportComplete();
        }
      }, 3000);
    }
  }, [taskStatus, onExportComplete, refetchExports]);

  const exports = exportsData?.results || [];

  const isReady = (e: BankPaymentExport) =>
    e.status === "generated" || e.status === "pending";
  const isUploaded = (e: BankPaymentExport) =>
    e.status === "uploaded" || e.status === "processed";

  const pendingExports = exports.filter(isReady);
  const uploadedExports = exports.filter(isUploaded);

  const filteredExports = exports.filter((e) => {
    if (statusFilter === "ready" && !isReady(e)) return false;
    if (statusFilter === "uploaded" && !isUploaded(e)) return false;
    if (fileSearch) {
      const q = fileSearch.toLowerCase();
      if (
        !(e.file_name || "").toLowerCase().includes(q) &&
        !(e.bank_account?.account_name || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const handleUploadFile = async (exportFile: BankPaymentExport) => {
    if (!exportFile.bank_account?.id || !selectedSFTPCredentialId) return;
    try {
      setUploadingFileId(exportFile.id);
      const result = await uploadFile.mutateAsync({
        bank_account_id: exportFile.bank_account.id,
        sftp_credential_id: selectedSFTPCredentialId,
        file_path: exportFile.file_path,
        remote_filename: exportFile.file_name,
        export_id: exportFile.id,
        async_upload: true,
      });
      if (result.task_id) setActiveTaskId(result.task_id);
    } catch (error) {
      setUploadingFileId(undefined);
    }
  };

  const handleDownloadFile = async (exportFile: BankPaymentExport) => {
    try {
      setDownloadingFileId(exportFile.id);
      const blob = await api.get<Blob>(
        `/api/v1/banking/exports/files/${exportFile.id}/`,
        { responseType: "blob" }
      );
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

  const isUploading = uploadFile.isPending || !!activeTaskId;
  const hasFilters = fileSearch !== "" || statusFilter !== "all";

  return (
    <ContentCard noPadding>
      {/* Toolbar: status pills + account/connection + search/refresh (bills-grid style) */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        {([
          { value: "all", label: "All", count: exports.length, color: undefined },
          { value: "ready", label: "Ready", count: pendingExports.length, color: "#D4B35A" },
          { value: "uploaded", label: "Uploaded", count: uploadedExports.length, color: PILL_COLORS.uploaded },
        ]).map((p) => {
          const active = statusFilter === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setStatusFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                active
                  ? p.color
                    ? "text-white"
                    : "bg-foreground text-card"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
              style={active && p.color ? { backgroundColor: p.color } : undefined}
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
                placeholder={
                  credentialsLoading
                    ? "Loading..."
                    : sftpCredentials.length === 0
                    ? "No connection"
                    : "Connection"
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

          <div className="relative w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search files..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchExports()}
            disabled={exportsLoading}
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${exportsLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      {exportsLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredExports.length === 0 ? (
        <div className="text-center py-20">
          <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
            <Upload className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-normal text-foreground">
            {hasFilters ? "No files match your filters" : "No payment files"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {hasFilters
              ? "Try adjusting your filters"
              : "Generate payment files from the Payments page"}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Filename</div>
            <div className="col-span-2">Account</div>
            <div className="col-span-1 text-center">Payments</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-2"></div>
          </div>
          <div className="divide-y divide-border max-h-[calc(100vh-350px)] overflow-y-auto">
            {filteredExports.map((e) => (
              <div
                key={e.id}
                className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
              >
                <div className="col-span-2 text-muted-foreground tabular-nums">
                  {e.created_at ? format(new Date(e.created_at), "dd MMM yyyy") : "—"}
                  {e.created_at && (
                    <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                      {format(new Date(e.created_at), "HH:mm")}
                    </p>
                  )}
                </div>
                <div className="col-span-3 min-w-0">
                  <p className="text-foreground truncate">{e.file_name || "—"}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {e.file_size ? formatFileSize(e.file_size) : "—"}
                  </p>
                </div>
                <div className="col-span-2 min-w-0">
                  <p className="text-[12px] text-muted-foreground truncate">
                    {e.bank_account?.account_name || "—"}
                  </p>
                </div>
                <div className="col-span-1 text-center">
                  <span className="tabular-nums text-foreground">{e.payment_count}</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="tabular-nums text-foreground">
                    {formatCurrency(e.total_amount, e.currency)}
                  </span>
                </div>
                <div className="col-span-1">{renderStatusBadge(e.status)}</div>
                <div className="col-span-2 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownloadFile(e)}
                    disabled={downloadingFileId === e.id}
                    className="h-8 btn-press"
                  >
                    {downloadingFileId === e.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                  </Button>
                  {isReady(e) && (
                    <Button
                      size="sm"
                      onClick={() => handleUploadFile(e)}
                      disabled={isUploading || uploadingFileId === e.id || !selectedSFTPCredentialId}
                      className="h-8 bg-primary hover:bg-primary/90 btn-press"
                    >
                      {uploadingFileId === e.id ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3 mr-1" />
                      )}
                      Upload
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </ContentCard>
  );
}
