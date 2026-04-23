"use client";

import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2 } from "lucide-react";
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
    <div className="min-h-screen bg-muted">
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-semibold text-foreground">Provider Accounts</h1>
            <Select
              value={selectedOrganizationId || undefined}
              onValueChange={setSelectedOrganizationId}
              disabled={orgsLoading || !organizations?.length}
            >
              <SelectTrigger className="w-[200px] h-9 bg-muted border-border">
                <Building2 className="h-4 w-4 text-muted-foreground/60 mr-2" />
                <SelectValue placeholder="Select organization" />
              </SelectTrigger>
              <SelectContent>
                {organizations?.map((org: any) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ProviderAccountsList organizationId={selectedOrganizationId || undefined} />
        </div>
      </div>
    </div>
  );
}
