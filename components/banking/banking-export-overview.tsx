"use client";

/**
 * Banking → Export · Overview tab
 *
 * Dashboard that summarises every other tab on /banking/export so a user
 * can land here and immediately see the state of the entire SFTP / pain
 * payment pipeline without clicking through.
 *
 * Laid out exactly like the main dashboard (shared MetricTile / ContentCard /
 * SectionTitle), so the two read as one product:
 *   1. Bank files      — Outbox · Awaiting bank · Accepted · Rejected
 *   2. Payment pipeline — stage counts, full width
 *   3. Recent activity  — Outbox · Inbox · Statements
 *
 * Each "View all" link calls `onNavigate(tab)` so the parent can switch tabs
 * without a route change.
 */

import {
  ArrowRight,
  CheckCircle2,
  Clock,
  FileText,
  FolderOpen,
  Inbox,
  Loader2,
  Send,
  Upload,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { MetricTile } from "@/components/reports/MetricTile";
import { ContentCard, ContentCardHeader } from "@/components/layout/content-card";
import { SectionTitle } from "@/components/reports/chart-theme";
import { formatDistanceToNow } from "date-fns";
import {
  useBankPaymentExports,
  useBankImports,
  useBankResponseStats,
  usePaymentPipelineStats,
} from "@/hooks/use-banking";

interface BankingExportOverviewProps {
  organizationId?: string;
  /** Switch the active tab on the parent (e.g. "files", "inbox", "statements"). */
  onNavigate?: (tab: string) => void;
}

const fmtNum = (n: number | string | null | undefined) => {
  const v = typeof n === "string" ? parseFloat(n) : n ?? 0;
  return new Intl.NumberFormat("en-US").format(v || 0);
};

export function BankingExportOverview({
  organizationId,
  onNavigate,
}: BankingExportOverviewProps) {
  const { data: pipeline, isLoading: pipelineLoading } =
    usePaymentPipelineStats(organizationId);
  const { data: bankResp, isLoading: bankRespLoading } =
    useBankResponseStats(organizationId);
  const { data: exports, isLoading: exportsLoading } = useBankPaymentExports({
    organizationId,
  });
  const { data: imports, isLoading: importsLoading } = useBankImports({
    organizationId,
  });

  const loading =
    pipelineLoading || bankRespLoading || exportsLoading || importsLoading;

  if (loading && !pipeline && !bankResp && !exports && !imports) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  // ── Derived metrics ─────────────────────────────────────────────────
  const outboxFiles = exports?.count ?? exports?.results?.length ?? 0;
  const awaitingBank =
    (pipeline?.sent ?? 0) + (bankResp?.pending_transactions ?? 0);
  const accepted = bankResp?.successful_transactions ?? 0;
  const rejected = bankResp?.rejected_transactions ?? 0;
  const acceptanceTotal = accepted + rejected;
  const acceptancePct =
    acceptanceTotal > 0 ? Math.round((accepted / acceptanceTotal) * 100) : null;

  const recentOutbox = (exports?.results || []).slice(0, 4);
  const recentInbox = (exports?.results || [])
    .filter((e) => e.status === "processed" || e.status === "uploaded")
    .slice(0, 4);
  const recentStatements = (imports?.results || []).slice(0, 4);

  return (
    <div className="space-y-8">
      {/* ─── Section 1: Bank files ─── */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Bank files
        </h2>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricTile
            label="Outbox"
            value={fmtNum(outboxFiles)}
            hint={`${fmtNum(exports?.results?.reduce((s, e) => s + (e.payment_count || 0), 0) || 0)} payments`}
            icon={FolderOpen}
            onClick={() => onNavigate?.("files")}
          />
          <MetricTile
            label="Awaiting bank"
            value={fmtNum(awaitingBank)}
            hint="Sent · pending pain.002"
            icon={Clock}
            tone={awaitingBank > 0 ? "warning" : "default"}
            onClick={() => onNavigate?.("inbox")}
          />
          <MetricTile
            label="Accepted"
            value={fmtNum(accepted)}
            hint={acceptancePct !== null ? `${acceptancePct}% acceptance` : "No responses yet"}
            icon={CheckCircle2}
            tone={accepted > 0 ? "success" : "default"}
            onClick={() => onNavigate?.("bank-status")}
          />
          <MetricTile
            label="Rejected"
            value={fmtNum(rejected)}
            hint={acceptanceTotal > 0 ? `of ${fmtNum(acceptanceTotal)} responses` : "No responses yet"}
            icon={XCircle}
            tone={rejected > 0 ? "danger" : "default"}
            onClick={() => onNavigate?.("bank-status")}
          />
        </div>
      </div>

      {/* ─── Section 2: Payment pipeline ─── */}
      <ContentCard noPadding>
        <ContentCardHeader className="px-6">
          <SectionTitle
            icon={<Send className="h-4 w-4" />}
            title="Payment pipeline"
            subtitle="From approval to bank acceptance"
            right={
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary h-8"
                onClick={() => onNavigate?.("sftp-export")}
              >
                Generate next file <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            }
          />
        </ContentCardHeader>
        <div className="px-6 py-2">
          <PipelineRow label="Pending approval" count={pipeline?.pending_approval ?? 0} amount={pipeline?.total_amount_pending_approval} tone="muted" />
          <PipelineRow label="Processing" count={pipeline?.processing ?? 0} amount={pipeline?.total_amount_processing} tone="info" />
          <PipelineRow label="Sent to bank" count={pipeline?.sent ?? 0} amount={pipeline?.total_amount_sent} tone="amber" />
          <PipelineRow label="Successful" count={pipeline?.success ?? 0} tone="emerald" />
          <PipelineRow label="Failed / Rejected" count={(pipeline?.failed ?? 0) + (pipeline?.rejected ?? 0)} tone="red" />
        </div>
      </ContentCard>

      {/* ─── Section 3: Recent activity ─── */}
      <div className="grid gap-6 lg:grid-cols-3">
        <ContentCard noPadding>
          <ContentCardHeader className="px-6">
            <SectionTitle icon={<FolderOpen className="h-4 w-4" />} title="Outbox" right={<ViewAll onClick={() => onNavigate?.("files")} />} />
          </ContentCardHeader>
          <RecentList
            items={recentOutbox}
            empty="No files generated yet"
            render={(e) => ({
              title: e.file_name || `Export #${e.id}`,
              sub: `${e.payment_count} pmts · ${e.currency} ${fmtNum(parseFloat(e.total_amount))}`,
              when: e.created_at,
              status: e.status,
            })}
          />
        </ContentCard>
        <ContentCard noPadding>
          <ContentCardHeader className="px-6">
            <SectionTitle icon={<Inbox className="h-4 w-4" />} title="Inbox" right={<ViewAll onClick={() => onNavigate?.("inbox")} />} />
          </ContentCardHeader>
          <RecentList
            items={recentInbox}
            empty="No bank responses yet"
            render={(e) => ({
              title: e.file_name || `Export #${e.id}`,
              sub: e.bank_account?.bank_name || e.bank_account?.account_name || "—",
              when: e.sftp_uploaded_at || e.updated_at,
              status: e.status,
            })}
          />
        </ContentCard>
        <ContentCard noPadding>
          <ContentCardHeader className="px-6">
            <SectionTitle icon={<Wallet className="h-4 w-4" />} title="Statements" right={<ViewAll onClick={() => onNavigate?.("statements")} />} />
          </ContentCardHeader>
          <RecentList
            items={recentStatements}
            empty="No statements imported"
            render={(i) => ({
              title: i.original_filename,
              sub: `${i.transactions_count} tx · ${i.bank_provider?.name || "—"}`,
              when: i.imported_at,
              status: i.status,
            })}
          />
        </ContentCard>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Building blocks local to this overview
// ─────────────────────────────────────────────────────────────────────

function ViewAll({ onClick }: { onClick?: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary h-8" onClick={onClick}>
      View all <ArrowRight className="h-3.5 w-3.5 ml-1" />
    </Button>
  );
}

// Stage dot colours — same semantics as the main dashboard's pipeline.
const STAGE_DOT = {
  muted: "bg-neutral-300",
  info: "bg-info",
  amber: "bg-warning",
  emerald: "bg-success",
  red: "bg-danger",
} as const;

function PipelineRow({
  label,
  count,
  amount,
  tone,
}: {
  label: string;
  count: number;
  amount?: string;
  tone: keyof typeof STAGE_DOT;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <span aria-hidden className={`h-1.5 w-1.5 rounded-full shrink-0 ${STAGE_DOT[tone]}`} />
        <span className="text-sm text-foreground truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-3 shrink-0">
        {amount && (
          <span className="text-xs text-muted-foreground tabular-nums">{fmtNum(parseFloat(amount))}</span>
        )}
        <span className="text-sm font-semibold text-foreground tabular-nums w-10 text-right">{fmtNum(count)}</span>
      </div>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-muted-foreground/40",
  generated: "bg-info-500",
  uploaded: "bg-warning-500",
  processed: "bg-primary",
  failed: "bg-danger-500",
  // imports
  COMPLETED: "bg-primary",
  PARTIAL: "bg-warning-500",
  FAILED: "bg-danger-500",
};

function RecentList<T>({
  items,
  render,
  empty,
}: {
  items: T[];
  render: (item: T) => {
    title: string;
    sub: string;
    when: string | null;
    status?: string;
  };
  empty: string;
}) {
  if (items.length === 0) {
    return (
      <div className="px-5 pb-5 pt-2 text-center">
        <p className="text-[12px] text-muted-foreground italic">{empty}</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {items.map((item, i) => {
        const r = render(item);
        return (
          <div key={i} className="flex items-start gap-3 px-5 py-3">
            <span
              className={`size-1.5 rounded-full mt-1.5 shrink-0 ${
                STATUS_DOT[r.status || ""] || "bg-muted-foreground/40"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-foreground truncate">{r.title}</p>
              <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                {r.sub}
              </p>
            </div>
            {r.when && (
              <span className="text-[11px] text-muted-foreground/70 shrink-0 mt-0.5">
                {formatDistanceToNow(new Date(r.when), { addSuffix: true })
                  .replace("about ", "")
                  .replace(" ago", "")}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
