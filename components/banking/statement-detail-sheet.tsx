"use client";

import { format } from "date-fns";
import { Download, Loader2, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/components/layout/status-badge";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { useBankTransactions, type BankTransaction } from "@/hooks/use-banking";
import { formatCurrency } from "@/lib/utils";

/** One row of /banking/imports as rendered by the Statements tab. */
export interface BankStatementRow {
  id: number;
  original_filename: string;
  status: string;
  transactions_count: number;
  imported_at: string;
  synced_at?: string | null;
  bank_account?: {
    id: number;
    account_name: string;
    account_number: string;
    currency: string;
  } | null;
}

/**
 * The transactions endpoint returns split credit/debit columns on top of
 * the typed `amount`; keep both so either shape renders.
 */
type StatementTxn = BankTransaction & {
  credit_amount?: string | null;
  debit_amount?: string | null;
};

/** Import status → shared chip. Wording matches the other banking tabs. */
export function StatementStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "COMPLETED":
      return <StatusBadge status="paid" label="Processed" size="sm" />;
    case "FULLY_SYNCED":
      return <StatusBadge status="paid" label="Synced" size="sm" />;
    case "PARTIALLY_SYNCED":
      return (
        <span className="status-pill bg-info-500/10 text-info-700 border-info-500/20">
          Partially synced
        </span>
      );
    case "PROCESSING":
      return <StatusBadge status="processing" label="Processing" size="sm" />;
    case "PENDING":
      return <StatusBadge status="pending" label="Pending" size="sm" />;
    case "FAILED":
      return <StatusBadge status="failed" label="Failed" size="sm" />;
    default:
      return (
        <span className="status-pill bg-neutral-500/10 text-neutral-700 border-neutral-500/20">
          {status}
        </span>
      );
  }
}

interface StatementDetailSheetProps {
  statement: BankStatementRow | null;
  onClose: () => void;
  onDownload: (statement: BankStatementRow) => void;
  downloading: boolean;
}

/** Right-hand sheet: statement header + its transaction lines. */
export function StatementDetailSheet({
  statement,
  onClose,
  onDownload,
  downloading,
}: StatementDetailSheetProps) {
  return (
    <Sheet open={!!statement} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:w-[640px] sm:max-w-none p-0 gap-0 flex flex-col">
        {statement && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <SheetTitle className="truncate">{statement.original_filename}</SheetTitle>
                <StatementStatusBadge status={statement.status} />
              </div>
              <SheetDescription>
                {statement.bank_account?.account_name ?? "Unrouted"}
                {" · Imported "}
                {format(new Date(statement.imported_at), "dd MMM yyyy HH:mm")}
                {statement.synced_at &&
                  ` · Synced ${format(new Date(statement.synced_at), "dd MMM yyyy HH:mm")}`}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <StatementTransactions fileImportId={statement.id} />
            </div>

            <SheetFooter className="px-6 py-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={downloading}
                onClick={() => onDownload(statement)}
              >
                {downloading ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                )}
                Download file
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function StatementTransactions({ fileImportId }: { fileImportId: number }) {
  const { data, isLoading } = useBankTransactions({ file_import: fileImportId });
  const txns = (data?.results ?? []) as StatementTxn[];

  if (isLoading) return <LoadingState />;

  if (txns.length === 0) {
    return (
      <EmptyState
        icon={Receipt}
        title="No transactions"
        description="This statement did not contain any transaction lines."
      />
    );
  }

  return (
    <table className="w-full table-professional">
      <thead>
        <tr>
          <th>Date</th>
          <th>Description</th>
          <th>Type</th>
          <th className="text-right">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {txns.map((t) => {
          const credit = parseFloat(t.credit_amount ?? "0");
          const debit = parseFloat(t.debit_amount ?? "0");
          const amount =
            credit > 0 ? credit : debit > 0 ? debit : parseFloat(t.amount ?? "0");
          const isCredit = t.transaction_type === "CREDIT" || credit > 0;
          return (
            <tr key={t.id}>
              <td className="cell-muted whitespace-nowrap">
                {format(new Date(t.transaction_date), "dd MMM yyyy")}
              </td>
              <td className="cell-primary">
                <div className="truncate max-w-[260px]">{t.description}</div>
                {t.reference && (
                  <span className="cell-sub truncate max-w-[260px]">{t.reference}</span>
                )}
              </td>
              <td>
                <span
                  className={`status-pill min-w-0 ${
                    isCredit
                      ? "bg-success-500/10 text-success-700 border-success-500/20"
                      : "bg-danger-500/10 text-danger-700 border-danger-500/20"
                  }`}
                >
                  {isCredit ? "Credit" : "Debit"}
                </span>
              </td>
              <td className="cell-amount">
                <span className={isCredit ? "text-success-700" : undefined}>
                  {isCredit ? "+" : "−"}
                  {formatCurrency(amount || 0, t.currency || "UGX")}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
