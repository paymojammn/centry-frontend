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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-primary/5 text-primary">
          <CheckCircle className="h-3 w-3" />
          Synced
        </span>
      );
    }
    if (status === 'FAILED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4944A]/10 text-[#D4944A]">
          <XCircle className="h-3 w-3" />
          Failed
        </span>
      );
    }
    if (syncedCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
          <Clock className="h-3 w-3" />
          {syncedCount}/{totalCount}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
        <Clock className="h-3 w-3" />
        Pending
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-medium text-foreground">Import History</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground/60" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-card rounded-lg border border-border">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground/60" />
            <h3 className="text-sm font-medium text-foreground">Import History</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Failed to load import history</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border">
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground/60" />
          <h3 className="text-sm font-medium text-foreground">Import History</h3>
        </div>
        <p className="text-xs text-muted-foreground mt-1">Recent bank file imports and sync status</p>
      </div>

      {imports.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No imports yet</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Upload a bank file to get started</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">File</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Bank</th>
              <th className="text-center text-xs font-medium text-muted-foreground px-6 py-3">Transactions</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Status</th>
              <th className="text-left text-xs font-medium text-muted-foreground px-6 py-3">Date</th>
              <th className="w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {imports.map((imp) => (
              <tr
                key={imp.id}
                className={`cursor-pointer hover:bg-muted transition-colors ${
                  selectedImportId === imp.id ? 'bg-primary/5' : ''
                }`}
                onClick={() => onSelectImport?.(imp.id)}
              >
                <td className="px-6 py-3">
                  <span className="text-sm font-medium text-foreground truncate max-w-[200px] block">
                    {imp.original_filename}
                  </span>
                </td>
                <td className="px-6 py-3">
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                    {imp.bank_provider.name}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className="text-sm font-medium text-foreground">{imp.transactions_count}</span>
                  {imp.transactions_synced > 0 && (
                    <span className="text-xs text-primary ml-1">
                      ({imp.transactions_synced} synced)
                    </span>
                  )}
                </td>
                <td className="px-6 py-3">
                  {getStatusBadge(imp.status, imp.transactions_synced, imp.transactions_count)}
                </td>
                <td className="px-6 py-3">
                  <span className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(imp.imported_at), { addSuffix: true })}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                    {imp.transactions_synced === imp.transactions_count ? (
                      <CheckCircle className="h-4 w-4 text-primary" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
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
