/**
 * Banking Import Page
 *
 * Uses the consistent Centry design system with enhanced UI components.
 */

'use client';

import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/banking/file-upload';
import { ImportHistory } from '@/components/banking/import-history';
import { StatsOverview } from '@/components/banking/stats-overview';
import { TransactionList } from '@/components/banking/transaction-list';
import { SFTPImport } from '@/components/banking/sftp-import';
import { useOrganizations } from '@/hooks/use-organization';
import { BarChart3, Upload, Server, FileText, List } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { LoadingState } from '@/components/layout/loading-state';

export default function BankingPage() {
  const [selectedImportId, setSelectedImportId] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();

  const organizations = Array.isArray(organizationsResponse)
    ? organizationsResponse
    : (organizationsResponse as any)?.results || [];

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const handleUploadComplete = () => {
    setActiveTab('imports');
  };

  const handleSelectImport = (importId: number) => {
    setSelectedImportId(importId);
    setActiveTab('transactions');
  };

  if (orgsLoading) {
    return <LoadingState fullPage />;
  }

  const tabs = [
    { value: 'overview', label: 'Overview', icon: BarChart3 },
    { value: 'upload', label: 'Upload', icon: Upload },
    { value: 'sftp-import', label: 'SFTP', icon: Server },
    { value: 'imports', label: 'Imports', icon: FileText },
    { value: 'transactions', label: 'Transactions', icon: List },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Import"
        subtitle="Import and manage bank statements"
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

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
                  className={`flex items-center gap-2 py-3 px-4 text-sm font-medium border-b-2 transition-colors btn-press ${
                    activeTab === tab.value
                      ? 'border-primary text-primary'
                      : 'border-transparent text-muted-foreground hover:text-foreground'
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

      <PageContainer>
        <div className="animate-fade-in-up">
          {activeTab === 'overview' && (
            <StatsOverview organizationId={selectedOrganizationId || undefined} />
          )}
          {activeTab === 'upload' && (
            <FileUpload
              onUploadComplete={handleUploadComplete}
              organizationId={selectedOrganizationId || undefined}
            />
          )}
          {activeTab === 'sftp-import' && (
            <SFTPImport
              organizationId={selectedOrganizationId || undefined}
              onImportComplete={handleUploadComplete}
            />
          )}
          {activeTab === 'imports' && (
            <ImportHistory
              onSelectImport={handleSelectImport}
              selectedImportId={selectedImportId}
              organizationId={selectedOrganizationId || undefined}
            />
          )}
          {activeTab === 'transactions' && (
            <TransactionList
              fileImportId={selectedImportId}
              organizationId={selectedOrganizationId || undefined}
            />
          )}
        </div>
      </PageContainer>
    </div>
  );
}
