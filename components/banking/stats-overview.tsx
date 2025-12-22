"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Database, 
  Clock, 
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { useImportStats } from "@/hooks/use-banking";

interface StatsOverviewProps {
  dateFrom?: string;
  dateTo?: string;
  organizationId?: string;
}

export function StatsOverview({ dateFrom, dateTo, organizationId }: StatsOverviewProps) {
  const { data: stats, isLoading, error } = useImportStats({
    date_from: dateFrom,
    date_to: dateTo,
    organizationId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-8 text-red-500">
        <XCircle className="h-8 w-8 mx-auto mb-2" />
        <p className="text-sm">Failed to load statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Imports",
      value: stats.total_imports,
      icon: Database,
      gradient: "from-[#638C80] to-[#547568]",
    },
    {
      title: "Total Transactions",
      value: stats.total_transactions,
      icon: TrendingUp,
      gradient: "from-purple-400 to-purple-500",
    },
    {
      title: "Synced",
      value: stats.synced_transactions,
      icon: CheckCircle,
      gradient: "from-green-400 to-green-500",
      subtitle: `${stats.sync_percentage.toFixed(1)}%`,
    },
    {
      title: "Pending",
      value: stats.pending_transactions,
      icon: Clock,
      gradient: "from-amber-400 to-amber-500",
    },
    {
      title: "Failed",
      value: stats.failed_transactions,
      icon: XCircle,
      gradient: "from-red-400 to-red-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Main Stats with vibrant gradients */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer`}
          >
            <div className="absolute top-0 right-0 -mt-4 -mr-4 h-24 w-24 rounded-full bg-white/10"></div>
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <stat.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              <div className="text-white/80 text-sm font-medium mb-1">{stat.title}</div>
              <div className="text-4xl font-bold text-white">{stat.value.toLocaleString()}</div>
              {stat.subtitle && (
                <p className="text-xs text-white/70 mt-2">
                  {stat.subtitle} completion rate
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* By Provider Stats */}
      {stats.by_provider && stats.by_provider.length > 0 && (
        <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-xl font-semibold text-gray-900">By Bank Provider</CardTitle>
          </div>
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.by_provider.map((provider) => (
                <div
                  key={provider.bank_provider__code}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:border-[#638C80]/30 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-gray-900">{provider.bank_provider__name}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {provider.bank_provider__code}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {provider.count} {provider.count === 1 ? 'import' : 'imports'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {provider.total_txs.toLocaleString()} transactions
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Imports */}
      {stats.recent_imports && stats.recent_imports.length > 0 && (
        <Card className="border border-gray-100 shadow-lg rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
            <CardTitle className="text-xl font-semibold text-gray-900">Recent Imports</CardTitle>
          </div>
          <CardContent className="p-6">
            <div className="space-y-3">
              {stats.recent_imports.slice(0, 5).map((imp) => (
                <div
                  key={imp.id}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white border border-gray-100 rounded-xl hover:border-[#638C80]/30 hover:shadow-md transition-all"
                >
                  <div>
                    <p className="font-semibold text-sm text-gray-900">{imp.original_filename}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(imp.imported_at).toLocaleDateString()} •{" "}
                      {imp.bank_provider.name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">
                      {imp.transactions_synced}/{imp.transactions_count}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">synced</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
