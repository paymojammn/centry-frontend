"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Clock,
  ChevronRight
} from "lucide-react";
import { useBankImports } from "@/hooks/use-banking";
import { formatDistanceToNow } from "date-fns";

interface ImportHistoryProps {
  onSelectImport?: (importId: number) => void;
  selectedImportId?: number;
  organizationId?: string;
}

export function ImportHistory({ onSelectImport, selectedImportId, organizationId }: ImportHistoryProps) {
  const { data, isLoading, error } = useBankImports({ organizationId });
  const imports = data?.results || [];

  const getStatusBadge = (status: string, syncedCount: number, totalCount: number) => {
    if (status === 'SYNCED' || syncedCount === totalCount) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#49a034]/10 text-[#49a034]">
          <CheckCircle className="h-3 w-3" />
          Synced
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f77f00]/10 text-[#f77f00]">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    if (syncedCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#4E97D1]/10 text-[#4E97D1]">
          <Clock className="h-3 w-3" />
          Partial ({syncedCount}/{totalCount})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#fed652]/20 text-[#d4a843]">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#638C80]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Import History</h3>
              <p className="text-sm text-gray-500">Recent bank file imports and sync status</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-[#638C80] border-t-transparent rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#638C80]" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Import History</h3>
              <p className="text-sm text-gray-500">Recent bank file imports and sync status</p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-2xl bg-[#f77f00]/10 flex items-center justify-center mx-auto mb-4">
              <XCircle className="h-8 w-8 text-[#f77f00]" />
            </div>
            <p className="text-sm text-gray-600">Failed to load import history</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-lg shadow-[#638C80]/30 flex items-center justify-center">
            <FileText className="h-5 w-5 text-white" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Import History</h3>
            <p className="text-sm text-gray-500">Recent bank file imports and sync status</p>
          </div>
        </div>
      </div>
      <div className="p-6">
        {imports.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No imports yet</p>
            <p className="text-xs text-gray-400 mt-1">Upload a bank file to get started</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                  <TableHead className="font-semibold text-gray-600">File</TableHead>
                  <TableHead className="font-semibold text-gray-600">Bank</TableHead>
                  <TableHead className="text-center font-semibold text-gray-600">Transactions</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                  <TableHead className="font-semibold text-gray-600">Date</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {imports.map((imp, index) => (
                  <TableRow
                    key={imp.id}
                    className={`cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                      selectedImportId === imp.id ? 'bg-[#638C80]/10 hover:bg-[#638C80]/10' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                    onClick={() => onSelectImport?.(imp.id)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <FileText className="h-4 w-4 text-[#638C80]" />
                        </div>
                        <span className="truncate max-w-[200px] text-gray-800">
                          {imp.original_filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-lg">
                        {imp.bank_provider.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="font-semibold text-gray-800">{imp.transactions_count}</span>
                        {imp.transactions_synced > 0 && (
                          <span className="text-xs text-[#638C80] font-medium">
                            {imp.transactions_synced} synced
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(imp.status, imp.transactions_synced, imp.transactions_count)}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {formatDistanceToNow(new Date(imp.imported_at), { addSuffix: true })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="hover:bg-[#638C80]/10 rounded-lg">
                        {imp.transactions_synced === imp.transactions_count ? (
                          <CheckCircle className="h-4 w-4 text-[#49a034]" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
