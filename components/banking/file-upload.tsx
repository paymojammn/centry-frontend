"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, FileUp, CheckCircle2, Building2 } from "lucide-react";
import { useBankAccounts, useUploadBankFile } from "@/hooks/use-banking";
import { useERPConnections } from "@/hooks/use-erp";
import { toast } from "sonner";

interface FileUploadProps {
  onUploadComplete?: () => void;
  organizationId?: string;
}

export function FileUpload({ onUploadComplete, organizationId }: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");

  const { data: bankAccountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const { data: connectionsData, isLoading: connectionsLoading } = useERPConnections();
  const uploadFile = useUploadBankFile();

  const bankAccounts = Array.isArray(bankAccountsData)
    ? bankAccountsData
    : (bankAccountsData as any)?.results || [];

  const connections = Array.isArray(connectionsData)
    ? connectionsData
    : (connectionsData as any)?.results || [];

  const activeConnection = connections.find(
    (conn: any) => conn.organization?.id === organizationId && conn.is_active
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !selectedBankAccount) {
      toast.error("Missing required fields", {
        description: "Please select a file and bank account"
      });
      return;
    }

    if (!activeConnection) {
      toast.error("No ERP connection found", {
        description: "Please ensure the organization has an active Xero connection"
      });
      return;
    }

    try {
      await uploadFile.mutateAsync({
        file,
        bank_account: parseInt(selectedBankAccount),
        erp_connection: activeConnection.id,
      });

      toast.success("File uploaded successfully", {
        description: `${file.name} has been imported`
      });

      setFile(null);
      setSelectedBankAccount("");

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onUploadComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      toast.error("Upload failed", {
        description: errorMessage
      });
    }
  };

  const isLoading = accountsLoading || connectionsLoading;
  const canUpload = file && selectedBankAccount && activeConnection && !uploadFile.isPending;

  return (
    <div className="bg-card rounded-xl border border-border/80 shadow-sm">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Upload className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Upload Bank File</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Import bank statement for reconciliation</p>
      </div>

      <div className="p-6 space-y-5">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file" className="text-sm font-medium text-foreground">Bank Statement File</Label>
          <div className={`relative border-2 border-dashed rounded-lg p-6 transition-all ${
            file ? 'border-primary bg-primary/5' : 'border-border hover:border-border hover:bg-muted'
          }`}>
            <input
              id="file"
              type="file"
              accept=".csv,.txt,.940,.xml,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploadFile.isPending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              aria-label="Upload bank statement file"
              title="Upload bank statement file"
            />
            <div className="text-center">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <FileUp className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Drop your file here or click to browse</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">CSV, TXT, MT940, XML, XLSX, XLS</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div className="space-y-2">
          <Label htmlFor="bank-account" className="text-sm font-medium text-foreground">Bank Account</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-6 bg-muted rounded-lg">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="bg-[#D4B35A]/10 border border-[#D4B35A]/20 rounded-lg p-4">
              <p className="text-sm font-medium text-[#D4B35A]">No bank accounts synced</p>
              <p className="text-xs text-muted-foreground mt-1">
                Please sync bank accounts from Xero first in{" "}
                <a href="/banking/accounts" className="text-primary font-medium hover:underline">
                  Bank Accounts
                </a>
              </p>
            </div>
          ) : (
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
              <SelectTrigger id="bank-account" className="h-10 bg-muted border-border">
                <Building2 className="h-4 w-4 text-muted-foreground/60 mr-2" />
                <SelectValue placeholder="Select bank account..." />
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex flex-col">
                      <span className="font-medium text-foreground">{account.account_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {account.account_number} · {account.bank?.name || account.bank_provider?.name} · {account.currency}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Connection Info */}
        {activeConnection && (
          <div className="bg-muted border border-border rounded-lg p-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">{activeConnection.organization?.name}</span>
              {" · "}{activeConnection.provider?.name}
            </p>
          </div>
        )}

        {!activeConnection && organizationId && (
          <div className="bg-[#D4944A]/10 border border-[#D4944A]/20 rounded-lg p-3">
            <p className="text-sm font-medium text-[#D4944A]">No active Xero connection</p>
            <p className="text-xs text-muted-foreground mt-0.5">Please set up a Xero connection first</p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!canUpload}
          className="w-full h-10 bg-primary hover:bg-primary/90 btn-press"
        >
          {uploadFile.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-4 w-4" />
              Upload & Import
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
