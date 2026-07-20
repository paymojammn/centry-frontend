"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { AlertTriangle, ArrowDownToLine, CalendarClock, RefreshCw, Users } from "lucide-react";

import { ContentCard } from "@/components/layout/content-card";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/layout/stat-card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useERPConnections } from "@/hooks/use-erp";
import { useDueLoans, useRecordRepayment, useSyncLoans } from "@/hooks/use-lending";
import { useOrganizations } from "@/hooks/use-organization";
import { formatCurrency } from "@/lib/utils";
import type { LoanDueRow } from "@/types/lending";

function RecordPaymentDialog({
  row,
  onClose,
}: {
  row: LoanDueRow;
  onClose: () => void;
}) {
  const [amount, setAmount] = useState(row.amount_due);
  const [reference, setReference] = useState("");
  const repayMutation = useRecordRepayment(row.loan_id);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Record payment — {row.erpnext_name}</DialogTitle>
          <DialogDescription>
            {row.applicant_name || row.applicant} · due{" "}
            {formatCurrency(parseFloat(row.amount_due) || 0, row.currency)}. Posts a Loan
            Repayment to your ERP.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="collect-amount" className="text-sm font-medium text-foreground">
              Amount
            </label>
            <Input
              id="collect-amount"
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Partial amounts are fine — the ERP allocates whatever lands.
            </p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="collect-reference" className="text-sm font-medium text-foreground">
              Reference
            </label>
            <Input
              id="collect-reference"
              placeholder="Provider transaction ref (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={repayMutation.isPending}>
            Cancel
          </Button>
          <Button
            disabled={!(parseFloat(amount) > 0) || repayMutation.isPending}
            onClick={() =>
              repayMutation.mutate(
                { amount, reference: reference || undefined },
                { onSuccess: onClose }
              )
            }
          >
            {repayMutation.isPending ? "Posting..." : "Post repayment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CollectionsPage() {
  const [asOf, setAsOf] = useState("");
  const [payingRow, setPayingRow] = useState<LoanDueRow | null>(null);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState<string | null>(null);

  const { data: organizationsResponse, isLoading: orgsLoading } = useOrganizations();
  const organizations = useMemo(
    () =>
      Array.isArray(organizationsResponse)
        ? organizationsResponse
        : (organizationsResponse as { results?: { id: string; name: string }[] })?.results || [],
    [organizationsResponse]
  );

  useEffect(() => {
    if (!selectedOrganizationId && organizations?.length > 0) {
      setSelectedOrganizationId(organizations[0].id);
    }
  }, [organizations, selectedOrganizationId]);

  // Resolve the selected org's active ERP connection (drives the Sync button).
  const { data: erpConnectionsResponse } = useERPConnections();
  const erpConnections = Array.isArray(erpConnectionsResponse)
    ? erpConnectionsResponse
    : (erpConnectionsResponse as unknown as { results?: unknown[] })?.results || [];
  const activeConnectionId =
    (erpConnections as { id: string; is_active: boolean; organization?: { id: string } }[]).find(
      (conn) => conn.organization?.id === selectedOrganizationId && conn.is_active
    )?.id || null;

  const { mutate: syncLoans, isPending: isSyncing } = useSyncLoans();
  const { data: rows = [], isLoading } = useDueLoans(
    asOf || undefined,
    selectedOrganizationId || undefined
  );

  const currency = rows[0]?.currency || "UGX";
  const totalDue = rows.reduce((s, r) => s + (parseFloat(r.amount_due) || 0), 0);
  const overdueRows = rows.filter((r) => r.days_overdue > 0);

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Collections"
        subtitle="Loans with installments due — the daily collection run"
        breadcrumbs={[
          { label: "Lending", href: "/lending" },
          { label: "Collections" },
        ]}
        organizations={organizations}
        selectedOrganizationId={selectedOrganizationId}
        onOrganizationChange={setSelectedOrganizationId}
        isLoadingOrgs={orgsLoading}
      >
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
            className="h-9 w-[150px] text-sm"
            title="Due as of date"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeConnectionId && syncLoans(activeConnectionId)}
            disabled={isSyncing || !activeConnectionId}
            className="h-9 btn-press"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
            Sync
          </Button>
        </div>
      </PageHeader>

      <div className="px-6 py-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in-up">
          <StatCard label="Loans due" value={rows.length} icon={Users} variant="accent" />
          <StatCard
            label="Amount due"
            value={formatCurrency(totalDue, currency)}
            icon={CalendarClock}
            variant="warning"
          />
          <StatCard
            label="In arrears"
            value={overdueRows.length}
            icon={AlertTriangle}
            variant={overdueRows.length > 0 ? "danger" : "default"}
          />
        </div>

        <ContentCard noPadding>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-11 w-full rounded-lg" />
              ))}
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
                <ArrowDownToLine className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">Nothing due</p>
              <p className="text-xs text-muted-foreground mt-1">
                No open loans have unpaid installments due{asOf ? ` as of ${asOf}` : " today"}.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                <div className="col-span-2">Loan</div>
                <div className="col-span-3">Applicant</div>
                <div className="col-span-1 text-right">Due inst.</div>
                <div className="col-span-2 text-right">Amount due</div>
                <div className="col-span-2">Last due date</div>
                <div className="col-span-1 text-right">DPD</div>
                <div className="col-span-1"></div>
              </div>
              <div className="divide-y divide-border max-h-[calc(100vh-320px)] overflow-y-auto">
                {rows.map((row) => (
                  <div
                    key={row.loan_id}
                    className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                  >
                    <div className="col-span-2 min-w-0">
                      <Link
                        href={`/lending/loans/${row.loan_id}`}
                        className="text-foreground truncate hover:underline block"
                      >
                        {row.erpnext_name}
                      </Link>
                      {row.loan_product && (
                        <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                          {row.loan_product}
                        </p>
                      )}
                    </div>
                    <div className="col-span-3 min-w-0">
                      <p className="text-foreground truncate">
                        {row.applicant_name || row.applicant || "—"}
                      </p>
                    </div>
                    <div className="col-span-1 text-right tabular-nums text-muted-foreground">
                      {row.installments_due}
                    </div>
                    <div className="col-span-2 text-right tabular-nums text-foreground">
                      {formatCurrency(parseFloat(row.amount_due) || 0, row.currency)}
                    </div>
                    <div className="col-span-2 text-muted-foreground tabular-nums">
                      {format(new Date(row.last_due_date), "dd MMM yyyy")}
                    </div>
                    <div className="col-span-1 text-right">
                      <span
                        className={`tabular-nums ${
                          row.days_overdue > 0 ? "text-red-600 font-medium" : "text-muted-foreground"
                        }`}
                      >
                        {row.days_overdue > 0 ? row.days_overdue : "—"}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={() => setPayingRow(row)}
                      >
                        Collect
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </ContentCard>
      </div>

      {payingRow && (
        <RecordPaymentDialog row={payingRow} onClose={() => setPayingRow(null)} />
      )}
    </div>
  );
}
