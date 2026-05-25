"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BankingExportOverview } from "@/components/banking/banking-export-overview";
import { SFTPExport } from "@/components/banking/sftp-export";
import { Pain002Inbox } from "@/components/banking/pain002-inbox";
import { Pain002Status } from "@/components/banking/pain002-status";
import { BankStatements } from "@/components/banking/bank-statements";
import { useOrganizations } from "@/hooks/use-organization";
import { useBankPaymentExports, useBankAccounts } from "@/hooks/use-banking";
import {
  ContentCard,
  ContentCardHeader,
} from "@/components/layout/content-card";
import {
  Building2,
  BarChart3,
  Upload,
  FileCheck,
  FolderOpen,
  Inbox,
  Search,
  Download,
  Wallet,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { api } from "@/lib/api";
import { useHasPermission } from "@/hooks/use-user";

// ============================================================
// Status styles for export files
// ============================================================

const FILE_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  generated: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  uploaded: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  processed: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  failed: "bg-red-500/10 text-red-700 border-red-500/20",
};

const FILE_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  generated: "Generated",
  uploaded: "Uploaded",
  processed: "Processed",
  failed: "Failed",
};

// ============================================================
// Page
// ============================================================

export default function BankingExportPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<
    string | null
  >(null);
  const [selectedExportId, setSelectedExportId] = useState<
    number | undefined
  >();

  // Files tab filters
  const [fileSearch, setFileSearch] = useState("");
  const [fileStatusFilter, setFileStatusFilter] = useState("all");
  const [fileAccountFilter, setFileAccountFilter] = useState("all");

  const { data: organizationsResponse, isLoading: orgsLoading } =
    useOrganizations();

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const { data: bankAccountsData } = useBankAccounts(
    selectedOrganizationId || undefined
  );
  const bankAccounts = (bankAccountsData as any)?.results || [];

  const { data: exportsData, isLoading: exportsLoading } =
    useBankPaymentExports({
      organizationId: selectedOrganizationId || undefined,
      status: fileStatusFilter !== "all" ? fileStatusFilter : undefined,
      bankAccountId:
        fileAccountFilter !== "all" ? Number(fileAccountFilter) : undefined,
    });

  const exports = exportsData?.results || [];

  // Client-side search filter
  const filteredExports = exports.filter((e) => {
    if (!fileSearch) return true;
    const q = fileSearch.toLowerCase();
    return (
      (e.file_name || "").toLowerCase().includes(q) ||
      (e.bank_account?.account_name || "").toLowerCase().includes(q) ||
      (e.currency || "").toLowerCase().includes(q)
    );
  });

  const hasFileFilters =
    fileSearch !== "" ||
    fileStatusFilter !== "all" ||
    fileAccountFilter !== "all";

  const clearFileFilters = () => {
    setFileSearch("");
    setFileStatusFilter("all");
    setFileAccountFilter("all");
  };

  const handleExportComplete = () => {
    setActiveTab("overview");
  };

  const handleSelectExport = (exportId: number) => {
    setSelectedExportId(exportId);
  };

  const handleDownload = async (exportId: number, filename: string) => {
    try {
      const blob = await api.get<Blob>(
        `/api/v1/banking/exports/files/${exportId}/`,
        { responseType: "blob" }
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      // Silently handle
    }
  };

  const hasBankingExport = useHasPermission("banking.export");

  const tabs = useMemo(() => {
    const allTabs = [
      { value: "overview", label: "Overview", icon: BarChart3 },
      { value: "sftp-export", label: "Pay", icon: Upload, requiresExport: true },
      { value: "files", label: "Outbox", icon: FolderOpen },
      { value: "inbox", label: "Inbox", icon: Inbox, requiresExport: true },
      { value: "statements", label: "Statements", icon: Wallet },
      { value: "bank-status", label: "Reconciliation", icon: FileCheck, requiresExport: true },
    ];
    return allTabs.filter((t) => !t.requiresExport || hasBankingExport);
  }, [hasBankingExport]);

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-normal text-foreground">Export</h1>
            <Select
              value={selectedOrganizationId || undefined}
              onValueChange={setSelectedOrganizationId}
              disabled={orgsLoading || !organizations?.length}
            >
              <SelectTrigger className="w-[200px] h-9 text-sm bg-muted border-border">
                <Building2 className="h-4 w-4 text-muted-foreground/60 mr-2" />
                <SelectValue placeholder="Select org" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id}>
                    <div className="flex items-center gap-2">
                      <span>{org.name}</span>
                      {org.external_id?.startsWith("xero_") && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                          Xero
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-normal border-b-2 transition-colors ${
                    activeTab === tab.value
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        {activeTab === "overview" && (
          <BankingExportOverview
            organizationId={selectedOrganizationId || undefined}
            onNavigate={setActiveTab}
          />
        )}
        {activeTab === "sftp-export" && (
          <SFTPExport
            organizationId={selectedOrganizationId || undefined}
            onExportComplete={handleExportComplete}
            onSelectExport={handleSelectExport}
            selectedExportId={selectedExportId}
          />
        )}
        {activeTab === "inbox" && (
          <Pain002Inbox organizationId={selectedOrganizationId || undefined} />
        )}
        {activeTab === "bank-status" && (
          <Pain002Status
            organizationId={selectedOrganizationId || undefined}
            onSelectExport={handleSelectExport}
            selectedExportId={selectedExportId}
          />
        )}
        {activeTab === "statements" && (
          <BankStatements organizationId={selectedOrganizationId || undefined} />
        )}
        {activeTab === "files" && (
          <div className="space-y-5">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[180px] max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search files..."
                  value={fileSearch}
                  onChange={(e) => setFileSearch(e.target.value)}
                  className="pl-10 h-9"
                />
              </div>

              <Select
                value={fileAccountFilter}
                onValueChange={setFileAccountFilter}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue placeholder="All accounts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All accounts</SelectItem>
                  {bankAccounts.map((a: any) => (
                    <SelectItem key={a.id} value={a.id.toString()}>
                      {a.account_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={fileStatusFilter}
                onValueChange={setFileStatusFilter}
              >
                <SelectTrigger className="w-[150px] h-9">
                  <SelectValue placeholder="All status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="uploaded">Uploaded</SelectItem>
                  <SelectItem value="processed">Processed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              {hasFileFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFileFilters}
                  className="h-9 text-muted-foreground"
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Clear
                </Button>
              )}
            </div>

            {/* Table */}
            <ContentCard noPadding>
              <ContentCardHeader>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-normal text-foreground">
                    Outbox
                  </h3>
                  {!exportsLoading && (
                    <Badge variant="secondary" className="text-xs">
                      {filteredExports.length}
                    </Badge>
                  )}
                </div>
              </ContentCardHeader>

              {exportsLoading ? (
                <div className="p-6 space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-11 w-full rounded-lg" />
                  ))}
                </div>
              ) : filteredExports.length === 0 ? (
                <div className="text-center py-20">
                  <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                    <FolderOpen className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-normal text-foreground">
                    Outbox is empty
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {hasFileFilters
                      ? "Try adjusting your filters"
                      : "No payment files have been generated yet"}
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                    <div className="col-span-2">Date</div>
                    <div className="col-span-3">Filename</div>
                    <div className="col-span-1">Account</div>
                    <div className="col-span-1 text-center">Payments</div>
                    <div className="col-span-1 text-right">Ccy</div>
                    <div className="col-span-2 text-right">Amount</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1"></div>
                  </div>
                  <div className="divide-y divide-border max-h-[calc(100vh-350px)] overflow-y-auto">
                    {filteredExports.map((e) => (
                      <div
                        key={e.id}
                        className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                      >
                        <div className="col-span-2 text-muted-foreground tabular-nums">
                          {format(new Date(e.created_at), "dd MMM yyyy")}
                          <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                            {format(new Date(e.created_at), "HH:mm")}
                          </p>
                        </div>
                        <div className="col-span-3 min-w-0">
                          <p className="text-foreground truncate">
                            {e.file_name || "—"}
                          </p>
                          <p className="text-[12px] text-muted-foreground mt-0.5">
                            {e.file_size
                              ? `${(e.file_size / 1024).toFixed(1)} KB`
                              : "—"}
                          </p>
                        </div>
                        <div className="col-span-1 min-w-0">
                          <p className="text-[12px] text-muted-foreground truncate">
                            {e.bank_account?.account_name || "—"}
                          </p>
                        </div>
                        <div className="col-span-1 text-center">
                          <span className="tabular-nums text-foreground">
                            {e.payment_count}
                          </span>
                        </div>
                        <div className="col-span-1 text-right text-[11px] uppercase tracking-[0.04em] text-muted-foreground">
                          {e.currency}
                        </div>
                        <div className="col-span-2 text-right">
                          <span className="tabular-nums text-foreground">
                            {parseFloat(e.total_amount).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 2,
                            })}
                          </span>
                        </div>
                        <div className="col-span-1">
                          <span
                            className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-normal border ${
                              FILE_STATUS_STYLES[e.status] ||
                              "bg-muted text-muted-foreground border-border"
                            }`}
                          >
                            {FILE_STATUS_LABELS[e.status] || e.status}
                          </span>
                        </div>
                        {hasBankingExport && (
                          <div className="col-span-1 flex justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                handleDownload(e.id, e.file_name || "export.xml")
                              }
                            >
                              <Download className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </ContentCard>
          </div>
        )}
      </div>
    </div>
  );
}
