"use client";

/**
 * The one scaffold every report page uses:
 *
 *   <ReportShell title period org actions filters>
 *     <ReportSummary> four MetricTiles </ReportSummary>
 *     <ReportSection title …> chart or .table-professional </ReportSection>
 *   </ReportShell>
 *
 * Header: title · org switcher · actions (export). Toolbar: period presets
 * as pills (+ custom range) on the left, the report's own selects on the
 * right. Everything below is the report's content with dashboard spacing.
 */

import { ReactNode } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ContentCard, ContentCardHeader } from "@/components/layout/content-card";
import { SectionTitle } from "@/components/reports/chart-theme";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { PERIOD_PRESETS, type ReportPeriod } from "@/hooks/use-report-context";

interface Organization {
  id: string;
  name: string;
  billing_active?: boolean;
}

interface ReportShellProps {
  title: string;
  organizations?: Organization[];
  organizationId?: string | null;
  onOrganizationChange?: (id: string) => void;
  isLoadingOrgs?: boolean;
  /** From useReportPeriod(). Omit for reports with no time dimension. */
  period?: ReportPeriod;
  /** Report-specific filters (Selects) — rendered right-aligned in the toolbar. */
  filters?: ReactNode;
  /** Header actions, usually <ExportButton …/>. */
  actions?: ReactNode;
  children: ReactNode;
}

export function ReportShell({
  title,
  organizations,
  organizationId,
  onOrganizationChange,
  isLoadingOrgs,
  period,
  filters,
  actions,
  children,
}: ReportShellProps) {
  const showToolbar = period || filters;
  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title={title}
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={onOrganizationChange}
        isLoadingOrgs={isLoadingOrgs}
      >
        {actions}
      </PageHeader>

      <div className="px-6 py-6 space-y-8">
        {showToolbar && (
          <div className="flex flex-wrap items-center gap-2">
            {period && <PeriodPills period={period} />}
            {filters && <div className="ml-auto flex flex-wrap items-center gap-2">{filters}</div>}
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

function PeriodPills({ period }: { period: ReportPeriod }) {
  return (
    <>
      {PERIOD_PRESETS.map((p) => {
        const active = period.preset === p.value;
        return (
          <button
            key={p.value}
            type="button"
            onClick={() => period.setPreset(p.value)}
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground"
            )}
          >
            {p.label}
          </button>
        );
      })}
      {period.preset === "custom" && (
        <div className="flex items-center gap-1.5 ml-1">
          <Input
            type="date"
            value={period.startDate}
            max={period.endDate}
            onChange={(e) => period.setCustomRange(e.target.value, period.endDate)}
            className="h-8 w-[150px] text-xs"
            aria-label="Start date"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <Input
            type="date"
            value={period.endDate}
            min={period.startDate}
            onChange={(e) => period.setCustomRange(period.startDate, e.target.value)}
            className="h-8 w-[150px] text-xs"
            aria-label="End date"
          />
        </div>
      )}
    </>
  );
}

/** Four-up summary row — same grid as the dashboards. */
export function ReportSummary({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-4 grid-cols-2 lg:grid-cols-4", className)}>{children}</div>;
}

interface ReportSectionProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  /** Padded body (charts) vs flush (tables). */
  padded?: boolean;
  className?: string;
  children: ReactNode;
}

/** A titled card: SectionTitle header, then a chart (padded) or a table (flush). */
export function ReportSection({ title, subtitle, icon, right, padded = false, className, children }: ReportSectionProps) {
  return (
    <ContentCard noPadding className={className}>
      <ContentCardHeader className="px-6">
        <SectionTitle icon={icon} title={title} subtitle={subtitle} right={right} />
      </ContentCardHeader>
      <div className={padded ? "px-6 py-5" : undefined}>{children}</div>
    </ContentCard>
  );
}

/** Two cards side by side; collapses to one column on small screens. */
export function ReportRow({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid gap-6 lg:grid-cols-2", className)}>{children}</div>;
}
