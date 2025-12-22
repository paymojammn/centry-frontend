/**
 * Organizations List Page
 * Displays all organizations the user has access to
 */

'use client';

import { useState } from 'react';
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
} from 'lucide-react';

export default function OrganizationsPage() {
  const { data, isLoading, error } = useOrganizations();
  const [searchQuery, setSearchQuery] = useState('');

  // Handle both response formats: Array directly or PaginatedResponse
  const organizations = Array.isArray(data) ? data : (data?.results || []);
  const filteredOrganizations = organizations.filter((org) =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (error) {
    return (
      <div className="container py-8">
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Building2 className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">Error Loading Organizations</h3>
            <p className="text-gray-600 text-center">
              {(error as Error).message || 'Failed to load organizations'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-black">Organizations</h1>
          <p className="text-gray-600">
            Manage your organizations and team access
          </p>
        </div>
        <button className="bg-[#638C80] hover:bg-[#4f7068] text-white px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Organization
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            placeholder="Search organizations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-[#638C80] bg-white text-black shadow-sm"
          />
        </div>
      </div>

      {/* Organizations Grid */}
      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <OrganizationCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredOrganizations.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredOrganizations.map((org) => (
            <OrganizationCard key={org.id} organization={org} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-gray-100 rounded-lg shadow-sm">
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <Building2 className="h-12 w-12 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">
              {searchQuery ? 'No Organizations Found' : 'No Organizations Yet'}
            </h3>
            <p className="text-gray-600 text-center mb-4">
              {searchQuery
                ? 'Try adjusting your search query'
                : 'You are not a member of any organizations yet. Create one or ask to be invited.'}
            </p>
            {!searchQuery && (
              <div className="flex flex-col items-center gap-3">
                <button className="bg-[#638C80] hover:bg-[#4f7068] text-white px-6 py-2.5 rounded-lg shadow-sm hover:shadow transition-all flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </button>
                <p className="text-xs text-gray-500">
                  Total organizations: {Array.isArray(data) ? data.length : (data?.count || 0)}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Organization Card Component
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
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-all duration-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-[#638C80]/10 flex items-center justify-center">
              <Building2 className="h-6 w-6 text-[#638C80]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-black">{organization.name}</h3>
              <p className="text-sm text-gray-500">@{organization.slug}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-[#638C80]" />
            <span className="text-gray-600">
              {organization.members_count || 0} members
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-[#638C80]" />
            <span className="text-gray-600">
              {organization.connections_count || 0} connections
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Currency</span>
            <span className="px-2.5 py-0.5 bg-gray-50 border border-gray-200 rounded text-xs font-medium text-black">
              {organization.primary_currency}
            </span>
          </div>
          {organization.industry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Industry</span>
              <span className="font-medium text-black">{organization.industry}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-500 pt-2 border-t border-gray-50">
            <Calendar className="h-3 w-3" />
            <span>Created {new Date(organization.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/organizations/${organization.id}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-[#638C80] rounded-lg text-black hover:text-[#638C80] font-medium transition-all shadow-sm hover:shadow">
              View Details
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// Skeleton Component
function OrganizationCardSkeleton() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg shadow-sm animate-pulse">
      {/* Header */}
      <div className="p-6 border-b border-gray-50">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-gray-100" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-100 rounded" />
            <div className="h-4 w-24 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
      {/* Content */}
      <div className="p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="h-4 w-20 bg-gray-100 rounded" />
          <div className="h-4 w-20 bg-gray-100 rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-100 rounded" />
          <div className="h-4 w-full bg-gray-100 rounded" />
        </div>
        <div className="h-10 w-full bg-gray-100 rounded" />
      </div>
    </div>
  );
}
