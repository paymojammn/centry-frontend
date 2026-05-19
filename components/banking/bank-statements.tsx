"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronRight,
  Download,
  FileText,
  Loader2,
  Server,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ContentCard,
  ContentCardHeader,
} from "@/components/layout/content-card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import {
  useBankAccounts,
  useBankImports,
  useBankTransactions,
  useSFTPCredentials,
  useSFTPDownloadStatements,
  useSFTPTaskStatus,
  type SFTPCredential,
} from "@/hooks/use-banking";
import { useHasPermission } from "@/hooks/use-user";

interface BankStatementsProps {
  organizationId?: string;
}

interface BankAccount {
  id: number;
  account_name: string;
  account_number: string;
  currency: string;
  balance: string | null;
  last_balance_update: string | null;
}

interface BankFileImportRow {
  id: number;
  original_filename: string;
  status: string;
  transactions_count: number;
  imported_at: string;
  bank_account?: {
    id: number;
    account_name: string;
    account_number: string;
    currency: string;
  } | null;
}

const STATUS_STYLES: Record<string, string> = {
  COMPLETED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  FULLY_SYNCED: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  PARTIALLY_SYNCED: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  PROCESSING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  FAILED: "bg-red-500/10 text-red-700 border-red-500/20",
};

const STATUS_LABELS: Record<string, string> = {
  COMPLETED: "Imported",
  FULLY_SYNCED: "Synced",
  PARTIALLY_SYNCED: "Partial sync",
  PROCESSING: "Processing",
  PENDING: "Pending",
  FAILED: "Failed",
};

export function BankStatements({ organizationId }: BankStatementsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<
    number | undefined
  >();
  const [pullTaskId, setPullTaskId] = useState<string | undefined>();
  const [isPulling, setIsPulling] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [accountFilter, setAccountFilter] = useState<string>("all");

  const hasBankingExport = useHasPermission("banking.export");

  const { data: accountsData, isLoading: accountsLoading } =
    useBankAccounts(organizationId);
  const bankAccounts: BankAccount[] = (accountsData as any)?.results || [];

  const { data: credentialsData, isLoading: credentialsLoading } =
    useSFTPCredentials(selectedAccountId);
  const sftpCredentials: SFTPCredential[] =
    (credentialsData as any)?.results || [];

  const { data: importsData, isLoading: importsLoading, refetch: refetchImports } =
    useBankImports({ organizationId });
  const allImports: BankFileImportRow[] = (importsData?.results as any) || [];

  // One SFTP login often serves multiple accounts at the same bank (Stanbic
  // drops FINSTMT files for both UGX and USD into the same Inbox). Restrict
  // the local list to MT940-shaped statements regardless of which account
  // they ended up routed to; filter by account using the dropdown.
  const statements = useMemo(() => {
    return allImports.filter((row) => {
      const name = (row.original_filename || "").toLowerCase();
      if (!name) return false;
      if (name.includes("pain002") || name.includes("pain.002")) return false;
      if (name.includes("_ack_") || name.includes("_nack_")) return false;
      if (name.includes("_intaud_") || name.includes("_finaud_")) return false;
      return (
        name.includes("finstmt") ||
        name.includes("camt") ||
        name.endsWith(".mt940") ||
        name.endsWith(".sta") ||
        name.endsWith(".txt")
      );
    });
  }, [allImports]);

  const filteredStatements = useMemo(() => {
    if (accountFilter === "all") return statements;
    return statements.filter(
      (s) => String(s.bank_account?.id ?? "") === accountFilter
    );
  }, [statements, accountFilter]);

  const pullStatements = useSFTPDownloadStatements();
  const { data: taskStatus } = useSFTPTaskStatus(pullTaskId);

  // Auto-pick the first active credential when an account is chosen.
  useEffect(() => {
    if (sftpCredentials.length > 0 && !selectedSFTPCredentialId) {
      const active = sftpCredentials.find((c) => c.is_active);
      const fallback = sftpCredentials[0];
      const pick = active ?? fallback;
      if (pick) setSelectedSFTPCredentialId(pick.id);
    }
  }, [sftpCredentials, selectedSFTPCredentialId]);

  useEffect(() => {
    if (!taskStatus || !pullTaskId) return;
    if (taskStatus.status === "SUCCESS") {
      toast.success("Statements pulled and balance updated");
      setPullTaskId(undefined);
      setIsPulling(false);
      refetchImports();
    } else if (taskStatus.status === "FAILURE") {
      toast.error("SFTP pull failed");
      setPullTaskId(undefined);
      setIsPulling(false);
    }
  }, [taskStatus, pullTaskId, refetchImports]);

  const selectedCredential = sftpCredentials.find(
    (c) => c.id === selectedSFTPCredentialId
  );

  const handlePullFiles = async () => {
    if (!selectedAccountId || !selectedSFTPCredentialId) return;
    try {
      setIsPulling(true);
      const result = await pullStatements.mutateAsync({
        bank_account_id: selectedAccountId,
        sftp_credential_id: selectedSFTPCredentialId,
        // FINSTMT files are dropped daily; 90 days catches a fresh inbox.
        since_hours: 24 * 90,
        auto_import: true,
        move_processed: true,
      });
      if (result.task_id) {
        setPullTaskId(result.task_id);
        toast.info("Pulling statements from SFTP…");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Pull failed";
      toast.error(msg);
      setIsPulling(false);
    }
  };

  const handleDownload = async (importId: number, filename: string) => {
    setDownloadingId(importId);
    try {
      const blob = await api.get<Blob>(
        `/api/v1/banking/imports/${importId}/download/`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error(err?.message || "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Pull config — same shape as Pain002Inbox so one SFTP login can serve
          both UGX and USD accounts. Pick the account, then the credential,
          then pull. */}
      <div className="bg-card rounded-xl border border-border/80 shadow-sm">
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-medium text-foreground">
              Bank Statements
            </h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Pull statement files (MT940 / FINSTMT) from the bank — closing
            balances update the account, transactions appear below
          </p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                Bank Account
              </Label>
              <Select
                value={selectedAccountId?.toString() || ""}
                onValueChange={(value) => {
                  setSelectedAccountId(value ? Number(value) : undefined);
                  setSelectedSFTPCredentialId(undefined);
                }}
                disabled={accountsLoading}
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue
                    placeholder={
                      accountsLoading ? "Loading…" : "Select account"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (
                    <SelectItem
                      key={account.id}
                      value={account.id.toString()}
                    >
                      {account.account_name} ({account.account_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">
                SFTP Connection
              </Label>
              <Select
                value={selectedSFTPCredentialId?.toString() || ""}
                onValueChange={(value) =>
                  setSelectedSFTPCredentialId(value ? Number(value) : undefined)
                }
                disabled={
                  !selectedAccountId ||
                  credentialsLoading ||
                  sftpCredentials.length === 0
                }
              >
                <SelectTrigger className="h-10 bg-muted border-border">
                  <SelectValue
                    placeholder={
                      credentialsLoading
                        ? "Loading…"
                        : sftpCredentials.length === 0
                        ? "No connections"
                        : "Select connection"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sftpCredentials.map((credential) => (
                    <SelectItem
                      key={credential.id}
                      value={credential.id.toString()}
                    >
                      <div className="flex items-center gap-2">
                        <span>{credential.host}</span>
                        {credential.is_active && (
                          <span className="h-2 w-2 rounded-full bg-primary" />
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handlePullFiles}
                disabled={
                  !selectedSFTPCredentialId || isPulling || !hasBankingExport
                }
                className="h-10 bg-primary hover:bg-primary/90 btn-press"
              >
                {isPulling ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    {pullTaskId ? "Processing…" : "Pulling…"}
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Pull Statements
                  </>
                )}
              </Button>
            </div>
          </div>

          {selectedCredential && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                <span>
                  <span className="text-muted-foreground/60">Host:</span>{" "}
                  {selectedCredential.host}:{selectedCredential.port}
                </span>
                <span>
                  <span className="text-muted-foreground/60">Download:</span>{" "}
                  <code className="text-xs bg-muted px-1 rounded">
                    {selectedCredential.download_path}
                  </code>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Account balances — one chip per active account, sized for any number */}
      {accountsLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : bankAccounts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {bankAccounts.map((acct) => (
            <ContentCard key={acct.id}>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {acct.account_name} · {acct.account_number}
                  </p>
                  <div className="mt-1 flex items-baseline gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground/60" />
                    <span className="text-lg font-semibold tabular-nums text-foreground">
                      {acct.balance != null
                        ? formatCurrency(
                            parseFloat(acct.balance),
                            acct.currency
                          )
                        : "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                    {acct.last_balance_update
                      ? `Updated ${format(
                          new Date(acct.last_balance_update),
                          "dd MMM yyyy HH:mm"
                        )}`
                      : "Never updated from statement"}
                  </p>
                </div>
              </div>
            </ContentCard>
          ))}
        </div>
      ) : null}

      {/* Imported statements + transaction drill-in */}
      <ContentCard noPadding>
        <ContentCardHeader>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                Imported Statements
              </h3>
              {!importsLoading && (
                <Badge variant="secondary" className="text-xs">
                  {filteredStatements.length}
                </Badge>
              )}
            </div>
            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="w-[180px] h-8">
                <SelectValue placeholder="All accounts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id.toString()}>
                    {a.account_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </ContentCardHeader>

        {importsLoading ? (
          <div className="space-y-3 p-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-11 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredStatements.length === 0 ? (
          <div className="py-20 text-center">
            <div className="mx-auto mb-3 w-fit rounded-xl bg-muted p-3">
              <FileText className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">
              No statements yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use “Pull Statements” above to fetch FINSTMT files from the bank
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-3 border-b border-border/50 px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <div className="col-span-2">Imported</div>
              <div className="col-span-5">Filename</div>
              <div className="col-span-2">Account</div>
              <div className="col-span-1 text-center">Txns</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-1"></div>
            </div>
            <div className="max-h-[calc(100vh-560px)] divide-y divide-border/50 overflow-y-auto">
              {filteredStatements.map((row) => (
                <StatementRow
                  key={row.id}
                  row={row}
                  expanded={expandedId === row.id}
                  onToggle={() =>
                    setExpandedId(expandedId === row.id ? null : row.id)
                  }
                  onDownload={() =>
                    handleDownload(row.id, row.original_filename)
                  }
                  downloading={downloadingId === row.id}
                />
              ))}
            </div>
          </>
        )}
      </ContentCard>
    </div>
  );
}

function StatementRow({
  row,
  expanded,
  onToggle,
  onDownload,
  downloading,
}: {
  row: BankFileImportRow;
  expanded: boolean;
  onToggle: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  return (
    <div className="text-sm">
      <div
        role="button"
        tabIndex={0}
        onClick={onToggle}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
        className="grid w-full cursor-pointer grid-cols-12 items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-muted/30 focus-visible:outline-hidden focus-visible:bg-muted/40"
      >
        <div className="col-span-2 text-muted-foreground">
          {format(new Date(row.imported_at), "dd MMM yyyy")}
          <p className="text-xs text-muted-foreground/60">
            {format(new Date(row.imported_at), "HH:mm")}
          </p>
        </div>
        <div className="col-span-5 flex min-w-0 items-center gap-2">
          <ChevronRight
            className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          />
          <p className="truncate font-medium text-foreground">
            {row.original_filename}
          </p>
        </div>
        <div className="col-span-2 min-w-0">
          <p className="truncate text-xs text-muted-foreground">
            {row.bank_account?.account_name || "—"}
          </p>
        </div>
        <div className="col-span-1 text-center tabular-nums text-foreground">
          {row.transactions_count}
        </div>
        <div className="col-span-1">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${
              STATUS_STYLES[row.status] ||
              "bg-muted text-muted-foreground border-border"
            }`}
          >
            {STATUS_LABELS[row.status] || row.status}
          </span>
        </div>
        <div className="col-span-1 flex justify-end">
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2.5 text-xs"
            disabled={downloading}
            onClick={(e) => {
              e.stopPropagation();
              onDownload();
            }}
          >
            {downloading ? (
              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 mr-1" />
            )}
            Download
          </Button>
        </div>
      </div>
      {expanded && <StatementTransactions fileImportId={row.id} />}
    </div>
  );
}

function StatementTransactions({ fileImportId }: { fileImportId: number }) {
  const { data, isLoading } = useBankTransactions({ file_import: fileImportId });
  const txns: any[] = (data?.results as any) || [];

  if (isLoading) {
    return (
      <div className="space-y-2 bg-muted/20 px-6 py-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (txns.length === 0) {
    return (
      <div className="bg-muted/20 px-6 py-4 text-xs text-muted-foreground">
        No transactions in this statement.
      </div>
    );
  }

  return (
    <div className="bg-muted/20 px-6 py-3">
      <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
        <div className="col-span-2">Date</div>
        <div className="col-span-6">Description</div>
        <div className="col-span-1">Type</div>
        <div className="col-span-3 text-right">Amount</div>
      </div>
      <div className="divide-y divide-border/30">
        {txns.map((t) => {
          const credit = parseFloat(t.credit_amount ?? "0");
          const debit = parseFloat(t.debit_amount ?? "0");
          const amount = credit > 0 ? credit : debit;
          const isCredit = t.transaction_type === "CREDIT" || credit > 0;
          return (
            <div
              key={t.id}
              className="grid grid-cols-12 items-center gap-2 px-2 py-2 text-xs"
            >
              <div className="col-span-2 text-muted-foreground">
                {format(new Date(t.transaction_date), "dd MMM")}
              </div>
              <div className="col-span-6 min-w-0">
                <p className="truncate text-foreground">{t.description}</p>
                {t.reference && (
                  <p className="truncate text-[10px] text-muted-foreground/60">
                    {t.reference}
                  </p>
                )}
              </div>
              <div className="col-span-1">
                <span
                  className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    isCredit
                      ? "bg-emerald-500/10 text-emerald-700"
                      : "bg-red-500/10 text-red-700"
                  }`}
                >
                  {isCredit ? "CR" : "DR"}
                </span>
              </div>
              <div
                className={`col-span-3 text-right tabular-nums ${
                  isCredit ? "text-emerald-700" : "text-foreground"
                }`}
              >
                {isCredit ? "+" : "−"}
                {formatCurrency(amount || 0, t.currency || "UGX")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
