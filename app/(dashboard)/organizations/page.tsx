/**
 * Organizations List Page
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useOrganizations } from '@/hooks/use-organization';
import {
  Building2,
  Plus,
  Search,
  Users,
  Globe,
  ArrowRight,
  Calendar,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function OrganizationsPage() {
  const { data, isLoading, error } = useOrganizations();
  const [searchQuery, setSearchQuery] = useState('');

  // Handle both response formats: Array directly or PaginatedResponse
  const organizations = Array.isArray(data) ? data : (data?.results || []);
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const stats = useMemo(() => {
    return {
      total: organizations.length,
      totalMembers: organizations.reduce((sum, org) => sum + (org.members_count || 0), 0),
      totalConnections: organizations.reduce((sum, org) => sum + (org.connections_count || 0), 0),
    };
  }, [organizations]);

  if (error) {
    return (
      <div className="min-h-screen bg-muted">
        <div className="bg-card border-b border-border sticky top-0 z-10">
          <div className="px-6 py-4">
            <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
          </div>
        </div>
        <div className="px-6 py-6">
          <div className="bg-card rounded-lg border border-border text-center py-12">
            <Building2 className="h-8 w-8 text-[#D4944A] mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Error Loading Organizations</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {(error as Error).message || 'Failed to load organizations'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      {/* Header */}
      <div className="bg-card/95 backdrop-blur-sm border-b border-border/80 shadow-sm sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-foreground">Organizations</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage your organizations and teams</p>
            </div>
            <Button size="sm" className="h-9 bg-primary hover:bg-primary/90 btn-press">
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-card border-b border-border">
        <div className="px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Organizations:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-primary/10 text-primary">
                {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Members:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#6B8FB8]/10 text-[#6B8FB8]">
                {stats.totalMembers}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-sm">Connections:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-primary/5 text-primary">
                {stats.totalConnections}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-6 py-6">
        <div className="space-y-4 animate-fade-in-up">
          {/* Search */}
          <div className="bg-card rounded-xl border border-border/80 shadow-sm px-4 py-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-muted border-border"
              />
            </div>
          </div>

          {/* Organizations Grid */}
          {isLoading ? (
            <div className="bg-card rounded-xl border border-border/80 shadow-sm">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            </div>
          ) : filteredOrganizations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 animate-stagger">
              {filteredOrganizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          ) : (
            <div className="bg-card rounded-xl border border-border/80 shadow-sm text-center py-12">
              <div className="p-3 bg-muted rounded-xl w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                <Building2 className="h-7 w-7 text-muted-foreground/60" />
              </div>
              <p className="text-sm font-medium text-foreground">
                {searchQuery ? 'No Organizations Found' : 'No Organizations Yet'}
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create one or ask to be invited'}
              </p>
              {!searchQuery && (
                <Button size="sm" className="mt-4 bg-primary hover:bg-primary/90 btn-press">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Organization
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface OrganizationCardProps {
  organization: {
    id: string;
    name: string;
    slug: string;
    members_count?: number;
    connections_count?: number;
    primary_currency: string;
    industry?: string;
    created_at: string;
  };
}

function OrganizationCard({ organization }: OrganizationCardProps) {
  return (
    <div className="bg-card border border-border/80 rounded-xl shadow-sm transition-all hover:border-primary/30 hover:shadow-md hover:shadow-primary/5">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{organization.name}</h3>
            <p className="text-xs text-muted-foreground">@{organization.slug}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-muted-foreground/60" />
            {organization.members_count || 0} members
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Globe className="h-3.5 w-3.5 text-muted-foreground/60" />
            {organization.connections_count || 0} connections
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Currency</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-[#D4B35A]/10 text-[#D4B35A]">
            {organization.primary_currency}
          </span>
        </div>

        {organization.industry && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Industry</span>
            <span className="text-foreground">{organization.industry}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-muted-foreground/60 pt-2 border-t border-border">
          <Calendar className="h-3 w-3" />
          Created {new Date(organization.created_at).toLocaleDateString()}
        </div>

        {/* Action */}
        <Button variant="outline" size="sm" className="w-full h-8 btn-press" asChild>
          <Link href={`/organizations/${organization.id}`}>
            View Details
            <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
