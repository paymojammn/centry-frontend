"use client";

/**
 * Banking → Export · Overview tab
 *
 * Dashboard that summarises every other tab on /banking/export so a user
 * can land here and immediately see the state of the entire SFTP / pain
 * payment pipeline without clicking through.
 *
 * Sections:
 *   1. KPI tiles  — Outbox files · Awaiting bank · Accepted · Rejected
 *   2. Pipeline   — left: payment stage funnel · right: bank acceptance ratio
 *   3. Recent     — Outbox files · Inbox responses · Statements imported
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
    <div className="space-y-5">
      {/* ─ KPI tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          icon={FolderOpen}
          label="Outbox"
          value={fmtNum(outboxFiles)}
          sub={`${fmtNum(exports?.results?.reduce((s, e) => s + (e.payment_count || 0), 0) || 0)} payments`}
          accent="primary"
          onClick={() => onNavigate?.("files")}
        />
        <KpiTile
          icon={Clock}
          label="Awaiting bank"
          value={fmtNum(awaitingBank)}
          sub="sent · pending pain.002"
          accent="amber"
          onClick={() => onNavigate?.("inbox")}
        />
        <KpiTile
          icon={CheckCircle2}
          label="Accepted"
          value={fmtNum(accepted)}
          sub={
            acceptancePct !== null ? `${acceptancePct}% acceptance` : "no data"
          }
          accent="emerald"
          onClick={() => onNavigate?.("bank-status")}
        />
        <KpiTile
          icon={XCircle}
          label="Rejected"
          value={fmtNum(rejected)}
          sub={acceptanceTotal > 0 ? `of ${fmtNum(acceptanceTotal)} responses` : "no data"}
          accent="red"
          onClick={() => onNavigate?.("bank-status")}
        />
      </div>

      {/* ─ Pipeline + Acceptance ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Pipeline funnel */}
        <Card className="lg:col-span-2">
          <CardHeader
            title="Payment pipeline"
            subtitle="Across the lifecycle from approval to bank acceptance"
            action={
              <NavLink onClick={() => onNavigate?.("sftp-export")}>
                Generate next file
              </NavLink>
            }
          />
          <div className="p-5 pt-0 space-y-3">
            <PipelineRow
              icon={Clock}
              label="Pending approval"
              count={pipeline?.pending_approval ?? 0}
              amount={pipeline?.total_amount_pending_approval}
              tone="muted"
            />
            <PipelineRow
              icon={Loader2}
              label="Processing"
              count={pipeline?.processing ?? 0}
              amount={pipeline?.total_amount_processing}
              tone="info"
            />
            <PipelineRow
              icon={Upload}
              label="Sent to bank"
              count={pipeline?.sent ?? 0}
              amount={pipeline?.total_amount_sent}
              tone="amber"
            />
            <PipelineRow
              icon={CheckCircle2}
              label="Successful"
              count={pipeline?.success ?? 0}
              tone="emerald"
            />
            <PipelineRow
              icon={XCircle}
              label="Failed / Rejected"
              count={(pipeline?.failed ?? 0) + (pipeline?.rejected ?? 0)}
              tone="red"
            />
          </div>
        </Card>

        {/* Acceptance ratio */}
        <Card>
          <CardHeader
            title="Bank acceptance"
            subtitle="Pain.002 responses received"
          />
          <div className="p-5 pt-0">
            <AcceptanceRing
              percentage={acceptancePct}
              accepted={accepted}
              rejected={rejected}
              pending={bankResp?.pending_transactions ?? 0}
            />
          </div>
        </Card>
      </div>

      {/* ─ Recent activity ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <Card>
          <CardHeader
            title="Outbox"
            icon={FolderOpen}
            action={
              <NavLink onClick={() => onNavigate?.("files")}>View all</NavLink>
            }
          />
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
        </Card>

        <Card>
          <CardHeader
            title="Inbox"
            icon={Inbox}
            action={
              <NavLink onClick={() => onNavigate?.("inbox")}>View all</NavLink>
            }
          />
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
        </Card>

        <Card>
          <CardHeader
            title="Statements"
            icon={Wallet}
            action={
              <NavLink onClick={() => onNavigate?.("statements")}>
                View all
              </NavLink>
            }
          />
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
        </Card>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Building blocks (kept local; reusable shapes for this dashboard)
// ─────────────────────────────────────────────────────────────────────

function Card({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card rounded-xl border border-border ${className || ""}`}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  subtitle,
  icon: Icon,
  action,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 pb-3">
      <div className="flex items-start gap-2.5 min-w-0">
        {Icon && (
          <div className="size-7 rounded-md bg-muted flex items-center justify-center shrink-0">
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <h3 className="text-sm font-normal text-foreground truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function NavLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1 text-[12px] font-normal text-primary hover:opacity-80 transition-opacity"
    >
      {children}
      <ArrowRight className="h-3 w-3" />
    </button>
  );
}

const ACCENTS = {
  primary: {
    bg: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-700",
    ring: "ring-amber-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-700",
    ring: "ring-emerald-500/20",
  },
  red: { bg: "bg-red-500/10", text: "text-red-700", ring: "ring-red-500/20" },
  info: {
    bg: "bg-blue-500/10",
    text: "text-blue-700",
    ring: "ring-blue-500/20",
  },
  muted: {
    bg: "bg-muted",
    text: "text-muted-foreground",
    ring: "ring-border",
  },
} as const;

type Accent = keyof typeof ACCENTS;

function KpiTile({
  icon: Icon,
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  accent: Accent;
  onClick?: () => void;
}) {
  const a = ACCENTS[accent];
  return (
    <button
      onClick={onClick}
      className="text-left bg-card rounded-xl border border-border p-4 hover:border-foreground/10 hover:shadow-sm transition-all group"
    >
      <div className="flex items-center justify-between gap-3">
        <div className={`size-8 rounded-lg ${a.bg} flex items-center justify-center ring-1 ${a.ring}`}>
          <Icon className={`h-4 w-4 ${a.text}`} />
        </div>
        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
      </div>
      <div className="mt-3">
        <p className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">
          {label}
        </p>
        <p className="text-2xl font-normal text-foreground tabular-nums mt-1 leading-none">
          {value}
        </p>
        {sub && (
          <p className="text-[12px] text-muted-foreground mt-1.5">{sub}</p>
        )}
      </div>
    </button>
  );
}

function PipelineRow({
  icon: Icon,
  label,
  count,
  amount,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  count: number;
  amount?: string;
  tone: Accent;
}) {
  const a = ACCENTS[tone];
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={`size-6 rounded-md ${a.bg} flex items-center justify-center`}>
          <Icon className={`h-3 w-3 ${a.text}`} />
        </div>
        <span className="text-[13px] text-foreground truncate">{label}</span>
      </div>
      <div className="flex items-baseline gap-3 shrink-0">
        {amount && (
          <span className="text-[12px] text-muted-foreground tabular-nums">
            {fmtNum(parseFloat(amount))}
          </span>
        )}
        <span className="text-[13px] text-foreground tabular-nums min-w-[2ch] text-right">
          {fmtNum(count)}
        </span>
      </div>
    </div>
  );
}

function AcceptanceRing({
  percentage,
  accepted,
  rejected,
  pending,
}: {
  percentage: number | null;
  accepted: number;
  rejected: number;
  pending: number;
}) {
  // SVG conic ring — sage = accepted, red = rejected, muted ring = remainder.
  const total = accepted + rejected + pending;
  const acceptedDeg = total > 0 ? (accepted / total) * 360 : 0;
  const rejectedDeg = total > 0 ? (rejected / total) * 360 : 0;
  const display = percentage !== null ? `${percentage}%` : "—";

  const ringBg =
    total > 0
      ? `conic-gradient(
          rgb(var(--brand-primary)) 0 ${acceptedDeg}deg,
          rgb(239 68 68) ${acceptedDeg}deg ${acceptedDeg + rejectedDeg}deg,
          rgb(245 158 11 / 0.7) ${acceptedDeg + rejectedDeg}deg 360deg
        )`
      : "conic-gradient(rgb(var(--border)) 0 360deg)";

  return (
    <div className="flex flex-col items-center gap-4">
      <div
        className="relative size-32 rounded-full flex items-center justify-center"
        style={{ background: ringBg }}
      >
        <div className="absolute inset-2 rounded-full bg-card flex flex-col items-center justify-center">
          <span className="text-2xl font-normal text-foreground tabular-nums leading-none">
            {display}
          </span>
          <span className="text-[10px] uppercase tracking-[0.06em] text-muted-foreground mt-1">
            Accepted
          </span>
        </div>
      </div>
      <div className="w-full space-y-1.5 text-[12px]">
        <LegendRow color="bg-primary" label="Accepted" value={accepted} />
        <LegendRow color="bg-red-500" label="Rejected" value={rejected} />
        <LegendRow
          color="bg-amber-500/70"
          label="Pending"
          value={pending}
        />
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={`size-2 rounded-full ${color}`} />
        {label}
      </div>
      <span className="text-foreground tabular-nums">{fmtNum(value)}</span>
    </div>
  );
}

const STATUS_DOT: Record<string, string> = {
  pending: "bg-muted-foreground/40",
  generated: "bg-blue-500",
  uploaded: "bg-amber-500",
  processed: "bg-primary",
  failed: "bg-red-500",
  // imports
  COMPLETED: "bg-primary",
  PARTIAL: "bg-amber-500",
  FAILED: "bg-red-500",
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
