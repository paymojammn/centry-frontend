/**
 * Organization Stats Widget
 * Compact widget for displaying organization statistics
 * Can be used in dashboards or overview pages
 */

'use client';

import { useOrganizations, useOrganizationStats } from '@/hooks/use-organization';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Building2, Users, Globe, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface OrganizationStatsWidgetProps {
  organizationId?: string;
  showActions?: boolean;
}

export function OrganizationStatsWidget({
  organizationId,
  showActions = true,
}: OrganizationStatsWidgetProps) {
  const { data: orgsData, isLoading: orgsLoading } = useOrganizations();
  const defaultOrgId = organizationId || orgsData?.results?.[0]?.id;
  
  const { data: stats, isLoading: statsLoading } = useOrganizationStats(
    defaultOrgId || ''
  );

  const organization = orgsData?.results?.find((org) => org.id === defaultOrgId);

  if (orgsLoading || statsLoading) {
    return <OrganizationStatsWidgetSkeleton />;
  }

  if (!organization || !stats) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-base font-inter">{organization.name}</CardTitle>
              <CardDescription className="text-xs">Organization Overview</CardDescription>
            </div>
          </div>
          {showActions && (
            <Link href={`/layout-1/organizations/${organization.id}`}>
              <Button variant="ghost" size="sm">
                View Details
              </Button>
            </Link>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <StatItem
            icon={<Users className="h-4 w-4" />}
            label="Members"
            value={stats.total_members}
          />
          <StatItem
            icon={<Globe className="h-4 w-4" />}
            label="Connections"
            value={stats.total_connections}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Imports"
            value={stats.total_bank_imports}
          />
          <StatItem
            icon={<TrendingUp className="h-4 w-4" />}
            label="Transactions"
            value={stats.total_transactions}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function StatItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold font-inter">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function OrganizationStatsWidgetSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <div className="space-y-1">
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default OrganizationStatsWidget;
