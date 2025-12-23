"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatsOverview } from "@/components/banking/stats-overview";
import { SFTPExport } from "@/components/banking/sftp-export";
import { ExportTransactionList } from "@/components/banking/export-transaction-list";
import { useOrganizations } from "@/hooks/use-organization";
import { Building2, ArrowUpFromLine } from "lucide-react";

export default function BankingExportPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [selectedExportId, setSelectedExportId] = useState<number | undefined>();

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  // Extract organizations from paginated response
  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  // Set default organization on mount
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const handleExportComplete = () => {
    // Refresh stats
    setActiveTab("overview");
  };

  const handleSelectExport = (exportId: number) => {
    setSelectedExportId(exportId);
    setActiveTab("transactions");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-[#638C80]/5">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#638C80] via-[#547568] to-[#456050] p-8 shadow-xl">
            <div className="absolute inset-0 bg-black opacity-5"></div>
            <div className="relative flex items-center justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <ArrowUpFromLine className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-4xl font-bold tracking-tight text-white">Export</h1>
                </div>
                <p className="text-white/90 text-lg mt-3 ml-16">
                  Upload payment files to bank SFTP servers.
                </p>
              </div>

              {/* Organization Selector */}
              <Select
                value={selectedOrganizationId || undefined}
                onValueChange={setSelectedOrganizationId}
                disabled={orgsLoading || !organizations?.length}
              >
                <SelectTrigger className="w-[280px] bg-white/95 backdrop-blur-sm border-white/20 text-gray-900">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#638C80]" />
                    <SelectValue placeholder="Select organization..." />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {organizations?.map((org: any) => (
                    <SelectItem key={org.id} value={org.id}>
                      <div className="flex items-center gap-2">
                        <span>{org.name}</span>
                        {org.external_id?.startsWith('xero_') && (
                          <span className="text-[10px] bg-[#49a034]/10 text-[#49a034] px-1.5 py-0.5 rounded">
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

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-2">
              <TabsList className="bg-gray-50 p-1 rounded-xl w-full grid grid-cols-3 gap-1">
                {[
                  { value: "overview", label: "Overview" },
                  { value: "sftp-export", label: "SFTP Export" },
                  { value: "transactions", label: "Transactions" },
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-600 data-[state=active]:bg-white data-[state=active]:text-[#638C80] data-[state=active]:shadow-sm data-[state=active]:border data-[state=active]:border-gray-200 transition-all hover:text-[#638C80]"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            <TabsContent value="overview" className="space-y-6">
              <StatsOverview
                organizationId={selectedOrganizationId || undefined}
                mode="export"
              />
            </TabsContent>

            <TabsContent value="sftp-export">
              <SFTPExport
                organizationId={selectedOrganizationId || undefined}
                onExportComplete={handleExportComplete}
                onSelectExport={handleSelectExport}
                selectedExportId={selectedExportId}
              />
            </TabsContent>

            <TabsContent value="transactions">
              <ExportTransactionList
                exportId={selectedExportId}
                organizationId={selectedOrganizationId || undefined}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
