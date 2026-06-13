"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { useOrganizations } from "@/hooks/use-organization";
import { ApprovalWorkflowsList } from "@/components/banking/approval-workflows-list";

export default function ApprovalsPage() {
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
        title="Approvals"
        subtitle="Maker-checker + segregation of duties for bill payments."
        breadcrumbs={[
          { label: "Banking", href: "/banking" },
          { label: "Approvals" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      />

      <div className="px-6 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ApprovalWorkflowsList organizationId={selectedOrganizationId || undefined} />
        </div>
        <p className="text-xs text-muted-foreground mt-3 px-1">
          Workflows match on amount range + priority. The highest-priority matching
          workflow applies. Without any workflow, bill payments default to: 1 approver,
          no self-approval.
        </p>
      </div>
    </div>
  );
}
