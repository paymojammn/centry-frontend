"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Banknote,
  CalendarClock,
  ExternalLink,
  Wallet,
} from "lucide-react";

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
import {
  useLoan,
  useRecordDisbursement,
  useRecordRepayment,
} from "@/hooks/use-lending";
import { formatCurrency } from "@/lib/utils";

const DISBURSABLE = new Set(["Sanctioned", "Partially Disbursed"]);
const COLLECTABLE = new Set(["Partially Disbursed", "Disbursed", "Active"]);

// Frappe docstatus — shared doc lifecycle across Loan Repayment / Disbursement.
const DOCSTATUS_LABELS: Record<number, string> = {
  0: "Draft",
  1: "Submitted",
  2: "Cancelled",
};

const DOCSTATUS_STYLES: Record<number, string> = {
  0: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  1: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  2: "bg-red-500/10 text-red-700 border-red-500/20",
};

type Section = "schedule" | "repayments" | "disbursements";

function DeskLink({ url }: { url: string }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title="Open in ERPNext"
      className="inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
    >
      <ExternalLink className="h-4 w-4" />
    </a>
  );
}

function EmptySection({ icon: Icon, title, hint }: { icon: typeof Banknote; title: string; hint: string }) {
  return (
    <div className="text-center py-20">
      <div className="p-3 rounded-xl bg-muted w-fit mx-auto mb-3">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground mt-1">{hint}</p>
    </div>
  );
}

interface PostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  dateLabel: string;
  submitLabel: string;
  isPending: boolean;
  defaultAmount?: string;
  onSubmit: (values: { amount: string; date: string; reference: string }) => void;
}

function PostDialog({
  open,
  onOpenChange,
  title,
  description,
  dateLabel,
  submitLabel,
  isPending,
  defaultAmount = "",
  onSubmit,
}: PostDialogProps) {
  const [amount, setAmount] = useState(defaultAmount);
  const [date, setDate] = useState("");
  const [reference, setReference] = useState("");

  const valid = parseFloat(amount) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <label htmlFor="post-amount" className="text-sm font-medium text-foreground">
              Amount
            </label>
            <Input
              id="post-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="post-date" className="text-sm font-medium text-foreground">
              {dateLabel}
            </label>
            <Input
              id="post-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Leave empty to use today.</p>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="post-reference" className="text-sm font-medium text-foreground">
              Reference
            </label>
            <Input
              id="post-reference"
              placeholder="Provider transaction ref (optional)"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => onSubmit({ amount, date, reference })}
            disabled={!valid || isPending}
          >
            {isPending ? "Posting..." : submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function LoanDetailPage() {
  const params = useParams<{ id: string }>();
  const loanId = params.id;

  const { data: loan, isLoading } = useLoan(loanId);
  const repayMutation = useRecordRepayment(loanId);
  const disburseMutation = useRecordDisbursement(loanId);

  const [section, setSection] = useState<Section>("schedule");
  const [repayOpen, setRepayOpen] = useState(false);
  const [disburseOpen, setDisburseOpen] = useState(false);

  if (isLoading || !loan) {
    return (
      <div className="min-h-screen bg-[rgb(var(--page-bg))] px-6 py-8 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const fmt = (v: string) => formatCurrency(parseFloat(v) || 0, loan.currency);
  const today = format(new Date(), "yyyy-MM-dd");

  const sections: { value: Section; label: string; count: number }[] = [
    { value: "schedule", label: "Schedule", count: loan.schedule_rows.length },
    { value: "repayments", label: "Repayments", count: loan.repayments.length },
    { value: "disbursements", label: "Disbursements", count: loan.disbursements.length },
  ];

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title={loan.erpnext_name}
        subtitle={`${loan.applicant_name || loan.applicant}${loan.loan_product ? ` · ${loan.loan_product}` : ""} · ${loan.status}`}
        breadcrumbs={[
          { label: "Lending", href: "/lending" },
          { label: loan.erpnext_name },
        ]}
      >
        <div className="flex items-center gap-2">
          {loan.desk_url && (
            <Button asChild variant="outline" size="sm" className="h-9">
              <a href={loan.desk_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in ERPNext
              </a>
            </Button>
          )}
          {DISBURSABLE.has(loan.status) && (
            <Button variant="outline" size="sm" className="h-9" onClick={() => setDisburseOpen(true)}>
              <ArrowUpFromLine className="h-4 w-4 mr-2" />
              Disburse
            </Button>
          )}
          {COLLECTABLE.has(loan.status) && (
            <Button size="sm" className="h-9" onClick={() => setRepayOpen(true)}>
              <ArrowDownToLine className="h-4 w-4 mr-2" />
              Record repayment
            </Button>
          )}
        </div>
      </PageHeader>

      <div className="px-6 py-8 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in-up">
          <StatCard label="Loan amount" value={fmt(loan.loan_amount)} icon={Banknote} variant="accent" />
          <StatCard label="Disbursed" value={fmt(loan.disbursed_amount)} icon={ArrowUpFromLine} variant="info" />
          <StatCard label="Repaid" value={fmt(loan.total_amount_paid)} icon={ArrowDownToLine} variant="success" />
          <StatCard label="Outstanding" value={fmt(loan.outstanding_amount)} icon={Wallet} variant="warning" />
        </div>

        <ContentCard noPadding>
          <div className="px-4 py-3 border-b border-border flex items-center gap-2 flex-wrap">
            {sections.map((s) => {
              const active = section === s.value;
              return (
                <button
                  key={s.value}
                  onClick={() => setSection(s.value)}
                  className={`px-3 py-1 rounded-full text-xs font-normal transition-colors ${
                    active
                      ? "bg-foreground text-card"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {s.label} ({s.count})
                </button>
              );
            })}
            {loan.next_due_date && (
              <span className="ml-auto text-xs text-muted-foreground">
                Next due {format(new Date(loan.next_due_date), "dd MMM yyyy")}
              </span>
            )}
          </div>

          {section === "schedule" &&
            (loan.schedule_rows.length === 0 ? (
              <EmptySection
                icon={CalendarClock}
                title="No repayment schedule"
                hint="The schedule appears here after the loan is disbursed in your ERP and synced."
              />
            ) : (
              <>
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                  <div className="col-span-1">#</div>
                  <div className="col-span-3">Due date</div>
                  <div className="col-span-2 text-right">Principal</div>
                  <div className="col-span-2 text-right">Interest</div>
                  <div className="col-span-2 text-right">Total</div>
                  <div className="col-span-2 text-right">Balance</div>
                </div>
                <div className="divide-y divide-border max-h-[calc(100vh-380px)] overflow-y-auto">
                  {loan.schedule_rows.map((row) => {
                    const overdue = row.payment_date < today;
                    return (
                      <div
                        key={row.id}
                        className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                      >
                        <div className="col-span-1 text-muted-foreground">{row.idx}</div>
                        <div
                          className={`col-span-3 tabular-nums ${overdue ? "text-red-600" : "text-foreground"}`}
                        >
                          {format(new Date(row.payment_date), "dd MMM yyyy")}
                        </div>
                        <div className="col-span-2 text-right tabular-nums">
                          {fmt(row.principal_amount)}
                        </div>
                        <div className="col-span-2 text-right tabular-nums">
                          {fmt(row.interest_amount)}
                        </div>
                        <div className="col-span-2 text-right tabular-nums text-foreground">
                          {fmt(row.total_payment)}
                        </div>
                        <div className="col-span-2 text-right tabular-nums text-muted-foreground">
                          {fmt(row.balance_loan_amount)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ))}

          {section === "repayments" &&
            (loan.repayments.length === 0 ? (
              <EmptySection
                icon={ArrowDownToLine}
                title="No repayments posted"
                hint="Use Record repayment to post a collection against this loan."
              />
            ) : (
              <>
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-4">Document</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-border max-h-[calc(100vh-380px)] overflow-y-auto">
                  {loan.repayments.map((rp) => (
                    <div
                      key={rp.id}
                      className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                    >
                      <div className="col-span-2 text-muted-foreground tabular-nums">
                        {format(new Date(rp.posting_date), "dd MMM yyyy")}
                      </div>
                      <div className="col-span-4 min-w-0">
                        <p className="text-foreground truncate">{rp.erpnext_name}</p>
                        {rp.reference_number && (
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                            Ref: {rp.reference_number}
                          </p>
                        )}
                      </div>
                      <div className="col-span-3 text-right tabular-nums text-foreground">
                        {fmt(rp.amount_paid)}
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`status-pill ${
                            DOCSTATUS_STYLES[rp.docstatus] ||
                            "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {DOCSTATUS_LABELS[rp.docstatus] || rp.docstatus}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <DeskLink url={rp.desk_url} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ))}

          {section === "disbursements" &&
            (loan.disbursements.length === 0 ? (
              <EmptySection
                icon={ArrowUpFromLine}
                title="No disbursements posted"
                hint="Use Disburse to post a payout against this loan."
              />
            ) : (
              <>
                <div className="grid grid-cols-12 gap-3 px-6 py-2.5 text-[11px] font-normal text-muted-foreground uppercase tracking-[0.06em] border-b border-border">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-4">Document</div>
                  <div className="col-span-3 text-right">Amount</div>
                  <div className="col-span-2">Status</div>
                  <div className="col-span-1"></div>
                </div>
                <div className="divide-y divide-border max-h-[calc(100vh-380px)] overflow-y-auto">
                  {loan.disbursements.map((db) => (
                    <div
                      key={db.id}
                      className="grid grid-cols-12 gap-3 px-6 py-3.5 items-center text-[13px] font-normal hover:bg-[var(--hover-row)] transition-colors"
                    >
                      <div className="col-span-2 text-muted-foreground tabular-nums">
                        {format(new Date(db.disbursement_date), "dd MMM yyyy")}
                      </div>
                      <div className="col-span-4 min-w-0">
                        <p className="text-foreground truncate">{db.erpnext_name}</p>
                        {db.reference_number && (
                          <p className="text-[12px] text-muted-foreground truncate mt-0.5">
                            Ref: {db.reference_number}
                          </p>
                        )}
                      </div>
                      <div className="col-span-3 text-right tabular-nums text-foreground">
                        {fmt(db.disbursed_amount)}
                      </div>
                      <div className="col-span-2">
                        <span
                          className={`status-pill ${
                            DOCSTATUS_STYLES[db.docstatus] ||
                            "bg-muted text-muted-foreground border-border"
                          }`}
                        >
                          {DOCSTATUS_LABELS[db.docstatus] || db.docstatus}
                        </span>
                      </div>
                      <div className="col-span-1 text-right">
                        <DeskLink url={db.desk_url} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ))}
        </ContentCard>
      </div>

      {repayOpen && (
        <PostDialog
          open={repayOpen}
          onOpenChange={setRepayOpen}
          title="Record repayment"
          description="Posts a Loan Repayment to your ERP; it allocates across penalty, interest and principal."
          dateLabel="Payment date"
          submitLabel="Post repayment"
          isPending={repayMutation.isPending}
          onSubmit={({ amount, date, reference }) =>
            repayMutation.mutate(
              { amount, posting_date: date || undefined, reference: reference || undefined },
              { onSuccess: () => setRepayOpen(false) }
            )
          }
        />
      )}
      {disburseOpen && (
        <PostDialog
          open={disburseOpen}
          onOpenChange={setDisburseOpen}
          title="Disburse loan"
          description="Posts a Loan Disbursement to your ERP against this loan."
          dateLabel="Disbursement date"
          submitLabel="Post disbursement"
          isPending={disburseMutation.isPending}
          defaultAmount={String(
            Math.max(0, parseFloat(loan.loan_amount) - parseFloat(loan.disbursed_amount)) || ""
          )}
          onSubmit={({ amount, date, reference }) =>
            disburseMutation.mutate(
              { amount, disbursement_date: date || undefined, reference: reference || undefined },
              { onSuccess: () => setDisburseOpen(false) }
            )
          }
        />
      )}
    </div>
  );
}
