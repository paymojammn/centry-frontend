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
import { StatCard } from "@/components/layout/stat-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import {
  StatementDetailSheet,
  StatementStatusBadge,
  type BankStatementRow,
} from "@/components/banking/statement-detail-sheet";
import { api } from "@/lib/api";

// Strip a "CurrencyCode.UGX"-style prefix down to the bare ISO code.
function cleanCurrencyCode(currency: string | null | undefined): string {
  if (!currency) return "USD";
  if (currency.includes(".")) return currency.split(".").pop() || currency;
  return currency;
}

function formatBalanceAmount(num: number): string {
  return num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
import {
  useBankAccounts,
  useBankImports,
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

type StatusFilter = "all" | "synced" | "pending" | "failed" | "imports";

function filterByAccount(rows: BankStatementRow[], accountId?: number) {
  if (!accountId) return rows;
  return rows.filter((s) => String(s.bank_account?.id ?? "") === String(accountId));
}

export function BankStatements({ organizationId }: BankStatementsProps) {
  const [selectedAccountId, setSelectedAccountId] = useState<number | undefined>();
  const [selectedSFTPCredentialId, setSelectedSFTPCredentialId] = useState<
    number | undefined
  >();
  const [pullTaskId, setPullTaskId] = useState<string | undefined>();
  const [isPulling, setIsPulling] = useState(false);
  const [selectedStatementId, setSelectedStatementId] = useState<number | null>(null);
  const [downloadingId, setDownloadingId] = useState<number | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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
  const allImports = useMemo<BankStatementRow[]>(
    () => (importsData?.results as unknown as BankStatementRow[] | undefined) ?? [],
    [importsData]
  );

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
  const accountStatements = useMemo(
    () => filterByAccount(statements, selectedAccountId),
    [statements, selectedAccountId]
  );

  // Full import history for the account — every file the bank dropped,
  // including pain.002 acks and audit files the statement filter hides.
  const accountImports = useMemo(
    () => filterByAccount(allImports, selectedAccountId),
    [allImports, selectedAccountId]
  );

  const selectedStatement =
    allImports.find((row) => row.id === selectedStatementId) ?? null;

  const statusCount = (pred: (s: string) => boolean) =>
    accountStatements.filter((row) => pred(row.status)).length;

  // Balances are split by currency (summing across currencies is meaningless),
  // so we surface one card for the local currency and one for USD.
  const balanceStats = useMemo(() => {
    const nonUsd = bankAccounts.find(
      (a) => cleanCurrencyCode(a.currency) !== "USD"
    );
    const localCurrency = nonUsd ? cleanCurrencyCode(nonUsd.currency) : "UGX";
    const sumFor = (ccy: string) =>
      bankAccounts
        .filter((a) => cleanCurrencyCode(a.currency) === ccy)
        .reduce(
          (sum, a) =>
            sum + (a.balance != null ? parseFloat(String(a.balance)) || 0 : 0),
          0
        );
    return {
      localCurrency,
      balanceLocal: sumFor(localCurrency),
      balanceUSD: sumFor("USD"),
    };
  }, [bankAccounts]);

  const filteredStatements = useMemo(() => {
    const q = search.toLowerCase();
    const base = statusFilter === "imports" ? accountImports : accountStatements;
    return base.filter((row) => {
      if (statusFilter === "synced" && !isSynced(row.status)) return false;
      if (statusFilter === "pending" && !isPendingStatus(row.status)) return false;
      if (statusFilter === "failed" && row.status !== "FAILED") return false;
      if (q && !(row.original_filename || "").toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accountStatements, accountImports, statusFilter, search]);

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

  const handleRefreshAllBalances = async () => {
    setRefreshingAll(true);
    let refreshed = 0;
    try {
      for (const acct of bankAccounts) {
        try {
          await refreshBalance.mutateAsync({ accountId: acct.id });
          refreshed += 1;
        } catch {
          // Account may have no imported statement yet — skip it.
        }
      }
      toast.success(
        `Refreshed ${refreshed} of ${bankAccounts.length} balance${
          bankAccounts.length === 1 ? "" : "s"
        } from the latest statements`
      );
    } finally {
      setRefreshingAll(false);
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
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Balance summary — split by currency (local + USD), like the Accounts page */}
      {accountsLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : bankAccounts.length > 0 ? (
        <div className="space-y-3">
          {hasBankingExport && (
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshAllBalances}
                disabled={refreshingAll}
                title="Recompute balances from the most recent imported statements"
                className="h-8 text-muted-foreground hover:text-foreground"
              >
                {refreshingAll ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                )}
                Refresh balances
              </Button>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            <StatCard
              label={`Balance · ${balanceStats.localCurrency}`}
              value={balanceStats.balanceLocal.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              subtext={`${balanceStats.localCurrency} ${formatBalanceAmount(
                balanceStats.balanceLocal
              )}`}
              icon={Wallet}
              variant="accent"
            />
            <StatCard
              label="Balance · USD"
              value={balanceStats.balanceUSD.toLocaleString(undefined, {
                maximumFractionDigits: 0,
              })}
              subtext={`USD ${formatBalanceAmount(balanceStats.balanceUSD)}`}
              icon={Wallet}
              variant="info"
            />
          </div>
        </div>
      ) : null}

      {/* Statements — one .table-professional list; filter pills + pull controls in the header */}
      <ContentCard noPadding>
        <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
          {(
            [
              { value: "all", label: "All", count: accountStatements.length },
              { value: "synced", label: "Synced", count: statusCount(isSynced) },
              { value: "pending", label: "Pending", count: statusCount(isPendingStatus) },
              { value: "failed", label: "Failed", count: statusCount((s) => s === "FAILED") },
              { value: "imports", label: "Imports", count: accountImports.length },
            ] as { value: StatusFilter; label: string; count: number }[]
          ).map((p) => {
            const active = statusFilter === p.value;
            return (
              <button
                key={p.value}
                onClick={() => setStatusFilter(p.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
                }`}
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
              className="h-9 btn-press"
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
              aria-label="Refresh statements"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${importsLoading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>

        {importsLoading ? (
          <LoadingState />
        ) : filteredStatements.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={
              search || statusFilter !== "all"
                ? "No statements match"
                : "No statements yet"
            }
            description={
              search || statusFilter !== "all"
                ? "Try a different search or filter"
                : "Use Pull above to fetch FINSTMT files from the bank"
            }
          />
        ) : (
          <div className="max-h-[calc(100vh-560px)] overflow-auto">
            <table className="w-full table-professional">
              <colgroup>
                <col className="w-[120px]" />{/* Imported */}
                <col />{/* Statement — flexible */}
                <col />{/* Account */}
                <col className="w-[120px]" />{/* Synced */}
                <col className="w-[72px]" />{/* Txns */}
                <col className="w-[130px]" />{/* Status */}
                <col className="w-[150px]" />{/* Actions */}
              </colgroup>
              <thead>
                <tr>
                  <th>Imported</th>
                  <th>Statement</th>
                  <th>Account</th>
                  <th>Synced</th>
                  <th className="text-right">Txns</th>
                  <th>Status</th>
                  <th className="text-right pr-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredStatements.map((row) => {
                  const isSelected = selectedStatementId === row.id;
                  const downloading = downloadingId === row.id;
                  return (
                    <tr
                      key={row.id}
                      className={`${isSelected ? "is-selected" : ""} cursor-pointer`}
                      onClick={() => setSelectedStatementId(row.id)}
                    >
                      <td className="cell-muted whitespace-nowrap">
                        {format(new Date(row.imported_at), "dd MMM yyyy")}
                        <span className="cell-sub">
                          {format(new Date(row.imported_at), "HH:mm")}
                        </span>
                      </td>
                      <td className="cell-primary">
                        <div className="truncate max-w-[360px]" title={row.original_filename}>
                          {row.original_filename}
                        </div>
                      </td>
                      <td className="cell-muted">
                        <div className="truncate">
                          {row.bank_account?.account_name || "—"}
                        </div>
                        {row.bank_account?.account_number && (
                          <span className="cell-sub">{row.bank_account.account_number}</span>
                        )}
                      </td>
                      <td className="cell-muted whitespace-nowrap">
                        {row.synced_at ? (
                          <>
                            {format(new Date(row.synced_at), "dd MMM yyyy")}
                            <span className="cell-sub">
                              {format(new Date(row.synced_at), "HH:mm")}
                            </span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="cell-amount">{row.transactions_count}</td>
                      <td>
                        <StatementStatusBadge status={row.status} />
                      </td>
                      <td className="text-right pr-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            disabled={downloading}
                            onClick={() => handleDownload(row.id, row.original_filename)}
                          >
                            {downloading ? (
                              <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                            ) : (
                              <Download className="h-3.5 w-3.5 mr-1" />
                            )}
                            Download
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-muted-foreground/50 hover:text-foreground"
                            aria-label="View statement transactions"
                            onClick={() => setSelectedStatementId(row.id)}
                          >
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCard>

      <StatementDetailSheet
        statement={selectedStatement}
        onClose={() => setSelectedStatementId(null)}
        onDownload={(s) => handleDownload(s.id, s.original_filename)}
        downloading={selectedStatement ? downloadingId === selectedStatement.id : false}
      />
    </div>
  );
}
