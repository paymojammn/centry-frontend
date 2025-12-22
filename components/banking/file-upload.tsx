"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

  // API hooks
  const { data: bankAccountsData, isLoading: accountsLoading } = useBankAccounts(organizationId);
  const { data: connectionsData, isLoading: connectionsLoading } = useERPConnections();
  const uploadFile = useUploadBankFile();

  const bankAccounts = Array.isArray(bankAccountsData)
    ? bankAccountsData
    : (bankAccountsData as any)?.results || [];

  // Extract connections from paginated response
  const connections = Array.isArray(connectionsData)
    ? connectionsData
    : (connectionsData as any)?.results || [];

  // Find active ERP connection for selected organization
  const activeConnection = connections.find(
    (conn: any) => conn.organization?.id === organizationId && conn.is_active
  );

  // Debug logging
  console.log('=== FILE UPLOAD DEBUG ===');
  console.log('organizationId:', organizationId);
  console.log('Bank accounts data:', bankAccountsData);
  console.log('Bank accounts array:', bankAccounts);
  console.log('Connections data:', connectionsData);
  console.log('Connections array:', connections);
  console.log('Active connection:', activeConnection);
  console.log('========================');

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

    console.log('Uploading with data:', {
      file: file.name,
      bank_account: parseInt(selectedBankAccount),
      erp_connection: activeConnection.id,
    });

    try {
      await uploadFile.mutateAsync({
        file,
        bank_account: parseInt(selectedBankAccount),
        erp_connection: activeConnection.id,
      });

      toast.success("File uploaded successfully", {
        description: `${file.name} has been imported`
      });

      // Reset form
      setFile(null);
      setSelectedBankAccount("");

      // Clear file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      onUploadComplete?.();
    } catch (error) {
      console.error('Upload error:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to upload file";
      toast.error("Upload failed", {
        description: errorMessage
      });
    }
  };

  const isLoading = accountsLoading || connectionsLoading;
  const canUpload = file && selectedBankAccount && activeConnection && !uploadFile.isPending;

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
            <Upload className="h-5 w-5 text-[#638C80]" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Upload Bank File</CardTitle>
            <CardDescription className="mt-0.5">
              Import bank statement for reconciliation
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5 p-6">
        {/* File Input */}
        <div className="space-y-2">
          <Label htmlFor="file" className="text-sm font-medium text-gray-700">Bank Statement File</Label>
          <div className={`relative border-2 border-dashed rounded-xl p-6 transition-all ${
            file ? 'border-[#638C80] bg-[#638C80]/5' : 'border-gray-200 hover:border-[#638C80]/50 hover:bg-gray-50'
          }`}>
            <input
              id="file"
              type="file"
              accept=".csv,.txt,.940,.xml,.xlsx,.xls"
              onChange={handleFileChange}
              disabled={uploadFile.isPending}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="text-center">
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="p-2 bg-[#638C80]/10 rounded-lg">
                    <CheckCircle2 className="h-6 w-6 text-[#638C80]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-gray-100 rounded-full w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                    <FileUp className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm font-medium text-gray-600">Drop your file here or click to browse</p>
                  <p className="text-xs text-gray-400 mt-1">Supports CSV, TXT, MT940, XML, XLSX, XLS</p>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bank Account */}
        <div className="space-y-2">
          <Label htmlFor="bank-account" className="text-sm font-medium text-gray-700">Bank Account (from Xero)</Label>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 bg-gray-50 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-[#638C80]" />
            </div>
          ) : bankAccounts.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="font-medium text-amber-800">No bank accounts synced yet</p>
              <p className="text-sm text-amber-600 mt-1">
                Please sync bank accounts from Xero first in the{" "}
                <a href="/banking/accounts" className="text-[#638C80] font-medium hover:underline">
                  Bank Accounts
                </a>{" "}
                page.
              </p>
            </div>
          ) : (
            <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
              <SelectTrigger id="bank-account" className="h-12 bg-gray-50 border-gray-200 rounded-xl hover:bg-white transition-all">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-[#638C80]" />
                  <SelectValue placeholder="Select bank account..." />
                </div>
              </SelectTrigger>
              <SelectContent>
                {bankAccounts.map((account: any) => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <div className="flex flex-col py-1">
                      <span className="font-medium text-gray-800">{account.account_name}</span>
                      <span className="text-xs text-gray-500">
                        {account.account_number} • {account.bank?.name || account.bank_provider?.name} • {account.currency}
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
          <div className="bg-[#638C80]/5 border border-[#638C80]/20 rounded-xl p-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-[#638C80]" />
              <p className="text-sm font-medium text-[#638C80]">Will upload to:</p>
            </div>
            <p className="text-sm text-gray-600 mt-1 ml-6">
              {activeConnection.organization?.name} • {activeConnection.provider?.name}
            </p>
          </div>
        )}

        {!activeConnection && organizationId && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="font-medium text-amber-800">No active Xero connection found</p>
            <p className="text-sm text-amber-600 mt-1">Please set up a Xero connection first</p>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!canUpload}
          className="w-full h-12 bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] text-white shadow-lg hover:shadow-xl transition-all rounded-xl font-medium"
        >
          {uploadFile.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <FileUp className="mr-2 h-5 w-5" />
              Upload & Import
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
