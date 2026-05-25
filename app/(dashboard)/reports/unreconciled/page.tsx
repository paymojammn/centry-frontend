"use client";

import { useState, useEffect } from "react";
import { format, subDays } from "date-fns";
import { Calendar, AlertTriangle, FileX, Hourglass } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard } from "@/components/layout/stat-card";
import {
  ContentCard,
  ContentCardHeader,
  ContentCardBody,
} from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { useUnreconciledReport } from "@/hooks/use-reports";
import { useOrganizations } from "@/hooks/use-organization";

const formatCurrency = (value: number, currency: string = "UGX") =>
  new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);

export default function UnreconciledReportPage() {
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);
  const [periodDays, setPeriodDays] = useState("60");
  const [bucket, setBucket] = useState<"all" | "bank_no_response" | "bank_unmatched" | "provider_stuck">("all");
  const [minAge, setMinAge] = useState("24");

  const { data: orgsResp, isLoading: orgsLoading } = useOrganizations();
  const organizations = Array.isArray(orgsResp) ? orgsResp : (orgsResp as any)?.results || [];
  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  const organizationId = selectedOrganizationId || undefined;
  const startDate = format(subDays(new Date(), parseInt(periodDays)), "yyyy-MM-dd");
  const endDate = format(new Date(), "yyyy-MM-dd");

  const { data, isLoading } = useUnreconciledReport(organizationId, {
    start_date: startDate,
    end_date: endDate,
    bucket,
    min_age_hours: parseInt(minAge) || 0,
  });

  const sections = data?.sections || {};
  const summary = data?.summary || {};

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Unreconciled Register"
        subtitle="Items in the payment pipeline that haven't been confirmed or matched"
        breadcrumbs={[{ label: "Reports", href: "/reports" }, { label: "Unreconciled" }]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <Select value={periodDays} onValueChange={setPeriodDays}>
          <SelectTrigger className="w-[150px]">
            <Calendar className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="60">Last 60 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
            <SelectItem value="180">Last 180 days</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      <div className="px-6 py-8 space-y-6">
        {/* Filter bar */}
        <ContentCard>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Bucket</label>
              <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All buckets</SelectItem>
                  <SelectItem value="bank_no_response">Bank — no pain.002 response</SelectItem>
                  <SelectItem value="bank_unmatched">Bank — unmatched pain.002</SelectItem>
                  <SelectItem value="provider_stuck">Provider — stuck processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Min age (hours)</label>
              <Input
                type="number"
                value={minAge}
                onChange={(e) => setMinAge(e.target.value)}
                placeholder="24"
                className="w-[120px]"
              />
            </div>
          </div>
        </ContentCard>

        {/* Summary */}
        <div className="grid gap-5 md:grid-cols-3">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </>
          ) : (
            <>
              <StatCard
                label="Bank — no response"
                value={summary.bank_no_response?.count ?? 0}
                icon={FileX}
                variant={(summary.bank_no_response?.count ?? 0) > 0 ? "warning" : "default"}
                subtext={formatCurrency(parseFloat(summary.bank_no_response?.amount || "0"))}
              />
              <StatCard
                label="Bank — unmatched"
                value={summary.bank_unmatched?.count ?? 0}
                icon={AlertTriangle}
                variant={(summary.bank_unmatched?.count ?? 0) > 0 ? "danger" : "default"}
                subtext={formatCurrency(parseFloat(summary.bank_unmatched?.amount || "0"))}
              />
              <StatCard
                label="Provider — stuck"
                value={summary.provider_stuck?.count ?? 0}
                icon={Hourglass}
                variant={(summary.provider_stuck?.count ?? 0) > 0 ? "warning" : "default"}
                subtext={formatCurrency(parseFloat(summary.provider_stuck?.amount || "0"))}
              />
            </>
          )}
        </div>

        {/* Bank no response */}
        {(bucket === "all" || bucket === "bank_no_response") && (
          <ContentCard noPadding>
            <ContentCardHeader>
              <h3 className="text-sm font-semibold text-foreground">
                Bank exports awaiting pain.002 response
              </h3>
            </ContentCardHeader>
            <ContentCardBody>
              {isLoading ? (
                <Skeleton className="h-[160px]" />
              ) : !sections.bank_no_response || sections.bank_no_response.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">All bank uploads have responses</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-professional">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 font-medium">Filename</th>
                        <th className="py-2 font-medium">Bank</th>
                        <th className="py-2 font-medium text-right">Payments</th>
                        <th className="py-2 font-medium text-right">Amount</th>
                        <th className="py-2 font-medium text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.bank_no_response.map((r) => (
                        <tr key={r.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 text-foreground font-mono text-xs truncate max-w-[280px]">
                            {r.filename}
                          </td>
                          <td className="py-2.5">
                            <div className="text-foreground">{r.bank}</div>
                            <div className="text-xs text-muted-foreground">{r.account_name}</div>
                          </td>
                          <td className="py-2.5 text-right tabular-nums">{r.payment_count}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatCurrency(parseFloat(r.amount), r.currency)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-amber-600">
                            {r.age_hours.toFixed(1)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ContentCardBody>
          </ContentCard>
        )}

        {/* Bank unmatched */}
        {(bucket === "all" || bucket === "bank_unmatched") && (
          <ContentCard noPadding>
            <ContentCardHeader>
              <h3 className="text-sm font-semibold text-foreground">
                Bank pain.002 line items that didn't match a payment
              </h3>
            </ContentCardHeader>
            <ContentCardBody>
              {isLoading ? (
                <Skeleton className="h-[160px]" />
              ) : !sections.bank_unmatched || sections.bank_unmatched.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No unmatched bank responses</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-professional">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 font-medium">EndToEnd ID</th>
                        <th className="py-2 font-medium">Instruction ID</th>
                        <th className="py-2 font-medium">Status</th>
                        <th className="py-2 font-medium text-right">Amount</th>
                        <th className="py-2 font-medium">Source file</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.bank_unmatched.map((r) => (
                        <tr key={r.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 font-mono text-xs">{r.end_to_end_id || "—"}</td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">{r.instruction_id || "—"}</td>
                          <td className="py-2.5">
                            <span className="text-xs uppercase font-medium">{r.status}</span>
                            {r.status_description && (
                              <div className="text-xs text-muted-foreground">{r.status_description}</div>
                            )}
                          </td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatCurrency(parseFloat(r.amount), r.currency || "UGX")}
                          </td>
                          <td className="py-2.5 font-mono text-xs truncate max-w-[240px]">{r.source_file}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ContentCardBody>
          </ContentCard>
        )}

        {/* Provider stuck */}
        {(bucket === "all" || bucket === "provider_stuck") && (
          <ContentCard noPadding>
            <ContentCardHeader>
              <h3 className="text-sm font-semibold text-foreground">
                Provider payments stuck in PROCESSING
              </h3>
            </ContentCardHeader>
            <ContentCardBody>
              {isLoading ? (
                <Skeleton className="h-[160px]" />
              ) : !sections.provider_stuck || sections.provider_stuck.length === 0 ? (
                <div className="text-sm text-muted-foreground py-4">No stuck provider payments</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm table-professional">
                    <thead>
                      <tr className="border-b border-border text-left text-xs text-muted-foreground">
                        <th className="py-2 font-medium">Recipient</th>
                        <th className="py-2 font-medium">Provider</th>
                        <th className="py-2 font-medium">Reference</th>
                        <th className="py-2 font-medium text-right">Amount</th>
                        <th className="py-2 font-medium text-right">Age</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sections.provider_stuck.map((r) => (
                        <tr key={r.id} className="border-b border-border/40 last:border-0">
                          <td className="py-2.5 text-foreground">{r.recipient || "—"}</td>
                          <td className="py-2.5 text-foreground">{r.provider}</td>
                          <td className="py-2.5 font-mono text-xs text-muted-foreground">{r.payment_reference || "—"}</td>
                          <td className="py-2.5 text-right tabular-nums">
                            {formatCurrency(parseFloat(r.amount), r.currency)}
                          </td>
                          <td className="py-2.5 text-right tabular-nums text-amber-600">
                            {r.age_hours.toFixed(1)}h
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </ContentCardBody>
          </ContentCard>
        )}
      </div>
    </div>
  );
}
