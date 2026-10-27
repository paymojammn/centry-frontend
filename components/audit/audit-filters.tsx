"use client";

/**
 * Toolbar filters for the audit trail: severity, module, action, user email
 * and free text. Options for module/action come from the stats so the user
 * only picks values that exist in the current period.
 */

import { useEffect, useState } from "react";
import { Search, UserRound } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import type { AuditStats } from "@/types/reports";

export interface AuditFilterState {
  severity: string;
  module: string;
  actionType: string;
  userEmail: string;
  search: string;
}

export const EMPTY_AUDIT_FILTERS: AuditFilterState = {
  severity: "all",
  module: "all",
  actionType: "",
  userEmail: "",
  search: "",
};

interface AuditFiltersProps {
  value: AuditFilterState;
  onChange: (patch: Partial<AuditFilterState>) => void;
  stats?: AuditStats;
}

/** Text input that commits on Enter or blur — the API matches emails exactly. */
function CommitInput({
  value,
  onCommit,
  ...props
}: { value: string; onCommit: (v: string) => void } & Omit<
  React.ComponentProps<typeof Input>,
  "value" | "onChange" | "onBlur" | "onKeyDown"
>) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    const next = draft.trim();
    if (next !== value) onCommit(next);
  };
  return (
    <Input
      {...props}
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
      }}
    />
  );
}

export function AuditFilters({ value, onChange, stats }: AuditFiltersProps) {
  const moduleOptions = Object.keys(stats?.by_module || {});
  const actionOptions = Object.keys(stats?.by_action || {});

  return (
    <>
      <Select value={value.severity} onValueChange={(v) => onChange({ severity: v })}>
        <SelectTrigger className="h-9 w-[140px]" aria-label="Severity">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All severities</SelectItem>
          <SelectItem value="info">Info</SelectItem>
          <SelectItem value="warning">Warning</SelectItem>
          <SelectItem value="error">Error</SelectItem>
          <SelectItem value="critical">Critical</SelectItem>
        </SelectContent>
      </Select>
      <Select value={value.module} onValueChange={(v) => onChange({ module: v })}>
        <SelectTrigger className="h-9 w-[170px]" aria-label="Module">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All modules</SelectItem>
          {moduleOptions.map((m) => (
            <SelectItem key={m} value={m}>
              {m} ({stats?.by_module[m]})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={value.actionType || "all"}
        onValueChange={(v) => onChange({ actionType: v === "all" ? "" : v })}
      >
        <SelectTrigger className="h-9 w-[210px]" aria-label="Action">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All actions</SelectItem>
          {actionOptions.map((a) => (
            <SelectItem key={a} value={a}>
              {a} ({stats?.by_action[a]})
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="relative">
        <UserRound className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <CommitInput
          type="email"
          value={value.userEmail}
          onCommit={(v) => onChange({ userEmail: v })}
          placeholder="User email"
          className="h-9 w-[200px] pl-8"
          aria-label="Filter by user email"
        />
      </div>
      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={value.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Search description, user, target…"
          className="h-9 w-[240px] pl-8"
          aria-label="Search audit events"
        />
      </div>
    </>
  );
}
