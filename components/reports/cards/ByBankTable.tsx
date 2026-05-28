"use client";

import { Landmark } from "lucide-react";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { formatCurrencyCompact } from "@/components/reports/chart-theme";
import type { PipelineByBankRow } from "@/types/reports";

interface Props {
  rows: PipelineByBankRow[];
}

export function ByBankTable({ rows }: Props) {
  return (
    <ContentCard noPadding>
      <ContentCardHeader>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Landmark className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">By Bank</h3>
        </div>
      </ContentCardHeader>
      <ContentCardBody>
        {rows.length === 0 ? (
          <div className="flex items-center justify-center h-[120px] text-sm text-muted-foreground">
            No bank-level activity yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm table-professional">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 font-medium">Bank / Account</th>
                  <th className="py-2 font-medium text-right">Sent</th>
                  <th className="py-2 font-medium text-right">Amount</th>
                  <th className="py-2 font-medium text-right">Accepted</th>
                  <th className="py-2 font-medium text-right">Rejected</th>
                  <th className="py-2 font-medium text-right">Acceptance</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr
                    key={`${row.bank_account_id}:${row.currency}`}
                    className="border-b border-border/40 last:border-0"
                  >
                    <td className="py-2.5">
                      <div className="font-medium text-foreground">
                        {row.bank_name}
                      </div>
                      {row.account_name && (
                        <div className="text-xs text-muted-foreground">
                          {row.account_name}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {row.sent_count}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-foreground">
                      {formatCurrencyCompact(parseFloat(row.sent_amount), row.currency)}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-emerald-600">
                      {row.accepted_count}
                    </td>
                    <td className="py-2.5 text-right tabular-nums text-red-600">
                      {row.rejected_count}
                    </td>
                    <td className="py-2.5 text-right tabular-nums">
                      {row.acceptance_rate === null
                        ? "—"
                        : `${row.acceptance_rate}%`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </ContentCardBody>
    </ContentCard>
  );
}
