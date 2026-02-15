"use client";

import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsOverview } from "@/components/banking/stats-overview";
import { SFTPExport } from "@/components/banking/sftp-export";
import { ExportTransactionList } from "@/components/banking/export-transaction-list";
import { Pain002Status } from "@/components/banking/pain002-status";
import { useOrganizations } from "@/hooks/use-organization";
import { Building2, BarChart3, Upload, FileText, FileCheck } from "lucide-react";

export default function BankingExportPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<number | undefined>();

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

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
    setActiveTab("transactions");
  };

  const tabs = [
    { value: "overview", label: "Overview", icon: BarChart3 },
    { value: "sftp-export", label: "SFTP Export", icon: Upload },
    { value: "bank-status", label: "Bank Status", icon: FileCheck },
    { value: "transactions", label: "Payments", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-semibold text-foreground">Export</h1>
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
                        {org.external_id?.startsWith('xero_') && (
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
      </div>

      {/* Tabs */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.value}
                  onClick={() => setActiveTab(tab.value)}
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
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
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === "overview" && (
          <StatsOverview
            organizationId={selectedOrganizationId || undefined}
            mode="export"
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
        {activeTab === "bank-status" && (
          <Pain002Status
            organizationId={selectedOrganizationId || undefined}
            onSelectExport={handleSelectExport}
            selectedExportId={selectedExportId}
          />
        )}
        {activeTab === "transactions" && (
          <ExportTransactionList
            exportId={selectedExportId}
            organizationId={selectedOrganizationId || undefined}
          />
        )}
      </div>
    </div>
  );
}
