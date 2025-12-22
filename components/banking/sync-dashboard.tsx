"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeftRight, ArrowUpRight, ArrowDownLeft, Loader2, CheckCircle, AlertCircle, Download } from "lucide-react";
import { useERPConnections, useSyncToXero, useSyncFromXero, useBankImports } from "@/hooks/use-banking";
import { toast } from "sonner";
import { ReconciliationInfo } from "./reconciliation-info";

interface SyncDashboardProps {
  selectedImportId?: number;
  onSyncComplete?: () => void;
  organizationId?: string;
}

export function SyncDashboard({ selectedImportId, onSyncComplete, organizationId }: SyncDashboardProps) {
  const [selectedConnection, setSelectedConnection] = useState<string>("");
  const [bankAccountCode, setBankAccountCode] = useState<string>("090");
  const [statusFilter, setStatusFilter] = useState<string>("AUTHORISED,PAID");

  // API hooks
  const { data: connectionsData, isLoading: connectionsLoading } = useERPConnections("xero");
  const { data: importsData } = useBankImports({ organizationId });
  const syncToXero = useSyncToXero();
  const syncFromXero = useSyncFromXero();

  const connections = connectionsData?.connections || [];
  const activeConnection = connections.find(c => c.id === selectedConnection);
  const imports = importsData?.results || [];
  const selectedImport = imports.find(imp => imp.id === selectedImportId);

  const handleSyncToXero = async () => {
    if (!selectedImportId) {
      toast.error("No import selected", {
        description: "Please select a bank file import to sync"
      });
      return;
    }

    try {
      await syncToXero.mutateAsync({
        import_id: selectedImportId,
        bank_account_code: bankAccountCode,
        auto_approve: true,
      });
      
      toast.success("Sync to Xero completed", {
        description: "Bank transactions have been synced to Xero successfully"
      });
      
      onSyncComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while syncing to Xero";
      toast.error("Sync to Xero failed", {
        description: errorMessage
      });
    }
  };

  const handleSyncFromXero = async () => {
    if (!selectedConnection) {
      toast.error("No connection selected", {
        description: "Please select an ERP connection"
      });
      return;
    }

    try {
      await syncFromXero.mutateAsync({
        connection_id: selectedConnection,
        status_filter: statusFilter,
      });
      
      toast.success("Sync from Xero completed", {
        description: "Xero transactions have been imported successfully"
      });
      
      onSyncComplete?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while syncing from Xero";
      toast.error("Sync from Xero failed", {
        description: errorMessage
      });
    }
  };
  
  const handleExportForXero = async () => {
    if (!selectedImportId) {
      toast.error("No import selected", {
        description: "Please select a bank file import to export"
      });
      return;
    }

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
      const token = localStorage.getItem('token');
      
      const response = await fetch(
        `${API_URL}/api/v1/banking/imports/${selectedImportId}/export-for-xero-import/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            include_synced: false
          })
        }
      );

      if (!response.ok) {
        throw new Error('Export failed');
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get('Content-Disposition');
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      const filename = filenameMatch ? filenameMatch[1] : `xero_statement_${selectedImportId}.csv`;

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("CSV exported successfully", {
        description: "Upload this file to Xero: Bank Accounts → Import"
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An error occurred while exporting";
      toast.error("Export failed", {
        description: errorMessage
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
      {/* Connection Selector */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <ArrowLeftRight className="h-5 w-5 text-[#638C80]" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">ERP Connection</CardTitle>
              <CardDescription className="mt-0.5">
                Select your accounting system connection
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {connectionsLoading ? (
            <div className="flex items-center justify-center py-8 bg-gray-50 rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-[#638C80]" />
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8">
              <div className="p-4 bg-amber-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <AlertCircle className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-sm font-medium text-gray-500">No ERP connections found</p>
              <Button variant="outline" size="sm" className="mt-3 rounded-lg border-gray-200 hover:border-[#638C80] hover:text-[#638C80]">
                Connect Xero
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <Select value={selectedConnection} onValueChange={setSelectedConnection}>
                <SelectTrigger className="h-12 bg-gray-50 border-gray-200 rounded-xl hover:bg-white transition-all">
                  <SelectValue placeholder="Select connection..." />
                </SelectTrigger>
                <SelectContent>
                  {connections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>
                      <div className="flex items-center gap-2 py-1">
                        <span className="font-medium text-gray-800">{conn.organization.name}</span>
                        <span className="text-xs text-gray-500">
                          ({conn.provider.name})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeConnection && (
                <div className="flex items-center gap-2 text-sm bg-green-50 text-green-700 px-4 py-2 rounded-xl">
                  <CheckCircle className="h-4 w-4" />
                  <span>Connected to {activeConnection.organization.name}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Controls */}
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <ArrowUpRight className="h-5 w-5 text-[#638C80]" />
            </div>
            <div>
              <CardTitle className="text-xl font-semibold text-gray-900">Sync Operations</CardTitle>
              <CardDescription className="mt-0.5">
                Sync transactions between bank and Xero
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {/* Sync to Xero */}
          <div className="border border-gray-100 rounded-xl p-4 transition-all hover:border-[#638C80]/30 bg-white">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 bg-blue-50 rounded-lg">
                <ArrowUpRight className="h-4 w-4 text-blue-600" />
              </div>
              <span className="font-semibold text-gray-800">Bank → Xero</span>
            </div>

            {!selectedImportId ? (
              <p className="text-sm text-amber-600 mb-3">Select an import first</p>
            ) : selectedImport ? (
              <p className="text-sm text-gray-600 mb-3">
                <span className="font-medium">{selectedImport.original_filename}</span>
                <span className="text-gray-400 ml-1">({selectedImport.transactions_count})</span>
              </p>
            ) : null}

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Account code"
                value={bankAccountCode}
                onChange={(e) => setBankAccountCode(e.target.value)}
                className="flex-1 px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-lg transition-all focus:bg-white focus:border-[#638C80] focus:outline-none"
              />
              <Button
                size="sm"
                onClick={handleSyncToXero}
                disabled={!selectedImportId || syncToXero.isPending}
                className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-lg px-4"
              >
                {syncToXero.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Sync"
                )}
              </Button>
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={handleExportForXero}
              disabled={!selectedImportId}
              className="w-full mt-3 text-gray-500 hover:text-[#638C80] hover:bg-[#638C80]/5 rounded-lg"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Sync from Xero */}
          <div className="border border-gray-100 rounded-xl p-5 transition-all hover:border-[#638C80]/30 hover:shadow-md bg-gradient-to-r from-gray-50/50 to-white">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-50 rounded-lg">
                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                </div>
                <span className="font-semibold text-gray-800">Xero → Bank</span>
              </div>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Pull transactions from Xero
            </p>

            <div className="flex gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="flex-1 h-11 bg-gray-50 border-gray-200 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTHORISED,PAID">Authorised & Paid</SelectItem>
                  <SelectItem value="AUTHORISED">Authorised Only</SelectItem>
                  <SelectItem value="PAID">Paid Only</SelectItem>
                  <SelectItem value="all">All Statuses</SelectItem>
                </SelectContent>
              </Select>
              <Button
                size="sm"
                onClick={handleSyncFromXero}
                disabled={!selectedConnection || syncFromXero.isPending}
                className="bg-gradient-to-r from-[#638C80] to-[#547568] hover:from-[#547568] hover:to-[#456050] rounded-xl px-5 shadow-sm"
              >
                {syncFromXero.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Pull"
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Reconciliation Info */}
    <ReconciliationInfo 
      hasSyncedTransactions={selectedImport ? selectedImport.transactions_synced > 0 : false}
    />
    </div>
  );
}
