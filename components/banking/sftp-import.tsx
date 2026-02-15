"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
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
  FolderOpen,
  AlertCircle,
} from "lucide-react";
import {
  useBankAccounts,
  useSFTPRemoteFiles,
  useSFTPDownloadStatements,
  useSFTPDownloadSingleFile,
  useSFTPTaskStatus,
  useSFTPTransferLogs,
  useSFTPCredentials,
  type SFTPRemoteFile,
  type SFTPCredential,
} from "@/hooks/use-banking";

interface SFTPImportProps {
  organizationId?: string;
  onImportComplete?: () => void;
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

export function SFTPImport({ organizationId, onImportComplete }: SFTPImportProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [autoImport, setAutoImport] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
    error: filesError,
  } = useSFTPRemoteFiles(selectedAccountId, selectedSFTPCredentialId);

  const { data: logsData } = useSFTPTransferLogs({
    bankAccountId: selectedAccountId,
    direction: "download",
    limit: 10,
  });

  const downloadStatements = useSFTPDownloadStatements();
  const downloadSingleFile = useSFTPDownloadSingleFile();
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
        refetchFiles();
        if (taskStatus.status === "SUCCESS" && onImportComplete) {
          onImportComplete();
        }
      }, 3000);
    }
  }, [taskStatus, onImportComplete, refetchFiles]);

  const files = filesData?.files || [];
  const downloadPath = filesData?.download_path || "";
  const transferLogs = logsData?.results || [];

  const handleSelectAll = () => {
    if (selectedFiles.size === files.filter((f) => !f.is_dir).length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(files.filter((f) => !f.is_dir).map((f) => f.name)));
    }
  };

  const handleSelectFile = (filename: string) => {
    const newSelection = new Set(selectedFiles);
    if (newSelection.has(filename)) {
      newSelection.delete(filename);
    } else {
      newSelection.add(filename);
    }
    setSelectedFiles(newSelection);
  };

  const handleDownloadAll = async () => {
    if (!selectedAccountId) return;
    try {
      const result = await downloadStatements.mutateAsync({
        bank_account_id: selectedAccountId,
        sftp_credential_id: selectedSFTPCredentialId,
        auto_import: autoImport,
        move_processed: true,
      });
      setActiveTaskId(result.task_id);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleDownloadSelected = async () => {
    if (!selectedAccountId || selectedFiles.size === 0) return;
    const filesToDownload = Array.from(selectedFiles);
    for (const filename of filesToDownload) {
      try {
        const result = await downloadSingleFile.mutateAsync({
          bank_account_id: selectedAccountId,
          sftp_credential_id: selectedSFTPCredentialId,
          filename,
          auto_import: autoImport,
          move_to_processed: true,
        });
        setActiveTaskId(result.task_id);
      } catch (error) {
        console.error(`Download failed for ${filename}:`, error);
      }
    }
    setSelectedFiles(new Set());
  };

  const handleDownloadFile = async (filename: string) => {
    if (!selectedAccountId) return;
    try {
      const result = await downloadSingleFile.mutateAsync({
        bank_account_id: selectedAccountId,
        sftp_credential_id: selectedSFTPCredentialId,
        filename,
        auto_import: autoImport,
        move_to_processed: true,
      });
      setActiveTaskId(result.task_id);
    } catch (error) {
      console.error(`Download failed for ${filename}:`, error);
    }
  };

  const isDownloading = downloadStatements.isPending || downloadSingleFile.isPending || !!activeTaskId;

  return (
    <div className="space-y-6">
      {/* Config Section */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-[#49a034]" />
            <h3 className="text-sm font-medium text-foreground">SFTP Import</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Download bank statement files from SFTP server</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Bank Account</Label>
              <Select
                value={selectedAccountId?.toString()}
                onValueChange={(value) => {
                  setSelectedAccountId(Number(value));
                  setSelectedFiles(new Set());
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
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
                  <SelectValue placeholder={
                    credentialsLoading ? "Loading..." :
                    sftpCredentials.length === 0 ? "No connections" :
                    "Select connection"
                  } />
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

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">Options</Label>
              <div className="flex items-center space-x-2 h-10 px-3 bg-muted rounded-md border border-border">
                <Checkbox
                  id="auto-import"
                  checked={autoImport}
                  onCheckedChange={(checked) => setAutoImport(!!checked)}
                />
                <Label htmlFor="auto-import" className="text-sm text-muted-foreground cursor-pointer">
                  Auto-import after download
                </Label>
              </div>
            </div>
          </div>

          {selectedSFTPCredentialId && sftpCredentials.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              {(() => {
                const cred = sftpCredentials.find((c: SFTPCredential) => c.id === selectedSFTPCredentialId);
                if (!cred) return null;
                return (
                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <span><span className="text-muted-foreground/60">Host:</span> {cred.host}:{cred.port}</span>
                    <span><span className="text-muted-foreground/60">Download:</span> <code className="text-xs bg-muted px-1 rounded">{cred.download_path}</code></span>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* Task Progress */}
      {activeTaskId && taskStatus && (
        <div className={`rounded-lg border p-4 flex items-center gap-3 ${
          taskStatus.status === "SUCCESS" ? "border-primary/20 bg-primary/5" :
          taskStatus.status === "FAILURE" ? "border-[#D4944A]/20 bg-[#D4944A]/10" :
          "border-[#6B8FB8]/20 bg-[#6B8FB8]/10"
        }`}>
          {taskStatus.status === "SUCCESS" ? (
            <CheckCircle2 className="h-5 w-5 text-primary" />
          ) : taskStatus.status === "FAILURE" ? (
            <XCircle className="h-5 w-5 text-[#D4944A]" />
          ) : (
            <Loader2 className="h-5 w-5 text-[#6B8FB8] animate-spin" />
          )}
          <span className={`text-sm font-medium ${
            taskStatus.status === "SUCCESS" ? "text-primary" :
            taskStatus.status === "FAILURE" ? "text-[#D4944A]" :
            "text-[#6B8FB8]"
          }`}>
            {taskStatus.status === "SUCCESS" ? (
              <>Download complete! {taskStatus.result?.files_downloaded ? `${taskStatus.result.files_downloaded} file(s)` : ""}</>
            ) : taskStatus.status === "FAILURE" ? (
              <>Failed: {taskStatus.result?.error || "Unknown error"}</>
            ) : (
              "Downloading files..."
            )}
          </span>
        </div>
      )}

      {/* Remote Files */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#49a034]" />
              <h3 className="text-sm font-medium text-foreground">Remote Files</h3>
            </div>
            {downloadPath && <p className="text-xs text-muted-foreground mt-1 font-mono">{downloadPath}</p>}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFiles()}
              disabled={!selectedAccountId || filesLoading}
              className="h-8 btn-press"
            >
              <RefreshCw className={`h-3 w-3 mr-1.5 ${filesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            {selectedFiles.size > 0 && (
              <Button size="sm" onClick={handleDownloadSelected} disabled={isDownloading} className="h-8 bg-[#49a034] hover:bg-[#3d8a2b] btn-press">
                <Download className="h-3 w-3 mr-1.5" />
                Download ({selectedFiles.size})
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleDownloadAll}
              disabled={!selectedAccountId || files.length === 0 || isDownloading}
              className="h-8 bg-[#49a034] hover:bg-[#3d8a2b] btn-press"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Download All
            </Button>
          </div>
        </div>

        {!selectedAccountId ? (
          <div className="text-center py-12">
            <Server className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Select a bank account</p>
          </div>
        ) : filesLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#49a034]" />
          </div>
        ) : filesError ? (
          <div className="text-center py-12">
            <AlertCircle className="h-8 w-8 text-[#D4944A] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">{(filesError as any)?.message || "Failed to connect to SFTP"}</p>
          </div>
        ) : files.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No files found</p>
          </div>
        ) : (
          <table className="w-full table-professional">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="w-10 px-4 py-3">
                  <Checkbox
                    checked={selectedFiles.size === files.filter((f) => !f.is_dir).length}
                    onCheckedChange={handleSelectAll}
                  />
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Filename</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">Modified</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-stagger">
              {files.map((file: SFTPRemoteFile) => (
                <tr key={file.name} className="row-interactive">
                  <td className="px-4 py-3">
                    {!file.is_dir && (
                      <Checkbox
                        checked={selectedFiles.has(file.name)}
                        onCheckedChange={() => handleSelectFile(file.name)}
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {file.is_dir ? (
                        <FolderOpen className="h-4 w-4 text-[#D4B35A]" />
                      ) : (
                        <FileText className="h-4 w-4 text-muted-foreground/60" />
                      )}
                      <span className={`text-sm ${file.is_dir ? "text-muted-foreground" : "text-foreground"}`}>{file.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{file.is_dir ? "-" : formatFileSize(file.size)}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(file.mtime)}</td>
                  <td className="px-4 py-3">
                    {!file.is_dir && (
                      <Button variant="ghost" size="icon" onClick={() => handleDownloadFile(file.name)} disabled={isDownloading} className="h-8 w-8">
                        <Download className="h-4 w-4 text-muted-foreground/60" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Recent Downloads */}
      {selectedAccountId && transferLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-[#49a034]" />
              <h3 className="text-sm font-medium text-foreground">Recent Downloads</h3>
            </div>
          </div>
          <table className="w-full table-professional">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-stagger">
              {transferLogs.map((log) => (
                <tr key={log.id} className="row-interactive">
                  <td className="px-6 py-3 text-sm text-foreground">{log.remote_file_path.split("/").pop()}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{log.file_size ? formatFileSize(log.file_size) : "-"}</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
                      log.status === "success" ? "bg-primary/5 text-primary" :
                      log.status === "failed" ? "bg-[#D4944A]/10 text-[#D4944A]" :
                      "bg-[#6B8FB8]/10 text-[#6B8FB8]"
                    }`}>
                      {log.status === "success" && <CheckCircle2 className="h-3 w-3" />}
                      {log.status === "failed" && <XCircle className="h-3 w-3" />}
                      {log.status === "in_progress" && <Loader2 className="h-3 w-3 animate-spin" />}
                      {log.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{formatDate(log.started_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
