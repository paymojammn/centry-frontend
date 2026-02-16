"use client";

import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  TrendingUp 
} from "lucide-react";
import { api } from "@/lib/api";

interface ReconciliationSummary {
  total_unmatched: number;
  total_matched: number;
  total_posted: number;
  total_transactions: number;
  by_source: {
    [key: string]: {
      unmatched: number;
      matched: number;
      posted: number;
      total: number;
    };
  };
}

export function ReconciliationStats() {
  const { data: summary, isLoading } = useQuery<ReconciliationSummary>({
    queryKey: ["reconciliation-summary"],
    queryFn: async () => {
      const response = await api.get<ReconciliationSummary>("/api/v1/banking/transactions/reconciliation-summary/");
      return response;
    },
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 animate-pulse">
            <div className="h-4 bg-muted rounded w-24 mb-3"></div>
            <div className="h-8 bg-muted rounded w-16"></div>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      label: "Unmatched",
      value: summary?.total_unmatched || 0,
      icon: AlertCircle,
      color: "text-[#D4944A]",
      bgColor: "bg-[#D4944A]/10",
      description: "Need reconciliation",
    },
    {
      label: "Matched",
      value: summary?.total_matched || 0,
      icon: CheckCircle2,
      color: "text-primary",
      bgColor: "bg-primary/5",
      description: "Ready to sync",
    },
    {
      label: "Posted",
      value: summary?.total_posted || 0,
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10",
      description: "Synced to ERP",
    },
    {
      label: "Total",
      value: summary?.total_transactions || 0,
      icon: Clock,
      color: "text-[#6B8FB8]",
      bgColor: "bg-[#6B8FB8]/10",
      description: "All transactions",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <Card
            key={stat.label}
            className="p-6 border-border shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <Icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
            <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </Card>
        );
      })}
    </div>
  );
}
