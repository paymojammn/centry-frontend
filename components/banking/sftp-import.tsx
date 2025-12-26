"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  ArrowDownToLine,
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

  // Fetch bank accounts
  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  // Fetch SFTP credentials for selected account
  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  // Fetch remote files from SFTP
  const {
    data: filesData,
    isLoading: filesLoading,
    refetch: refetchFiles,
    error: filesError,
  } = useSFTPRemoteFiles(selectedAccountId, selectedSFTPCredentialId);

  // Fetch recent transfer logs
  const { data: logsData, isLoading: logsLoading } = useSFTPTransferLogs({
    bankAccountId: selectedAccountId,
    direction: "download",
    limit: 10,
  });

  // SFTP download mutations
  const downloadStatements = useSFTPDownloadStatements();
  const downloadSingleFile = useSFTPDownloadSingleFile();

  // Track task status
  const { data: taskStatus } = useSFTPTaskStatus(activeTaskId);

  // Auto-select first active SFTP credential when credentials load
  useEffect(() => {
    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const activeCredential = sftpCredentials.find((c: SFTPCredential) => c.is_active);
      if (activeCredential) {
        setSelectedSFTPCredentialId(activeCredential.id);
      } else {
        // If no active credentials, select the first one
        setSelectedSFTPCredentialId(sftpCredentials[0].id);
      }
    }
  }, [sftpCredentials, selectedSFTPCredentialId, selectedAccountId]);

  // Clear task when complete
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

    // Download files one by one
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
      {/* Header Card */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <Server className="h-6 w-6 text-[#638C80]" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">SFTP Import</CardTitle>
                <CardDescription className="mt-0.5">
                  Download bank statement files from SFTP server for import
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Bank Account Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Bank Account</Label>
              <Select
                value={selectedAccountId?.toString()}
                onValueChange={(value) => {
                  setSelectedAccountId(Number(value));
                  setSelectedFiles(new Set());
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl hover:bg-white transition-all">
                  <SelectValue placeholder="Select bank account..." />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account: any) => (
                    <SelectItem key={account.id} value={account.id.toString()}>
                      <div className="flex items-center gap-2 py-1">
                        <span className="font-medium text-gray-800">{account.account_name}</span>
                        <span className="text-gray-500 text-sm">
                          ({account.account_number})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* SFTP Connection Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">
                SFTP Connection
                {!selectedAccountId && <span className="text-gray-400 text-xs ml-2">(Select account first)</span>}
              </Label>
              <Select
                value={selectedSFTPCredentialId?.toString() || ""}
                onValueChange={(value) => setSelectedSFTPCredentialId(value ? Number(value) : undefined)}
                disabled={!selectedAccountId || credentialsLoading || sftpCredentials.length === 0}
              >
                <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl hover:bg-white transition-all">
                  <SelectValue placeholder={
                    credentialsLoading ? "Loading..." :
                    sftpCredentials.length === 0 ? "No connections" :
                    "Select SFTP connection"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {sftpCredentials.map((credential: SFTPCredential) => (
                    <SelectItem key={credential.id} value={credential.id.toString()}>
                      <div className="flex items-center gap-2 py-1">
                        <Server className="h-4 w-4 text-[#638C80]" />
                        <span className="font-medium text-gray-800">{credential.host}</span>
                        {credential.is_active ? (
                          <span className="h-2 w-2 rounded-full bg-green-500" title="Active" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-gray-400" title="Inactive" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Options */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Options</Label>
              <div className="flex items-center space-x-3 h-12 px-4 bg-gray-50 rounded-xl border border-gray-200">
                <Checkbox
                  id="auto-import"
                  checked={autoImport}
                  onCheckedChange={(checked) => setAutoImport(!!checked)}
                  className="rounded"
                />
                <Label htmlFor="auto-import" className="text-sm text-gray-600 cursor-pointer">
                  Auto-import after download
                </Label>
              </div>
            </div>
          </div>

          {/* SFTP Connection Details */}
          {selectedSFTPCredentialId && sftpCredentials.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              {(() => {
                const selectedCredential = sftpCredentials.find(
                  (c: SFTPCredential) => c.id === selectedSFTPCredentialId
                );
                if (!selectedCredential) return null;

                return (
                  <div className="bg-gradient-to-br from-[#638C80]/5 to-[#547568]/5 rounded-xl p-4 border border-[#638C80]/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Server className="h-4 w-4 text-[#638C80]" />
                      <span className="text-sm font-semibold text-gray-700">SFTP Connection Details</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500 mb-1">Host</div>
                        <div className="font-medium text-gray-800">{selectedCredential.host}:{selectedCredential.port}</div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Upload Path</div>
                        <div className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-700">
                          {selectedCredential.upload_path}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-500 mb-1">Download Path</div>
                        <div className="font-mono text-xs bg-white px-2 py-1 rounded border border-gray-200 text-gray-700">
                          {selectedCredential.download_path}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Task Progress */}
      {activeTaskId && taskStatus && (
        <div
          className={`rounded-xl border p-4 ${
            taskStatus.status === "SUCCESS"
              ? "border-[#49a034]/30 bg-[#49a034]/5"
              : taskStatus.status === "FAILURE"
              ? "border-[#f77f00]/30 bg-[#f77f00]/5"
              : "border-[#4E97D1]/30 bg-[#4E97D1]/5"
          }`}
        >
          <div className="flex items-center gap-3">
            {taskStatus.status === "SUCCESS" ? (
              <div className="w-10 h-10 rounded-xl bg-[#49a034]/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-[#49a034]" />
              </div>
            ) : taskStatus.status === "FAILURE" ? (
              <div className="w-10 h-10 rounded-xl bg-[#f77f00]/10 flex items-center justify-center">
                <XCircle className="h-5 w-5 text-[#f77f00]" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-xl bg-[#4E97D1]/10 flex items-center justify-center">
                <Loader2 className="h-5 w-5 text-[#4E97D1] animate-spin" />
              </div>
            )}
            <div>
              {taskStatus.status === "SUCCESS" ? (
                <p className="text-[#49a034] font-medium">
                  Download complete!{" "}
                  {taskStatus.result?.files_downloaded
                    ? `${taskStatus.result.files_downloaded} file(s) downloaded`
                    : ""}
                  {taskStatus.result?.files_imported
                    ? `, ${taskStatus.result.files_imported} imported`
                    : ""}
                </p>
              ) : taskStatus.status === "FAILURE" ? (
                <p className="text-[#f77f00] font-medium">
                  Download failed: {taskStatus.result?.error || "Unknown error"}
                </p>
              ) : (
                <p className="text-[#4E97D1] font-medium">
                  Downloading files from SFTP server...
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Remote Files List */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <FolderOpen className="h-5 w-5 text-[#638C80]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Remote Files</CardTitle>
                {downloadPath && (
                  <p className="text-xs text-gray-500 mt-0.5 font-mono">{downloadPath}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchFiles()}
                disabled={!selectedAccountId || filesLoading}
                className="rounded-lg border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${filesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {selectedFiles.size > 0 && (
                <Button
                  size="sm"
                  onClick={handleDownloadSelected}
                  disabled={isDownloading}
                  className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-lg shadow-sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Selected ({selectedFiles.size})
                </Button>
              )}
              <Button
                size="sm"
                onClick={handleDownloadAll}
                disabled={!selectedAccountId || files.length === 0 || isDownloading}
                className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-lg shadow-sm"
              >
                <ArrowDownToLine className="h-4 w-4 mr-2" />
                Download All
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!selectedAccountId ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Server className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Select a bank account</p>
              <p className="text-xs text-gray-400 mt-1">Choose an account to view files on the SFTP server</p>
            </div>
          ) : filesLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </div>
          ) : filesError ? (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {(filesError as any)?.message || "Failed to connect to SFTP server. Please check the credentials."}
              </AlertDescription>
            </Alert>
          ) : files.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No files found</p>
              <p className="text-xs text-gray-400 mt-1">No files available on the SFTP server</p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedFiles.size === files.filter((f) => !f.is_dir).length}
                        onCheckedChange={handleSelectAll}
                        className="rounded"
                      />
                    </TableHead>
                    <TableHead className="font-semibold text-gray-600">Filename</TableHead>
                    <TableHead className="font-semibold text-gray-600">Size</TableHead>
                    <TableHead className="font-semibold text-gray-600">Modified</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {files.map((file: SFTPRemoteFile, index) => (
                    <TableRow
                      key={file.name}
                      className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell>
                        {!file.is_dir && (
                          <Checkbox
                            checked={selectedFiles.has(file.name)}
                            onCheckedChange={() => handleSelectFile(file.name)}
                            className="rounded"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${file.is_dir ? 'bg-amber-50' : 'bg-[#638C80]/10'}`}>
                            {file.is_dir ? (
                              <FolderOpen className="h-4 w-4 text-amber-600" />
                            ) : (
                              <FileText className="h-4 w-4 text-[#638C80]" />
                            )}
                          </div>
                          <span className={`font-medium ${file.is_dir ? "text-gray-500" : "text-gray-800"}`}>
                            {file.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {file.is_dir ? "-" : formatFileSize(file.size)}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(file.mtime)}
                      </TableCell>
                      <TableCell className="text-right">
                        {!file.is_dir && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadFile(file.name)}
                            disabled={isDownloading}
                            className="hover:bg-[#638C80]/10 rounded-lg"
                          >
                            <Download className="h-4 w-4 text-[#638C80]" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Transfer Logs */}
      {selectedAccountId && transferLogs.length > 0 && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <Clock className="h-5 w-5 text-[#638C80]" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Downloads</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="font-semibold text-gray-600">File</TableHead>
                    <TableHead className="font-semibold text-gray-600">Size</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600">Time</TableHead>
                    <TableHead className="font-semibold text-gray-600">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transferLogs.map((log, index) => (
                    <TableRow
                      key={log.id}
                      className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-gray-100 rounded-lg">
                            <FileText className="h-4 w-4 text-[#638C80]" />
                          </div>
                          <span className="text-gray-800">{log.remote_file_path.split("/").pop()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {log.file_size ? formatFileSize(log.file_size) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            log.status === "success"
                              ? "success"
                              : log.status === "failed"
                              ? "destructive"
                              : "secondary"
                          }
                          appearance="light"
                        >
                          {log.status === "success" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                          {log.status === "failed" && <XCircle className="h-3 w-3 mr-1" />}
                          {log.status === "in_progress" && (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          )}
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(log.started_at)}
                      </TableCell>
                      <TableCell className="text-gray-500">
                        {log.duration_seconds ? `${log.duration_seconds.toFixed(1)}s` : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
