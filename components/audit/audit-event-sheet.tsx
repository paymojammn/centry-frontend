"use client";

/**
 * Per-event details drawer for the audit trail: who / when / where summary,
 * then `changes` (field → old → new) and `metadata` as key/value lists, and
 * the request id so an event can be correlated with server logs.
 */

import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAuditLogDetail } from "@/hooks/use-reports";
import type { AuditLog } from "@/types/reports";

const SEVERITY_PILL: Record<string, string> = {
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  error: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  critical: "bg-danger-500/10 text-danger-700 border-danger-500/20",
};

export function SeverityPill({ severity }: { severity: string }) {
  const pill = SEVERITY_PILL[severity] || "bg-muted text-muted-foreground border-border";
  return <span className={`status-pill ${pill} capitalize`}>{severity}</span>;
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

/** `{ field: { old, new } }` → three columns; anything else → two. */
function isOldNew(value: unknown): value is { old?: unknown; new?: unknown } {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("old" in (value as object) || "new" in (value as object))
  );
}

export function KeyValueList({
  title,
  data,
  emptyLabel,
}: {
  title: string;
  data: Record<string, unknown> | undefined;
  emptyLabel: string;
}) {
  const entries = Object.entries(data || {});
  return (
    <section aria-label={title} className="space-y-2">
      <h3 className="text-[11px] uppercase tracking-wider text-muted-foreground">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <dl className="rounded-lg border border-border divide-y divide-border">
          {entries.map(([key, value]) => (
            <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-3 px-3 py-2">
              <dt className="text-xs text-muted-foreground break-words pt-0.5">{key}</dt>
              <dd className="text-sm text-foreground break-words min-w-0">
                {isOldNew(value) ? (
                  <span className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
                    <span className="text-muted-foreground line-through">{formatValue(value.old)}</span>
                    <span aria-hidden className="text-muted-foreground">→</span>
                    <span>{formatValue(value.new)}</span>
                  </span>
                ) : (
                  <span className="font-mono text-xs">{formatValue(value)}</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm text-foreground break-words">{children}</dd>
    </div>
  );
}

interface AuditEventSheetProps {
  event: AuditLog | null;
  onClose: () => void;
}

export function AuditEventSheet({ event, onClose }: AuditEventSheetProps) {
  const { data: detail } = useAuditLogDetail(event?.id ?? null);
  const row = detail ?? event;
  const when = row ? new Date(row.timestamp) : null;

  return (
    <Sheet open={!!event} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:w-[560px] sm:max-w-none p-0 gap-0 flex flex-col">
        {row && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b border-border">
              <div className="flex items-center gap-2 min-w-0">
                <SheetTitle className="font-mono text-sm truncate">{row.action_type}</SheetTitle>
                <SeverityPill severity={row.severity} />
                {!row.success && (
                  <span className="status-pill bg-danger-500/10 text-danger-700 border-danger-500/20">Failed</span>
                )}
              </div>
              <SheetDescription>{row.action_description}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
                <Fact label="When">
                  {when && !isNaN(when.getTime()) ? format(when, "dd MMM yyyy, HH:mm:ss") : "—"}
                </Fact>
                <Fact label="User">
                  {row.user_name || "System"}
                  {row.user_email && <span className="block text-xs text-muted-foreground">{row.user_email}</span>}
                  {row.user_ip && <span className="block font-mono text-xs text-muted-foreground">{row.user_ip}</span>}
                </Fact>
                <Fact label="Organization">{row.organization_name || "—"}</Fact>
                <Fact label="Module">{row.module || "—"}</Fact>
                <Fact label="Target">{row.target_representation || "—"}</Fact>
                <Fact label="Request ID">
                  <span className="font-mono text-xs">{row.request_id || "—"}</span>
                </Fact>
              </dl>

              {row.error_message && (
                <p className="rounded-lg border border-danger-500/20 bg-danger-500/10 px-3 py-2 text-sm text-danger-700">
                  {row.error_message}
                </p>
              )}

              <KeyValueList title="Changes" data={row.changes} emptyLabel="No field changes recorded." />
              <KeyValueList title="Metadata" data={row.metadata} emptyLabel="No additional context." />

              {row.user_agent && (
                <p className="text-xs text-muted-foreground break-words">
                  <span className="uppercase tracking-wider">User agent</span> · {row.user_agent}
                </p>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
