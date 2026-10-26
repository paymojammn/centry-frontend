"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCard } from "@/components/layout/content-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import {
  Download,
  RefreshCw,
  FileText,
  Loader2,
  Inbox as InboxIcon,
  Search,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { api } from "@/lib/api";
import {
  useBankAccounts,
  usePain002RemoteFiles,
  usePain002Pull,
  useTaskStatus,
  useSFTPCredentials,
  type SFTPCredential,
} from "@/hooks/use-banking";

interface Pain002InboxProps {
  organizationId?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function Pain002Inbox({ organizationId }: Pain002InboxProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();
  const [isPulling, setIsPulling] = useState(false);
  const [pullTaskId, setPullTaskId] = useState<string | undefined>();
  const [fileSearch, setFileSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  const {
    data: remoteFilesData,
    isLoading: remoteFilesLoading,
    refetch: refetchRemoteFiles,
  } = usePain002RemoteFiles(selectedAccountId);

  const pullPain002 = usePain002Pull();
  const { data: taskStatus } = useTaskStatus(pullTaskId);

  useEffect(() => {
    if (!taskStatus || !pullTaskId) return;

    if (taskStatus.status === "SUCCESS") {
      setPullTaskId(undefined);
      setIsPulling(false);
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
  }, [taskStatus, pullTaskId, refetchRemoteFiles]);

  useEffect(() => {
    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const activeCredential = sftpCredentials.find((c: SFTPCredential) => c.is_active);
      setSelectedSFTPCredentialId(
        activeCredential ? activeCredential.id : sftpCredentials[0].id
      );
    }
  }, [sftpCredentials, selectedSFTPCredentialId]);

  const remoteFiles = remoteFilesData?.files || [];
  const pain002Files = remoteFiles.filter(
    (f) => f.name.toLowerCase().includes("pain") || f.name.toLowerCase().includes(".002")
  );

  const filteredFiles = useMemo(() => {
    const q = fileSearch.toLowerCase();
    return pain002Files.filter((f) => {
      if (statusFilter === "processed" && !f.archived) return false;
      if (statusFilter === "new" && f.archived) return false;
      if (q && !f.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [pain002Files, fileSearch, statusFilter]);

  const statusCount = (processed: boolean) =>
    pain002Files.filter((f) => !!f.archived === processed).length;

  const hasFileFilters = fileSearch !== "" || statusFilter !== "all";

  const handleDownload = async (filename: string) => {
    if (!selectedAccountId) return;
    try {
      const url = `/api/v1/banking/pain002/files/${selectedAccountId}/${encodeURIComponent(filename)}/download/${
        selectedSFTPCredentialId ? `?sftp_credential_id=${selectedSFTPCredentialId}` : ""
      }`;
      const blob = await api.get<Blob>(url, { responseType: "blob" });
      const objectUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Download failed";
      toast.error(message);
    }
  };

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

  return (
    <ContentCard noPadding>
      {/* Toolbar: status pills + account/connection/pull + search (bills-grid style) */}
      <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
        {([
          { value: "all", label: "All", count: pain002Files.length },
          { value: "new", label: "New", count: statusCount(false) },
          { value: "processed", label: "Processed", count: statusCount(true) },
        ]).map((p) => {
          const active = statusFilter === p.value;
          return (
            <button
              key={p.value}
              onClick={() => setStatusFilter(p.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
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
              <SelectValue placeholder="Select account" />
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

          <Button
            onClick={handlePullFiles}
            disabled={!selectedSFTPCredentialId || isPulling}
            size="sm"
            className="h-9 btn-press"
          >
            {isPulling ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                {pullTaskId ? "Processing..." : "Pulling..."}
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-1.5" />
                Pull
              </>
            )}
          </Button>

          <div className="relative w-44">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <Input
              placeholder="Search files..."
              value={fileSearch}
              onChange={(e) => setFileSearch(e.target.value)}
              className="pl-9 h-9"
            />
          </div>

          {hasFileFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFileSearch("");
                setStatusFilter("all");
              }}
              className="h-9 text-muted-foreground"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchRemoteFiles()}
            disabled={remoteFilesLoading || !selectedAccountId}
            title="Refresh"
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${remoteFilesLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Body */}
      {!selectedAccountId ? (
        <EmptyState
          icon={InboxIcon}
          title="Select a bank account"
          description="Choose an account, then pull bank responses from SFTP"
        />
      ) : remoteFilesLoading ? (
        <LoadingState />
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          icon={InboxIcon}
          title={hasFileFilters ? "No files match your filters" : "Inbox is empty"}
          description={
            hasFileFilters
              ? "Try adjusting your filters"
              : "Pull bank responses from SFTP to see files here"
          }
        />
      ) : (
        <div className="overflow-auto max-h-[calc(100vh-350px)]">
          <table className="w-full table-professional">
            <colgroup>
              <col className="w-[140px]" />{/* Received */}
              <col />{/* Filename — flexible */}
              <col className="w-[140px]" />{/* Status */}
              <col className="w-[90px]" />{/* Size */}
              <col className="w-[56px]" />{/* Download */}
            </colgroup>
            <thead>
              <tr>
                <th>Received</th>
                <th>Filename</th>
                <th>Status</th>
                <th className="text-right">Size</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredFiles.map((file) => (
                <tr key={file.name}>
                  <td className="cell-muted">
                    {format(new Date(file.mtime), "dd MMM yyyy")}
                    <span className="cell-sub">{format(new Date(file.mtime), "HH:mm")}</span>
                  </td>
                  <td className="cell-primary">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
                      <span className="truncate" title={file.name}>
                        {file.name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span
                      className={`status-pill ${
                        file.archived
                          ? "bg-success-500/10 text-success-700 border-success-500/20"
                          : "bg-info-500/10 text-info-700 border-info-500/20"
                      }`}
                    >
                      {file.archived ? "Processed" : "New"}
                    </span>
                  </td>
                  <td className="cell-amount cell-muted">{formatFileSize(file.size)}</td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      title="Download"
                      aria-label={`Download ${file.name}`}
                      onClick={() => handleDownload(file.name)}
                    >
                      <Download className="h-3.5 w-3.5" />
                    </Button>
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
