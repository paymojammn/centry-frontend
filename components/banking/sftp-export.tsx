"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  Upload,
  RefreshCw,
  FileText,
  Server,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  FileUp,
  AlertCircle,
  ArrowUpFromLine,
  DollarSign,
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

function getStatusColor(status: string): string {
  switch (status) {
    case "uploaded":
    case "processed":
      return "bg-green-100 text-green-800";
    case "generated":
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function SFTPExport({ organizationId, onExportComplete, onSelectExport, selectedExportId }: SFTPExportProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<number | undefined>();
  const [activeTaskId, setActiveTaskId] = useState<string | undefined>();
  const [uploadingFileId, setUploadingFileId] = useState<number | undefined>();
  const [uploadingLocalFile, setUploadingLocalFile] = useState<string | undefined>();

  // Fetch bank accounts
  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const bankAccounts = (accountsData as any)?.results || [];

  // Fetch SFTP credentials for selected account
  const { data: credentialsData, isLoading: credentialsLoading } = useSFTPCredentials(selectedAccountId);
  const sftpCredentials = (credentialsData as any)?.results || [];

  // Fetch payment exports (files ready for upload)
  const {
    data: exportsData,
    isLoading: exportsLoading,
    refetch: refetchExports,
  } = useBankPaymentExports({
    bankAccountId: selectedAccountId,
    organizationId,
  });

  // Fetch local export files for selected account
  const {
    data: localFilesData,
    isLoading: localFilesLoading,
    refetch: refetchLocalFiles,
  } = useLocalExportFiles(selectedAccountId);

  // Fetch recent transfer logs
  const { data: logsData, isLoading: logsLoading } = useSFTPTransferLogs({
    bankAccountId: selectedAccountId,
    direction: "upload",
    limit: 10,
  });

  // SFTP upload mutation
  const uploadFile = useSFTPUpload();

  // Track task status
  const { data: taskStatus } = useSFTPTaskStatus(activeTaskId);

  // Auto-select first active SFTP credential when credentials load
  useEffect(() => {
    console.log('SFTP Credentials loaded:', {
      count: sftpCredentials.length,
      credentials: sftpCredentials,
      selectedAccountId,
      selectedSFTPCredentialId
    });

    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const activeCredential = sftpCredentials.find((c: SFTPCredential) => c.is_active);
      if (activeCredential) {
        console.log('Auto-selecting active credential:', activeCredential);
        setSelectedSFTPCredentialId(activeCredential.id);
      } else {
        // If no active credentials, select the first one
        console.log('Auto-selecting first credential:', sftpCredentials[0]);
        setSelectedSFTPCredentialId(sftpCredentials[0].id);
      }
    }
  }, [sftpCredentials, selectedSFTPCredentialId, selectedAccountId]);

  // Clear task when complete
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

  // Filter exports to show only files that can be uploaded
  const pendingExports = exports.filter(
    (e) => e.status === "generated" || e.status === "pending"
  );
  const uploadedExports = exports.filter(
    (e) => e.status === "uploaded" || e.status === "processed"
  );

  // Filter local files by upload status
  const pendingLocalFiles = localFiles.filter((f) => !f.sftp_uploaded);
  const uploadedLocalFiles = localFiles.filter((f) => f.sftp_uploaded);

  const handleUploadFile = async (exportFile: BankPaymentExport) => {
    if (!exportFile.bank_account?.id) {
      alert("Bank account not found for this export");
      return;
    }

    if (!selectedSFTPCredentialId) {
      alert("Please select an SFTP connection first");
      return;
    }

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
      if (result.task_id) {
        setActiveTaskId(result.task_id);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadingFileId(undefined);
    }
  };

  const handleUploadLocalFile = async (localFile: LocalExportFile) => {
    if (!selectedAccountId) {
      alert("Bank account not selected");
      return;
    }

    if (!selectedSFTPCredentialId) {
      alert("Please select an SFTP connection first");
      return;
    }

    try {
      setUploadingLocalFile(localFile.absolute_path);
      const result = await uploadFile.mutateAsync({
        bank_account_id: selectedAccountId,
        sftp_credential_id: selectedSFTPCredentialId,
        file_path: localFile.absolute_path,
        remote_filename: localFile.filename,
        async_upload: true,
      });
      if (result.task_id) {
        setActiveTaskId(result.task_id);
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setUploadingLocalFile(undefined);
    }
  };

  const isUploading = uploadFile.isPending || !!activeTaskId;

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <FileUp className="h-6 w-6 text-[#638C80]" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-gray-900">SFTP Export</CardTitle>
                <CardDescription className="mt-0.5">
                  Upload payment files to bank SFTP server for processing
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
                value={selectedAccountId?.toString() || "all"}
                onValueChange={(value) => {
                  const accountId = value === "all" ? undefined : Number(value);
                  setSelectedAccountId(accountId);
                  setSelectedSFTPCredentialId(undefined); // Reset SFTP credential when account changes
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl hover:bg-white transition-all">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
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

            {/* Stats */}
            <div className="flex items-center gap-6 h-12 mt-7">
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 rounded-xl border border-amber-200">
                <div className="h-2.5 w-2.5 rounded-full bg-amber-400"></div>
                <span className="text-sm font-medium text-amber-700">
                  {pendingExports.length} pending
                </span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-xl border border-green-200">
                <div className="h-2.5 w-2.5 rounded-full bg-green-400"></div>
                <span className="text-sm font-medium text-green-700">
                  {uploadedExports.length} uploaded
                </span>
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
        <Alert
          className={
            taskStatus.status === "SUCCESS"
              ? "border-green-200 bg-green-50"
              : taskStatus.status === "FAILURE"
              ? "border-red-200 bg-red-50"
              : "border-blue-200 bg-blue-50"
          }
        >
          <div className="flex items-center gap-2">
            {taskStatus.status === "SUCCESS" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : taskStatus.status === "FAILURE" ? (
              <XCircle className="h-4 w-4 text-red-600" />
            ) : (
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
            )}
            <AlertDescription>
              {taskStatus.status === "SUCCESS" ? (
                <span className="text-green-800">
                  File uploaded successfully!{" "}
                  {taskStatus.result?.remote_path && `Path: ${taskStatus.result.remote_path}`}
                </span>
              ) : taskStatus.status === "FAILURE" ? (
                <span className="text-red-800">
                  Upload failed: {taskStatus.result?.error || "Unknown error"}
                </span>
              ) : (
                <span className="text-blue-800">Uploading file to SFTP server...</span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}

      {/* Pending Exports */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <ArrowUpFromLine className="h-5 w-5 text-[#638C80]" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Ready for Upload</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">{pendingExports.length} files pending</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchExports()}
              disabled={exportsLoading}
              className="rounded-lg border-gray-200 hover:bg-gray-50"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${exportsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {exportsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : pendingExports.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileText className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">No payment files ready</p>
              <p className="text-xs text-gray-400 mt-1">
                Generate payment files from the Payments page
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="font-semibold text-gray-600">File</TableHead>
                    <TableHead className="font-semibold text-gray-600">Bank Account</TableHead>
                    <TableHead className="font-semibold text-gray-600">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-600">Payments</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600">Created</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingExports.map((exportFile: BankPaymentExport, index) => (
                    <TableRow
                      key={exportFile.id}
                      className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                        selectedExportId === exportFile.id ? 'bg-[#638C80]/10 hover:bg-[#638C80]/10' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                      onClick={() => onSelectExport?.(exportFile.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#638C80]/10 rounded-lg">
                            <FileText className="h-4 w-4 text-[#638C80]" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{exportFile.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(exportFile.file_size)} • {exportFile.format}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium text-gray-800">{exportFile.bank_account?.account_name}</p>
                          <p className="text-xs text-gray-500">
                            {exportFile.bank_account?.account_number}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(exportFile.total_amount, exportFile.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg">
                          {exportFile.payment_count} payments
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(exportFile.status)}>
                          {exportFile.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatDate(exportFile.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              onSelectExport?.(exportFile.id);
                            }}
                            className="rounded-lg border-gray-200 hover:border-[#638C80] hover:text-[#638C80]"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleUploadFile(exportFile);
                            }}
                            disabled={isUploading || uploadingFileId === exportFile.id}
                            className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-lg shadow-sm"
                          >
                            {uploadingFileId === exportFile.id ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4 mr-2" />
                            )}
                            Upload
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Local Export Files */}
      {selectedAccountId && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                  <Server className="h-5 w-5 text-[#638C80]" />
                </div>
                <div>
                  <CardTitle className="text-lg font-semibold text-gray-900">Local Export Files</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">{localFiles.length} files available</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchLocalFiles()}
                disabled={localFilesLoading}
                className="rounded-lg border-gray-200 hover:bg-gray-50"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${localFilesLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
            {localFilesData?.export_path && (
              <p className="text-xs text-gray-400 font-mono mt-2 ml-14">
                {localFilesData.export_path}
              </p>
            )}
          </CardHeader>
          <CardContent className="p-6">
            {localFilesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl" />
                ))}
              </div>
            ) : localFiles.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-500">No local export files</p>
                <p className="text-xs text-gray-400 mt-1">
                  Generate payment files from the Payments page
                </p>
              </div>
            ) : (
              <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/80 border-b border-gray-100">
                      <TableHead className="font-semibold text-gray-600">File</TableHead>
                      <TableHead className="font-semibold text-gray-600">Format</TableHead>
                      <TableHead className="font-semibold text-gray-600">Size</TableHead>
                      <TableHead className="font-semibold text-gray-600">Created</TableHead>
                      <TableHead className="font-semibold text-gray-600">SFTP Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {localFiles.map((file: LocalExportFile, index) => (
                      <TableRow
                        key={file.absolute_path}
                        className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                        }`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${file.sftp_uploaded ? "bg-green-50" : "bg-[#638C80]/10"}`}>
                              <FileText className={`h-4 w-4 ${file.sftp_uploaded ? "text-green-600" : "text-[#638C80]"}`} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-800 text-sm">{file.filename}</p>
                              <p className="text-xs text-gray-500">
                                {file.file_type}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-lg uppercase">
                            {file.format}
                          </span>
                        </TableCell>
                        <TableCell className="text-gray-500">
                          {file.size_display}
                        </TableCell>
                        <TableCell className="text-gray-500 text-sm">
                          {file.modified ? formatDate(file.modified) : (file.created_at ? formatDate(file.created_at) : '-')}
                        </TableCell>
                        <TableCell>
                          {file.sftp_uploaded ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Uploaded
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 text-xs font-medium">
                              <Clock className="h-3.5 w-3.5" />
                              Pending
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            {/* Find matching export by file path */}
                            {(() => {
                              const matchingExport = exports.find(exp => exp.file_path === file.absolute_path);
                              if (matchingExport) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectExport?.(matchingExport.id);
                                    }}
                                    className="rounded-lg border-gray-200 hover:border-[#638C80] hover:text-[#638C80]"
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    View
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                            {!file.sftp_uploaded && (
                              <Button
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUploadLocalFile(file);
                                }}
                                disabled={isUploading || uploadingLocalFile === file.absolute_path}
                                className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-lg shadow-sm"
                              >
                                {uploadingLocalFile === file.absolute_path ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <Upload className="h-4 w-4 mr-2" />
                                )}
                                Upload
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No account selected message */}
      {!selectedAccountId && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-gray-300" />
              </div>
              <p className="text-sm font-medium text-gray-500">Select a bank account</p>
              <p className="text-xs text-gray-400 mt-1">
                Choose a specific bank account above to view local export files
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Uploaded Files */}
      {uploadedExports.length > 0 && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">Uploaded Files</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">{uploadedExports.length} files completed</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="font-semibold text-gray-600">File</TableHead>
                    <TableHead className="font-semibold text-gray-600">Bank Account</TableHead>
                    <TableHead className="font-semibold text-gray-600">Amount</TableHead>
                    <TableHead className="font-semibold text-gray-600">Status</TableHead>
                    <TableHead className="font-semibold text-gray-600">Uploaded</TableHead>
                    <TableHead className="text-right font-semibold text-gray-600">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {uploadedExports.map((exportFile: BankPaymentExport, index) => (
                    <TableRow
                      key={exportFile.id}
                      className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                        selectedExportId === exportFile.id ? 'bg-[#638C80]/10 hover:bg-[#638C80]/10' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                      }`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 rounded-lg">
                            <FileText className="h-4 w-4 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{exportFile.file_name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(exportFile.file_size)} • {exportFile.format}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <p className="font-medium text-gray-800">{exportFile.bank_account?.account_name}</p>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold text-gray-800">
                          {formatCurrency(exportFile.total_amount, exportFile.currency)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-50 text-green-700 text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {exportFile.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {exportFile.sftp_uploaded_at
                          ? formatDate(exportFile.sftp_uploaded_at)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSelectExport?.(exportFile.id)}
                          className="rounded-lg border-gray-200 hover:border-[#638C80] hover:text-[#638C80]"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transfer Logs */}
      {transferLogs.length > 0 && (
        <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
                <Clock className="h-5 w-5 text-[#638C80]" />
              </div>
              <CardTitle className="text-lg font-semibold text-gray-900">Recent Uploads</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50/80 border-b border-gray-100">
                    <TableHead className="font-semibold text-gray-600">File</TableHead>
                    <TableHead className="font-semibold text-gray-600">Bank Account</TableHead>
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
                          <span className="text-gray-800">{log.local_file_path.split("/").pop()}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-700">{log.bank_account_name}</TableCell>
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
