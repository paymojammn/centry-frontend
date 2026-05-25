"use client";

import { Wallet } from "lucide-react";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import type { PipelineProviderAccount } from "@/types/reports";

interface Props {
  accounts: PipelineProviderAccount[];
  formatCurrency: (value: number) => string;
}

function formatRelative(ts: string | null): string {
  if (!ts) return "never";
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "—";
  const diffMs = Date.now() - date.getTime();
  const mins = Math.round(diffMs / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  return `${days}d ago`;
}

export function ProviderAccountsCard({ accounts, formatCurrency }: Props) {
  return (
    <ContentCard noPadding>
      <ContentCardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">
            Provider Accounts
          </h3>
        </div>
      </ContentCardHeader>
      <ContentCardBody>
        {accounts.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
            No provider accounts configured
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-professional">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Account</th>
                  <th className="py-2 font-medium">Env</th>
                  <th className="py-2 font-medium text-right">Balance</th>
                  <th className="py-2 font-medium text-right">Synced</th>
                  <th className="py-2 font-medium text-right">Period</th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => {
                  const balance = parseFloat(a.balance);
                  const periodAmount = parseFloat(a.period_completed_amount);
                  return (
                    <tr
                      key={a.account_id}
                      className="border-b border-border/40 last:border-0"
                    >
                      <td className="py-2.5">
                        <div className="font-medium text-foreground flex items-center gap-2">
                          {a.account_name}
                          {!a.is_active && (
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground border border-border rounded px-1">
                              inactive
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.provider}
                        </div>
                      </td>
                      <td className="py-2.5 text-xs text-muted-foreground uppercase">
                        {a.environment}
                      </td>
                      <td className="py-2.5 text-right tabular-nums text-foreground">
                        {a.currency || ""} {formatCurrency(balance)}
                      </td>
                      <td className="py-2.5 text-right text-xs text-muted-foreground">
                        {formatRelative(a.balance_synced_at)}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">
                        <div className="text-foreground">
                          {formatCurrency(periodAmount)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {a.period_completed_count} done
                          {a.period_inflight_count > 0
                            ? ` · ${a.period_inflight_count} in flight`
                            : ""}
                          {a.period_failed_count > 0
                            ? ` · ${a.period_failed_count} failed`
                            : ""}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </ContentCardBody>
    </ContentCard>
  );
}
