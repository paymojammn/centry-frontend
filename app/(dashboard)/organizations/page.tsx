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
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
            <Building2 className="h-8 w-8 text-orange-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600">Error Loading Organizations</p>
            <p className="text-xs text-gray-400 mt-1">
              {(error as Error).message || 'Failed to load organizations'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-900">Organizations</h1>
            <Button size="sm" className="h-9 bg-[#638C80] hover:bg-[#547568]">
              <Plus className="h-4 w-4 mr-2" />
              Create Organization
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <div className="flex items-center gap-8 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Organizations:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-[#638C80]/10 text-[#638C80]">
                {stats.total}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Members:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-blue-50 text-blue-700">
                {stats.totalMembers}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-500 text-sm">Connections:</span>
              <span className="px-2 py-0.5 rounded text-sm font-medium bg-green-50 text-green-700">
                {stats.totalConnections}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 bg-gray-50 border-gray-200"
              />
            </div>
          </div>

          {/* Organizations Grid */}
          {isLoading ? (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              </div>
            </div>
          ) : filteredOrganizations.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredOrganizations.map((org) => (
                <OrganizationCard key={org.id} organization={org} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 text-center py-12">
              <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                {searchQuery ? 'No Organizations Found' : 'No Organizations Yet'}
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'Create one or ask to be invited'}
              </p>
              {!searchQuery && (
                <Button size="sm" className="mt-4 bg-[#638C80] hover:bg-[#547568]">
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
    <div className="bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gray-100 flex items-center justify-center">
            <Building2 className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-900">{organization.name}</h3>
            <p className="text-xs text-gray-500">@{organization.slug}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Stats */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users className="h-3.5 w-3.5 text-gray-400" />
            {organization.members_count || 0} members
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Globe className="h-3.5 w-3.5 text-gray-400" />
            {organization.connections_count || 0} connections
          </div>
        </div>

        {/* Info */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Currency</span>
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
            {organization.primary_currency}
          </span>
        </div>

        {organization.industry && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Industry</span>
            <span className="text-gray-700">{organization.industry}</span>
          </div>
        )}

        <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
          <Calendar className="h-3 w-3" />
          Created {new Date(organization.created_at).toLocaleDateString()}
        </div>

        {/* Action */}
        <Button variant="outline" size="sm" className="w-full h-8" asChild>
          <Link href={`/organizations/${organization.id}`}>
            View Details
            <ArrowRight className="h-3.5 w-3.5 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
