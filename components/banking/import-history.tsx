"use client";

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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
          <CheckCircle className="h-3 w-3" />
          Synced
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    if (syncedCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
          <Clock className="h-3 w-3" />
          {syncedCount}/{totalCount}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Import History</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Import History</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Failed to load import history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-gray-400" />
          <h3 className="text-sm font-medium text-gray-900">Import History</h3>
        </div>
        <p className="text-xs text-gray-500 mt-1">Recent bank file imports and sync status</p>
      </div>

      {imports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No imports yet</p>
          <p className="text-xs text-gray-400 mt-1">Upload a bank file to get started</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/50">
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">File</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Bank</th>
              <th className="text-center text-xs font-medium text-gray-500 px-6 py-3">Transactions</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-gray-500 px-6 py-3">Date</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {imports.map((imp) => (
              <tr
                key={imp.id}
                className={`cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedImportId === imp.id ? 'bg-[#638C80]/5' : ''
                }`}
                onClick={() => onSelectImport?.(imp.id)}
              >
                <td className="px-6 py-3">
                  <span className="text-sm font-medium text-gray-900 truncate max-w-[200px] block">
                    {imp.original_filename}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                    {imp.bank_provider.name}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="text-sm font-medium text-gray-900">{imp.transactions_count}</span>
                  {imp.transactions_synced > 0 && (
                    <span className="text-xs text-[#638C80] ml-1">
                      ({imp.transactions_synced} synced)
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {getStatusBadge(imp.status, imp.transactions_synced, imp.transactions_count)}
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-gray-500">
                    {formatDistanceToNow(new Date(imp.imported_at), { addSuffix: true })}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-gray-100">
                    {imp.transactions_synced === imp.transactions_count ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-400" />
                    )}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
