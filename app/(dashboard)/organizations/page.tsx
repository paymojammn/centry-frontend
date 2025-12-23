/**
 * Organizations List Page
 * Displays all organizations the user has access to
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
  TrendingUp,
  Briefcase,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          <div className="bg-white rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#f77f00]/10 flex items-center justify-center mx-auto mb-4">
              <Building2 className="h-8 w-8 text-[#f77f00]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Organizations</h3>
            <p className="text-gray-500">
              {(error as Error).message || 'Failed to load organizations'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-gray-50 to-zinc-100">
      <div className="container mx-auto py-6 px-4 max-w-7xl">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-lg shadow-[#638C80]/20">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
                <p className="text-sm text-gray-500">
                  Manage your organizations and team access
                </p>
              </div>
            </div>
            <button className="bg-gradient-to-r from-[#638C80] to-[#4a6b62] hover:from-[#5a8073] hover:to-[#436259] text-white px-6 py-2.5 rounded-xl shadow-md shadow-[#638C80]/20 hover:shadow-lg transition-all flex items-center gap-2 font-medium">
              <Plus className="h-4 w-4" />
              Create Organization
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Organizations - Hero Card */}
            <div className="md:col-span-2 bg-gradient-to-br from-[#638C80] via-[#5a8073] to-[#4a6b62] rounded-2xl p-6 text-white shadow-xl shadow-[#638C80]/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-white/80 text-sm font-medium">Total Organizations</span>
                  </div>
                  <div className="flex items-center gap-1 text-[#49a034] text-xs font-medium bg-[#49a034]/20 px-2 py-1 rounded-full">
                    <TrendingUp className="h-3 w-3" />
                    Active
                  </div>
                </div>
                <div className="text-4xl font-bold tracking-tight">
                  {stats.total}
                </div>
                <p className="text-white/60 text-sm mt-2">
                  {stats.totalMembers} team members across all organizations
                </p>
              </div>
            </div>

            {/* Total Members */}
            <StatCard
              icon={Users}
              label="Total Members"
              value={stats.totalMembers.toString()}
              color="blue"
              subtitle="Active team members"
            />

            {/* Total Connections */}
            <StatCard
              icon={Globe}
              label="Connections"
              value={stats.totalConnections.toString()}
              color="green"
              subtitle="ERP integrations"
            />
          </div>

          {/* Search Bar */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-gray-200/50 shadow-sm p-4">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-[#638C80] bg-white text-gray-900 shadow-sm"
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
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/50 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-gray-300" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery ? 'No Organizations Found' : 'No Organizations Yet'}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {searchQuery
                  ? 'Try adjusting your search query'
                  : 'You are not a member of any organizations yet. Create one or ask to be invited.'}
              </p>
              {!searchQuery && (
                <button className="bg-gradient-to-r from-[#638C80] to-[#4a6b62] hover:from-[#5a8073] hover:to-[#436259] text-white px-6 py-2.5 rounded-xl shadow-md shadow-[#638C80]/20 hover:shadow-lg transition-all flex items-center gap-2 mx-auto font-medium">
                  <Plus className="h-4 w-4" />
                  Create Organization
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Stat Card Component - Using Centry colors
interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  color: 'teal' | 'blue' | 'green' | 'orange' | 'mustard';
  subtitle?: string;
}

function StatCard({ icon: Icon, label, value, color, subtitle }: StatCardProps) {
  const colorStyles = {
    teal: {
      bg: 'bg-gradient-to-br from-[#638C80]/10 to-[#638C80]/5',
      icon: 'bg-gradient-to-br from-[#638C80] to-[#4a6b62] shadow-[#638C80]/30',
      text: 'text-[#638C80]',
      border: 'border-[#638C80]/20',
    },
    blue: {
      bg: 'bg-gradient-to-br from-[#4E97D1]/10 to-[#4E97D1]/5',
      icon: 'bg-gradient-to-br from-[#4E97D1] to-[#3d7ab0] shadow-[#4E97D1]/30',
      text: 'text-[#4E97D1]',
      border: 'border-[#4E97D1]/20',
    },
    green: {
      bg: 'bg-gradient-to-br from-[#49a034]/10 to-[#49a034]/5',
      icon: 'bg-gradient-to-br from-[#49a034] to-[#3a8029] shadow-[#49a034]/30',
      text: 'text-[#49a034]',
      border: 'border-[#49a034]/20',
    },
    orange: {
      bg: 'bg-gradient-to-br from-[#f77f00]/10 to-[#f77f00]/5',
      icon: 'bg-gradient-to-br from-[#f77f00] to-[#d66d00] shadow-[#f77f00]/30',
      text: 'text-[#f77f00]',
      border: 'border-[#f77f00]/20',
    },
    mustard: {
      bg: 'bg-gradient-to-br from-[#fed652]/10 to-[#fed652]/5',
      icon: 'bg-gradient-to-br from-[#fed652] to-[#e6c149] shadow-[#fed652]/30',
      text: 'text-[#d4a843]',
      border: 'border-[#fed652]/20',
    },
  };

  const style = colorStyles[color];

  return (
    <div className={`${style.bg} rounded-2xl p-5 border ${style.border} shadow-sm`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl ${style.icon} shadow-lg flex items-center justify-center`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        <span className="text-gray-600 text-sm font-medium">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${style.text}`}>{value}</div>
      {subtitle && (
        <p className="text-gray-400 text-xs mt-1">{subtitle}</p>
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
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm hover:shadow-lg transition-all duration-200 group overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#638C80] to-[#4a6b62] flex items-center justify-center shadow-md shadow-[#638C80]/20">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#638C80] transition-colors">{organization.name}</h3>
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
            <div className="w-7 h-7 rounded-lg bg-[#4E97D1]/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 text-[#4E97D1]" />
            </div>
            <span className="text-gray-600">
              {organization.members_count || 0} members
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-7 h-7 rounded-lg bg-[#49a034]/10 flex items-center justify-center">
              <Globe className="h-3.5 w-3.5 text-[#49a034]" />
            </div>
            <span className="text-gray-600">
              {organization.connections_count || 0} connections
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Currency</span>
            <span className="px-2.5 py-0.5 bg-[#fed652]/20 border border-[#fed652]/30 rounded-lg text-xs font-semibold text-[#d4a843]">
              {organization.primary_currency}
            </span>
          </div>
          {organization.industry && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Industry</span>
              <span className="font-medium text-gray-700">{organization.industry}</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400 pt-2 border-t border-gray-100">
            <Calendar className="h-3 w-3" />
            <span>Created {new Date(organization.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2">
          <Link href={`/organizations/${organization.id}`} className="flex-1">
            <button className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 hover:border-[#638C80] rounded-xl text-gray-700 hover:text-[#638C80] font-medium transition-all shadow-sm hover:shadow group-hover:border-[#638C80]/50">
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
    <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl shadow-sm animate-pulse overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-gray-200" />
          <div className="space-y-2">
            <div className="h-5 w-32 bg-gray-200 rounded" />
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
        <div className="h-10 w-full bg-gray-100 rounded-xl" />
      </div>
    </div>
  );
}
