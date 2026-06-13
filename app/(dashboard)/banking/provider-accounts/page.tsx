"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useOrganizations } from "@/hooks/use-organization";
import { ProviderAccountsList } from "@/components/banking/provider-accounts-list";

export default function ProviderAccountsPage() {
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

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Provider Accounts"
        subtitle="Payment-provider accounts used to disburse funds"
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Provider Accounts" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <div className="px-6 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ProviderAccountsList organizationId={selectedOrganizationId || undefined} />
        </div>
      </div>
    </div>
  );
}
