"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { BankingExportOverview } from "@/components/banking/banking-export-overview";
import { SFTPExport } from "@/components/banking/sftp-export";
import { Pain002Inbox } from "@/components/banking/pain002-inbox";
import { Pain002Status } from "@/components/banking/pain002-status";
import { BankStatements } from "@/components/banking/bank-statements";
import { ExportTransactionList } from "@/components/banking/export-transaction-list";
import { useOrganizations } from "@/hooks/use-organization";
import { useHasPermission } from "@/hooks/use-user";

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

  // Deep-link: ?tab=<tab> opens a tab, ?status=<pill> pre-selects the Files
  // tab's status filter (used by the dashboard "Bank Files" card).
  const searchParams = useSearchParams();
  const [payInitialStatus, setPayInitialStatus] = useState<string | undefined>();
  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) setActiveTab(tab === "sftp-export" ? "files" : tab);
    const status = searchParams.get("status");
    if (status) setPayInitialStatus(status);
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleExportComplete = () => {
    setActiveTab("overview");
  };

  const handleSelectExport = (exportId: number) => {
    setSelectedExportId(exportId);
  };

  const hasBankingExport = useHasPermission("banking.export");

  const tabs = useMemo(() => {
    const allTabs = [
      { value: "overview", label: "Overview" },
      { value: "files", label: "Files" },
      { value: "inbox", label: "Inbox", requiresExport: true },
      { value: "statements", label: "Statements" },
      { value: "bank-status", label: "Reconciliation", requiresExport: true },
    ];
    return allTabs.filter((t) => !t.requiresExport || hasBankingExport);
  }, [hasBankingExport]);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Dashboard"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`py-3 px-4 text-sm font-normal border-b-2 transition-colors ${
                  activeTab === tab.value
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
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
        {activeTab === "files" && (
          <div className="space-y-6">
            <SFTPExport
              organizationId={selectedOrganizationId || undefined}
              onExportComplete={handleExportComplete}
              onSelectExport={handleSelectExport}
              selectedExportId={selectedExportId}
              initialStatus={payInitialStatus}
              canUpload={hasBankingExport}
            />
            {selectedExportId && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSelectedExportId(undefined)}
                  >
                    Close details
                  </Button>
                </div>
                <ExportTransactionList
                  exportId={selectedExportId}
                  organizationId={selectedOrganizationId || undefined}
                />
              </div>
            )}
          </div>
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
      </div>
    </div>
  );
}
