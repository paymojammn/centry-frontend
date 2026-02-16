"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Upload,
  RefreshCw,
  FileText,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  AlertCircle,
  Eye,
} from "lucide-react";
import {
  useBankAccounts,
  useBankPaymentExports,
  useSFTPUpload,
  useSFTPTaskStatus,
  useSFTPTransferLogs,
  useLocalExportFiles,
  useSFTPCredentials,
  type BankPaymentExport,
  type LocalExportFile,
  type SFTPCredential,
} from "@/hooks/use-banking";

interface SFTPExportProps {
  organizationId?: string;
  onExportComplete?: () => void;
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

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(parseFloat(amount));
}

export function SFTPExport({ organizationId, onExportComplete, onSelectExport, selectedExportId }: SFTPExportProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [uploadingFileId, setUploadingFileId] = useState<number | undefined>();
  const [uploadingLocalFile, setUploadingLocalFile] = useState<string | undefined>();

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
    data: localFilesData,
    isLoading: localFilesLoading,
    refetch: refetchLocalFiles,
  } = useLocalExportFiles(selectedAccountId);

  const { data: logsData } = useSFTPTransferLogs({
    bankAccountId: selectedAccountId,
    direction: "upload",
    limit: 10,
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
        setUploadingLocalFile(undefined);
        refetchExports();
        refetchLocalFiles();
        if (taskStatus.status === "SUCCESS" && onExportComplete) {
          onExportComplete();
        }
      }, 3000);
    }
  }, [taskStatus, onExportComplete, refetchExports, refetchLocalFiles]);

  const exports = exportsData?.results || [];
  const transferLogs = logsData?.results || [];
  const localFiles = localFilesData?.files || [];

  const pendingExports = exports.filter((e) => e.status === "generated" || e.status === "pending");
  const uploadedExports = exports.filter((e) => e.status === "uploaded" || e.status === "processed");

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

  const handleUploadLocalFile = async (localFile: LocalExportFile) => {
    if (!selectedAccountId || !selectedSFTPCredentialId) return;
    try {
      setUploadingLocalFile(localFile.absolute_path);
      const result = await uploadFile.mutateAsync({
        bank_account_id: selectedAccountId,
        sftp_credential_id: selectedSFTPCredentialId,
        file_path: localFile.absolute_path,
        remote_filename: localFile.filename,
        async_upload: true,
      });
      if (result.task_id) setActiveTaskId(result.task_id);
    } catch (error) {
      setUploadingLocalFile(undefined);
    }
  };

  const isUploading = uploadFile.isPending || !!activeTaskId;

  return (
    <div className="space-y-6">
      {/* Config Section */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">SFTP Export</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">Upload payment files to bank SFTP server</p>
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

            <div className="flex items-end gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-[#D4B35A]/10 rounded border border-[#D4B35A]/20">
                <span className="h-2 w-2 rounded-full bg-[#D4B35A]" />
                <span className="text-sm font-medium text-[#D4B35A]">{pendingExports.length} pending</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 bg-primary/5 rounded border border-primary/20">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <span className="text-sm font-medium text-primary">{uploadedExports.length} uploaded</span>
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
                    <span><span className="text-muted-foreground/60">Upload:</span> <code className="text-xs bg-muted px-1 rounded">{cred.upload_path}</code></span>
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
            {taskStatus.status === "SUCCESS" ? "File uploaded successfully!" :
             taskStatus.status === "FAILURE" ? `Upload failed: ${taskStatus.result?.error || "Unknown error"}` :
             "Uploading file..."}
          </span>
        </div>
      )}

      {/* Pending Exports */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Ready for Upload</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{pendingExports.length} files pending</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetchExports()} disabled={exportsLoading} className="h-8 btn-press">
            <RefreshCw className={`h-3 w-3 mr-1.5 ${exportsLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {exportsLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : pendingExports.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No payment files ready</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Generate payment files from the Payments page</p>
          </div>
        ) : (
          <table className="w-full table-professional">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Bank Account</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Payments</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                <th className="w-32"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-stagger">
              {pendingExports.map((exportFile: BankPaymentExport) => (
                <tr
                  key={exportFile.id}
                  className={`row-interactive cursor-pointer ${selectedExportId === exportFile.id ? 'bg-primary/5' : ''}`}
                  onClick={() => onSelectExport?.(exportFile.id)}
                >
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-foreground">{exportFile.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(exportFile.file_size)} · {exportFile.format}</p>
                  </td>
                  <td className="px-6 py-3">
                    <p className="text-sm text-foreground">{exportFile.bank_account?.account_name}</p>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(exportFile.total_amount, exportFile.currency)}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded">{exportFile.payment_count} payments</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
                      <Clock className="h-3 w-3" />
                      {exportFile.status}
                    </span>
                  </td>
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); onSelectExport?.(exportFile.id); }} className="h-8 btn-press">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); handleUploadFile(exportFile); }}
                        disabled={isUploading || uploadingFileId === exportFile.id}
                        className="h-8 bg-primary hover:bg-primary/90 btn-press"
                      >
                        {uploadingFileId === exportFile.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Local Export Files */}
      {selectedAccountId && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Local Export Files</h3>
              </div>
              {localFilesData?.export_path && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">{localFilesData.export_path}</p>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => refetchLocalFiles()} disabled={localFilesLoading} className="h-8 btn-press">
              <RefreshCw className={`h-3 w-3 mr-1.5 ${localFilesLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>

          {localFilesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : localFiles.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No local export files</p>
            </div>
          ) : (
            <table className="w-full table-professional">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Format</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Size</th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">SFTP</th>
                  <th className="w-24"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border animate-stagger">
                {localFiles.map((file: LocalExportFile) => (
                  <tr key={file.absolute_path} className="row-interactive">
                    <td className="px-6 py-3">
                      <p className="text-sm font-medium text-foreground">{file.filename}</p>
                    </td>
                    <td className="px-6 py-3">
                      <span className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded uppercase">{file.format}</span>
                    </td>
                    <td className="px-6 py-3 text-sm text-muted-foreground">{file.size_display}</td>
                    <td className="px-6 py-3">
                      {file.sftp_uploaded ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
                          <CheckCircle2 className="h-3 w-3" />
                          Uploaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
                          <Clock className="h-3 w-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3">
                      {!file.sftp_uploaded && (
                        <Button
                          size="sm"
                          onClick={() => handleUploadLocalFile(file)}
                          disabled={isUploading || uploadingLocalFile === file.absolute_path}
                          className="h-8 bg-primary hover:bg-primary/90 btn-press"
                        >
                          {uploadingLocalFile === file.absolute_path ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* No account selected */}
      {!selectedAccountId && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm text-center py-12">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a bank account to view local export files</p>
        </div>
      )}

      {/* Uploaded Files */}
      {uploadedExports.length > 0 && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Uploaded Files</h3>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{uploadedExports.length} files completed</p>
          </div>
          <table className="w-full table-professional">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Bank Account</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Uploaded</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-stagger">
              {uploadedExports.map((exportFile: BankPaymentExport) => (
                <tr key={exportFile.id} className={`row-interactive ${selectedExportId === exportFile.id ? 'bg-primary/5' : ''}`}>
                  <td className="px-6 py-3">
                    <p className="text-sm font-medium text-foreground">{exportFile.file_name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(exportFile.file_size)}</p>
                  </td>
                  <td className="px-6 py-3 text-sm text-foreground">{exportFile.bank_account?.account_name}</td>
                  <td className="px-6 py-3">
                    <span className="text-sm font-medium text-foreground">{formatCurrency(exportFile.total_amount, exportFile.currency)}</span>
                  </td>
                  <td className="px-6 py-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
                      <CheckCircle2 className="h-3 w-3" />
                      {exportFile.status}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">
                    {exportFile.sftp_uploaded_at ? formatDate(exportFile.sftp_uploaded_at) : "-"}
                  </td>
                  <td className="px-6 py-3">
                    <Button variant="outline" size="sm" onClick={() => onSelectExport?.(exportFile.id)} className="h-8 btn-press">
                      <Eye className="h-3 w-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Recent Uploads */}
      {transferLogs.length > 0 && (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-medium text-foreground">Recent Uploads</h3>
            </div>
          </div>
          <table className="w-full table-professional">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Bank</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Size</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border animate-stagger">
              {transferLogs.map((log) => (
                <tr key={log.id} className="row-interactive">
                  <td className="px-6 py-3 text-sm text-foreground">{log.local_file_path.split("/").pop()}</td>
                  <td className="px-6 py-3 text-sm text-muted-foreground">{log.bank_account_name}</td>
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
