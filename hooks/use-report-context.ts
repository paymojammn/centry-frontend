/**
 * Shared state for every report page: which organization, and which period.
 *
 * Reports used to each pick an org with the same useEffect and each build
 * their own "last N days" select. These two hooks are that boilerplate, once,
 * so a report page is only its data hook + its content.
 */

import { useEffect, useMemo, useState } from "react";
import {
  endOfDay,
  format,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  subDays,
} from "date-fns";
import { useOrganizations } from "@/hooks/use-organization";

export function useReportOrganization() {
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const { data, isLoading } = useOrganizations();
  const organizations = Array.isArray(data) ? data : (data as any)?.results || [];
  useEffect(() => {
    if (!organizationId && organizations?.length) setOrganizationId(organizations[0].id);
  }, [organizations, organizationId]);
  return { organizations, organizationId, setOrganizationId, isLoading };
}

export type PeriodPreset = "7d" | "30d" | "90d" | "mtd" | "qtd" | "ytd" | "custom";

export const PERIOD_PRESETS: { value: PeriodPreset; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
  { value: "mtd", label: "Month to date" },
  { value: "qtd", label: "Quarter to date" },
  { value: "ytd", label: "Year to date" },
  { value: "custom", label: "Custom" },
];

const iso = (d: Date) => format(d, "yyyy-MM-dd");

export interface ReportPeriod {
  preset: PeriodPreset;
  setPreset: (p: PeriodPreset) => void;
  /** ISO dates (yyyy-MM-dd) — what the report hooks take. */
  startDate: string;
  endDate: string;
  setCustomRange: (start: string, end: string) => void;
  /** Whole days in the range, for "per day" maths and legacy `periodDays` params. */
  days: number;
  label: string;
}

export function useReportPeriod(initial: PeriodPreset = "30d"): ReportPeriod {
  const [preset, setPreset] = useState<PeriodPreset>(initial);
  const [custom, setCustom] = useState<{ start: string; end: string }>(() => ({
    start: iso(subDays(new Date(), 30)),
    end: iso(new Date()),
  }));

  const { startDate, endDate } = useMemo(() => {
    const today = endOfDay(new Date());
    switch (preset) {
      case "7d":
        return { startDate: iso(subDays(today, 7)), endDate: iso(today) };
      case "90d":
        return { startDate: iso(subDays(today, 90)), endDate: iso(today) };
      case "mtd":
        return { startDate: iso(startOfMonth(today)), endDate: iso(today) };
      case "qtd":
        return { startDate: iso(startOfQuarter(today)), endDate: iso(today) };
      case "ytd":
        return { startDate: iso(startOfYear(today)), endDate: iso(today) };
      case "custom":
        return { startDate: custom.start, endDate: custom.end };
      default:
        return { startDate: iso(subDays(today, 30)), endDate: iso(today) };
    }
  }, [preset, custom]);

  const days = Math.max(1, Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / 86_400_000));
  const label = preset === "custom"
    ? `${format(new Date(startDate), "dd MMM yyyy")} – ${format(new Date(endDate), "dd MMM yyyy")}`
    : PERIOD_PRESETS.find((p) => p.value === preset)!.label;

  return {
    preset,
    setPreset,
    startDate,
    endDate,
    setCustomRange: (start, end) => {
      setCustom({ start, end });
      setPreset("custom");
    },
    days,
    label,
  };
}
