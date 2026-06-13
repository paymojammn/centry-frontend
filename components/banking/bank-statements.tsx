"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
  ChevronRight,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ContentCard } from "@/components/layout/content-card";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { PILL_COLORS } from "@/lib/theme";
import {
  useBankAccounts,
  useBankImports,
  useBankTransactions,
  useRefreshAccountBalance,
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
  booked_balance: string | null;
  last_balance_update: string | null;
  balance_as_of_date: string | null;
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
  const [refreshingAccountId, setRefreshingAccountId] = useState<number | null>(
    null
  );
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

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

  const isSynced = (s: string) =>
    ["COMPLETED", "FULLY_SYNCED", "PARTIALLY_SYNCED"].includes(s);
  const isPendingStatus = (s: string) => ["PROCESSING", "PENDING"].includes(s);

  // Statements for the chosen account (drives both the list and the pill counts).
  const accountStatements = useMemo(() => {
    if (!selectedAccountId) return statements;
    return statements.filter(
      (s) => String(s.bank_account?.id ?? "") === String(selectedAccountId)
    );
  }, [statements, selectedAccountId]);

  const statusCount = (pred: (s: string) => boolean) =>
    accountStatements.filter((row) => pred(row.status)).length;

  const filteredStatements = useMemo(() => {
    const q = search.toLowerCase();
    return accountStatements.filter((row) => {
      if (statusFilter === "synced" && !isSynced(row.status)) return false;
      if (statusFilter === "pending" && !isPendingStatus(row.status)) return false;
      if (statusFilter === "failed" && row.status !== "FAILED") return false;
      if (q && !(row.original_filename || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accountStatements, statusFilter, search]);

  const pullStatements = useSFTPDownloadStatements();
  const { data: taskStatus } = useSFTPTaskStatus(pullTaskId);
  const refreshBalance = useRefreshAccountBalance();

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

  const handleRefreshBalance = async (acct: BankAccount) => {
    setRefreshingAccountId(acct.id);
    try {
      const result = await refreshBalance.mutateAsync({ accountId: acct.id });
      toast.success(
        `Balance refreshed from ${result.source_filename}: ${formatCurrency(
          parseFloat(result.balance),
          result.currency
        )}`
      );
    } catch (err: any) {
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Failed to refresh balance";
      toast.error(msg);
    } finally {
      setRefreshingAccountId(null);
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
      {/* Account balances — one chip per active account, sized for any number */}
      {accountsLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      ) : bankAccounts.length > 0 ? (
        <div className="grid gap-3 md:grid-cols-2">
          {bankAccounts.map((acct) => {
            const isRefreshing = refreshingAccountId === acct.id;
            return (
              <ContentCard key={acct.id}>
                <div className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground truncate">
                      {acct.account_name} · {acct.account_number}
                    </p>
                    <div className="mt-1 flex items-baseline gap-2">
                      <Wallet className="h-4 w-4 text-muted-foreground/60" />
                      <span className="text-lg font-normal tabular-nums text-foreground">
                        {acct.balance != null
                          ? formatCurrency(
                              parseFloat(acct.balance),
                              acct.currency
                            )
                          : "—"}
                      </span>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                        Available
                      </span>
                    </div>
                    {acct.booked_balance != null &&
                      acct.balance != null &&
                      acct.booked_balance !== acct.balance && (
                        <div className="mt-0.5 flex items-baseline gap-1.5">
                          <span className="text-xs tabular-nums text-muted-foreground">
                            {formatCurrency(
                              parseFloat(acct.booked_balance),
                              acct.currency
                            )}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground/60">
                            Booked
                          </span>
                        </div>
                      )}
                    <p className="mt-0.5 text-[11px] text-muted-foreground/70">
                      {acct.balance_as_of_date
                        ? `As of ${format(
                            new Date(acct.balance_as_of_date),
                            "dd MMM yyyy"
                          )}`
                        : acct.last_balance_update
                        ? `Updated ${format(
                            new Date(acct.last_balance_update),
                            "dd MMM yyyy HH:mm"
                          )}`
                        : "Never updated from statement"}
                    </p>
                  </div>
                  {hasBankingExport && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRefreshBalance(acct)}
                      disabled={isRefreshing}
                      title="Recompute balance from the most recent imported statement"
                      className="h-8 px-2 text-muted-foreground hover:text-foreground"
                    >
                      {isRefreshing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                      <span className="ml-1.5 text-xs">Refresh</span>
                    </Button>
                  )}
                </div>
              </ContentCard>
            );
          })}
        </div>
      ) : null}

      {/* Imported statements — one grid: status pills + pull controls in the header */}
      <ContentCard noPadding>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          {([
            { value: "all", label: "All", count: accountStatements.length, color: undefined },
            { value: "synced", label: "Synced", count: statusCount(isSynced), color: PILL_COLORS.processed },
            { value: "pending", label: "Pending", count: statusCount(isPendingStatus), color: "#D4B35A" },
            { value: "failed", label: "Failed", count: statusCount((s) => s === "FAILED"), color: PILL_COLORS.failed },
          ]).map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setStatusFilter(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                  active
                    ? p.color
                      ? "text-white"
                      : "bg-foreground text-card"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
                style={active && p.color ? { backgroundColor: p.color } : undefined}
              >
                {p.label} ({p.count})
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2 flex-wrap">
            <Select
              value={selectedAccountId?.toString() || "all"}
              onValueChange={(value) => {
                setSelectedAccountId(value === "all" ? undefined : Number(value));
                setSelectedSFTPCredentialId(undefined);
              }}
              disabled={accountsLoading}
            >
              <SelectTrigger className="w-[190px] h-9">
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
              <SelectTrigger className="w-[160px] h-9">
                <SelectValue
                  placeholder={
                    credentialsLoading
                      ? "Loading…"
                      : sftpCredentials.length === 0
                      ? "No connection"
                      : "Connection"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {sftpCredentials.map((credential) => (
                  <SelectItem key={credential.id} value={credential.id.toString()}>
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

            <Button
              onClick={handlePullFiles}
              disabled={!selectedSFTPCredentialId || isPulling || !hasBankingExport}
              size="sm"
              className="h-9 bg-primary hover:bg-primary/90 btn-press"
            >
              {isPulling ? (
                <>
                  <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  {pullTaskId ? "Processing…" : "Pulling…"}
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-1.5" />
                  Pull
                </>
              )}
            </Button>

            <div className="relative w-44">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search files..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchImports()}
              disabled={importsLoading}
              className="h-9 btn-press"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${importsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

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
            <p className="text-sm font-normal text-foreground">
              No statements yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Use “Pull Statements” above to fetch FINSTMT files from the bank
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-12 gap-3 border-b border-border/50 px-6 py-2.5 text-xs font-normal uppercase tracking-wider text-muted-foreground">
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
          <p className="truncate font-normal text-foreground">
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
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-normal ${
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
      <div className="grid grid-cols-12 gap-2 px-2 py-1.5 text-[10px] font-normal uppercase tracking-wider text-muted-foreground/70">
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
                  className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-normal ${
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
