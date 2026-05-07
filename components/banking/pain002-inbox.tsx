"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Download,
  RefreshCw,
  FileText,
  Server,
  Loader2,
  AlertCircle,
} from "lucide-react";
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
    <div className="space-y-6">
      {/* Pull config */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">Bank Response (pain.002)</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pull payment status reports from the bank — processed responses appear in the Reconciliation tab
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
                className="h-10 bg-primary hover:bg-primary/90 btn-press"
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

      {/* Remote files listing */}
      {selectedAccountId ? (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-medium text-foreground">Available on SFTP</h3>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {remoteFilesLoading
                  ? "Loading files..."
                  : `${pain002Files.length} pain.002 file${pain002Files.length === 1 ? "" : "s"} found`}
              </p>
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
            {remoteFilesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
              </div>
            ) : pain002Files.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">No pain.002 files on SFTP</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run "Pull Bank Responses" to fetch and process them
                </p>
              </div>
            ) : (
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
            )}
          </div>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border/80 shadow-sm text-center py-12">
          <AlertCircle className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Select a bank account to list files on SFTP</p>
        </div>
      )}
    </div>
  );
}
