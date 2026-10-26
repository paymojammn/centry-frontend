"use client";

/**
 * Bank statement line awaiting reconciliation.
 *
 * The line itself is one grid row (table-professional) with its ERP state;
 * the matching workbench (Match / Create / Transfer / Discuss) opens in a
 * right-hand sheet so the list stays a list.
 */

import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Checkbox } from "@/components/ui/checkbox";
import { ContentCard } from "@/components/layout/content-card";
import { LoadingState } from "@/components/layout/loading-state";
import { EmptyState } from "@/components/layout/empty-state";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import {
  Search,
  CheckCircle2,
  XCircle,
  Loader2,
  Link2,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

interface Transaction {
  id: string;
  transaction_date: string;
  description: string;
  reference: string;
  amount: number;
  balance: number;
  transaction_type: "DEBIT" | "CREDIT";
  currency: string;
  counterparty_name: string;
  bank_name: string;
}

interface Match {
  id: string;
  type: string;
  reference: string;
  contact_name: string;
  date: string;
  amount: number;
  confidence: number;
  description: string;
}

interface BankReconciliationItemProps {
  transaction: Transaction;
  onUpdate: () => void;
  isMatched?: boolean;
  isReconciled?: boolean;
}

// Semantic status-pill tints (success / warning / danger / info / neutral).
const PILL = {
  success: "bg-success-500/10 text-success-700 border-success-500/20",
  warning: "bg-warning-500/10 text-warning-700 border-warning-500/20",
  danger: "bg-danger-500/10 text-danger-700 border-danger-500/20",
  info: "bg-info-500/10 text-info-700 border-info-500/20",
  neutral: "bg-muted text-muted-foreground border-border",
} as const;

/** ERP state of the line: Synced (reconciled) / Ready (matched) / Not synced. */
function LineStatus({ matched, reconciled }: { matched: boolean; reconciled: boolean }) {
  if (reconciled) return <span className={`status-pill ${PILL.success}`}>Synced</span>;
  if (matched) return <span className={`status-pill ${PILL.info}`}>Ready</span>;
  return <span className={`status-pill ${PILL.neutral}`}>Not synced</span>;
}

function ConfidencePill({ confidence }: { confidence: number }) {
  if (confidence >= 80) {
    return <span className={`status-pill ${PILL.success}`}>High confidence</span>;
  }
  if (confidence >= 50) {
    return <span className={`status-pill ${PILL.info}`}>Medium confidence</span>;
  }
  return <span className={`status-pill ${PILL.neutral}`}>Low confidence</span>;
}

function DateCell({ iso }: { iso: string | null | undefined }) {
  if (!iso) return <>—</>;
  const d = new Date(iso);
  return (
    <>
      {format(d, "dd MMM yyyy")}
      <span className="cell-sub">{format(d, "HH:mm")}</span>
    </>
  );
}

export function BankReconciliationItem({
  transaction,
  onUpdate,
  isMatched = false,
  isReconciled = false,
}: BankReconciliationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("match");
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAmount, setSearchAmount] = useState("");
  const [showUSDOnly, setShowUSDOnly] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [transferReference, setTransferReference] = useState("");

  // Create transaction form state
  const [contactName, setContactName] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [description, setDescription] = useState(transaction.description);

  // Fetch suggested matches
  const { data: matchesData, isLoading: matchesLoading } = useQuery<Match[]>({
    queryKey: ["transaction-matches", transaction.id],
    queryFn: () => api.get(`/api/v1/banking/transactions/${transaction.id}/suggest_matches/`),
    enabled: isExpanded && !isReconciled,
  });

  const matches = matchesData || [];

  // Match transaction mutation
  const matchMutation = useMutation({
    mutationFn: (data: { matched_to_id: string; matched_to_type: string }) =>
      api.post(`/api/v1/banking/transactions/${transaction.id}/match/`, data),
    onSuccess: () => {
      toast.success("Transaction matched successfully");
      setIsExpanded(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to match transaction");
    },
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: (data: any) =>
      api.post(`/api/v1/erp/transactions/`, data),
    onSuccess: () => {
      toast.success("Transaction created successfully");
      setIsExpanded(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to create transaction");
    },
  });

  // Unmatch mutation
  const unmatchMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/banking/transactions/${transaction.id}/unmatch/`),
    onSuccess: () => {
      toast.success("Transaction unmatched");
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to unmatch transaction");
    },
  });

  // Reconcile mutation
  const reconcileMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/v1/banking/transactions/bulk_sync_to_erp/`, {
        transaction_ids: [transaction.id],
      }),
    onSuccess: () => {
      toast.success("Transaction reconciled successfully");
      setIsExpanded(false);
      onUpdate();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to reconcile transaction");
    },
  });

  const handleMatchSelect = (matchId: string) => {
    // For single selection, replace the array
    setSelectedMatches([matchId]);
  };

  const handleOkClick = () => {
    if (selectedMatches.length === 0) {
      toast.error("Please select a match");
      return;
    }

    const selectedMatch = matches.find((m) => m.id === selectedMatches[0]);
    if (selectedMatch) {
      matchMutation.mutate({
        matched_to_id: selectedMatch.id,
        matched_to_type: selectedMatch.type,
      });
    }
  };

  const handleCreateTransaction = () => {
    if (!contactName || !accountCode) {
      toast.error("Please fill in all required fields");
      return;
    }

    createMutation.mutate({
      contact_name: contactName,
      account_code: accountCode,
      description: description,
      amount: transaction.amount,
      transaction_date: transaction.transaction_date,
      transaction_type: transaction.transaction_type,
    });
  };

  const handleReconcile = () => {
    reconcileMutation.mutate();
  };

  const handleUnmatch = () => {
    unmatchMutation.mutate();
  };

  const filteredMatches = matches.filter((match) => {
    if (
      searchQuery &&
      !match.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !match.reference.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }
    if (searchAmount && Math.abs(match.amount - parseFloat(searchAmount)) > 0.01) {
      return false;
    }
    return true;
  });

  const selectedTotal = selectedMatches.reduce((sum, id) => {
    const match = matches.find((m) => m.id === id);
    return sum + (match?.amount || 0);
  }, 0);

  const amountDifference = Math.abs(transaction.amount - selectedTotal);
  const isDebit = transaction.transaction_type === "DEBIT";
  const amountLabel = formatCurrency(transaction.amount, transaction.currency);

  return (
    <>
      {/* The line itself — one grid row */}
      <ContentCard noPadding>
        <div className="table-scroll-container">
          <table className="table-professional">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th className="cell-currency">Ccy</th>
                <th className="text-right">Spent</th>
                <th className="text-right">Received</th>
                <th>Status</th>
                <th className="text-right"></th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="cell-muted whitespace-nowrap">
                  <DateCell iso={transaction.transaction_date} />
                </td>
                <td className="cell-primary">
                  <span className="block truncate max-w-[280px]">{transaction.description}</span>
                  {transaction.counterparty_name && (
                    <span className="cell-sub truncate max-w-[280px]">{transaction.counterparty_name}</span>
                  )}
                </td>
                <td className="cell-currency">{transaction.currency}</td>
                <td className="cell-amount">
                  {isDebit ? formatCurrency(transaction.amount, transaction.currency) : ""}
                </td>
                <td className="cell-amount">
                  {!isDebit ? formatCurrency(transaction.amount, transaction.currency) : ""}
                </td>
                <td>
                  <LineStatus matched={isMatched} reconciled={isReconciled} />
                </td>
                <td>
                  <div className="flex items-center justify-end gap-1">
                    {!isReconciled && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-muted-foreground hover:text-primary"
                        onClick={() => setIsExpanded(true)}
                        title={isMatched ? "Review the match and reconcile" : "Find a matching ERP document"}
                      >
                        <Link2 className="h-3.5 w-3.5 mr-1" />
                        {isMatched ? "Reconcile" : "Match"}
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </ContentCard>

      {/* Matching workbench — right-hand sheet */}
      <Sheet open={isExpanded} onOpenChange={setIsExpanded}>
        <SheetContent className="w-full sm:w-[640px] sm:max-w-none p-0 gap-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 pr-14 border-b border-border">
            <div className="flex items-center gap-2 min-w-0">
              <SheetTitle className="truncate">{transaction.description}</SheetTitle>
              <LineStatus matched={isMatched} reconciled={isReconciled} />
            </div>
            <SheetDescription>
              {format(new Date(transaction.transaction_date), "dd MMM yyyy")}
              {transaction.counterparty_name && ` · ${transaction.counterparty_name}`}
              {` · ${isDebit ? "Spent" : "Received"} ${amountLabel}`}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="match">Match</TabsTrigger>
                <TabsTrigger value="create">Create</TabsTrigger>
                <TabsTrigger value="transfer">Transfer</TabsTrigger>
                <TabsTrigger value="discuss">Discuss</TabsTrigger>
              </TabsList>

              {/* Match Tab */}
              <TabsContent value="match" className="space-y-4">
                {isMatched ? (
                  <ContentCard variant="outlined" className="p-4 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">Transaction matched</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        This transaction is ready to be reconciled
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUnmatch}
                        disabled={unmatchMutation.isPending}
                      >
                        {unmatchMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Unmatch
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={handleReconcile}
                        disabled={reconcileMutation.isPending}
                      >
                        {reconcileMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Reconcile
                      </Button>
                    </div>
                  </ContentCard>
                ) : (
                  <>
                    {/* Search filters */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                        <Input
                          placeholder="Search by name or reference"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 h-9"
                        />
                      </div>
                      <Input
                        placeholder="Amount"
                        type="number"
                        step="0.01"
                        value={searchAmount}
                        onChange={(e) => setSearchAmount(e.target.value)}
                        className="h-9 w-[130px]"
                        aria-label="Search by amount"
                      />
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id={`show-ccy-${transaction.id}`}
                          checked={showUSDOnly}
                          onCheckedChange={(checked) => setShowUSDOnly(checked as boolean)}
                        />
                        <Label htmlFor={`show-ccy-${transaction.id}`} className="text-xs text-muted-foreground">
                          {transaction.currency} only
                        </Label>
                      </div>
                      {(searchQuery || searchAmount) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery("");
                            setSearchAmount("");
                          }}
                          className="h-9 text-muted-foreground"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Clear
                        </Button>
                      )}
                    </div>

                    {/* Suggested matches */}
                    <ContentCard noPadding variant="outlined">
                      {matchesLoading ? (
                        <LoadingState />
                      ) : filteredMatches.length === 0 ? (
                        <EmptyState
                          icon={Search}
                          title="No matching transactions found"
                          description={
                            searchQuery || searchAmount
                              ? "Try a different name, reference or amount"
                              : "Create a transaction or record a transfer instead"
                          }
                        />
                      ) : (
                        <div className="table-scroll-container">
                          <table className="table-professional">
                            <thead>
                              <tr>
                                <th className="w-10" />
                                <th>Date</th>
                                <th>Name</th>
                                <th>Reference</th>
                                <th className="text-right">Spent</th>
                                <th className="text-right">Received</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredMatches.map((match) => {
                                const checked = selectedMatches.includes(match.id);
                                return (
                                  <tr
                                    key={match.id}
                                    className={`cursor-pointer ${checked ? "is-selected" : ""}`}
                                    onClick={() => handleMatchSelect(match.id)}
                                  >
                                    <td>
                                      <Checkbox
                                        checked={checked}
                                        onCheckedChange={() => handleMatchSelect(match.id)}
                                        aria-label="Select match"
                                      />
                                    </td>
                                    <td className="cell-muted whitespace-nowrap">
                                      {format(new Date(match.date), "dd MMM yyyy")}
                                    </td>
                                    <td className="cell-primary">
                                      <span className="block truncate max-w-[180px]">{match.contact_name}</span>
                                      {match.confidence ? (
                                        <span className="cell-sub">
                                          <ConfidencePill confidence={match.confidence} />
                                        </span>
                                      ) : null}
                                    </td>
                                    <td className="cell-muted">
                                      <span className="block truncate max-w-[140px]">{match.reference}</span>
                                    </td>
                                    <td className="cell-amount">
                                      {match.type === "bill" || isDebit
                                        ? formatCurrency(match.amount, transaction.currency)
                                        : ""}
                                    </td>
                                    <td className="cell-amount">
                                      {match.type === "invoice" || !isDebit
                                        ? formatCurrency(match.amount, transaction.currency)
                                        : ""}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </ContentCard>

                    {/* Match summary */}
                    {selectedMatches.length > 0 && (
                      <ContentCard variant="outlined" className="p-4 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            Must match money {isDebit ? "spent" : "received"}
                          </span>
                          <span className="text-sm font-medium text-foreground tabular-nums">{amountLabel}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Selected</span>
                          <span className="text-sm font-medium text-foreground tabular-nums">
                            {formatCurrency(selectedTotal, transaction.currency)}
                          </span>
                        </div>
                        {amountDifference > 0.01 ? (
                          <p className="text-sm text-danger-700 flex items-center gap-1 justify-end">
                            <XCircle className="h-4 w-4" />
                            Total is out by {formatCurrency(amountDifference, transaction.currency)}
                          </p>
                        ) : (
                          <p className="text-sm text-success-700 flex items-center gap-1 justify-end">
                            <CheckCircle2 className="h-4 w-4" />
                            Amounts match
                          </p>
                        )}
                      </ContentCard>
                    )}
                  </>
                )}
              </TabsContent>

              {/* Create Tab */}
              <TabsContent value="create" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor={`who-${transaction.id}`}>Who</Label>
                    <Input
                      id={`who-${transaction.id}`}
                      placeholder="Name of the contact..."
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`what-${transaction.id}`}>What</Label>
                    <Select value={accountCode} onValueChange={setAccountCode}>
                      <SelectTrigger id={`what-${transaction.id}`}>
                        <SelectValue placeholder="Choose the account..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="200">Accounts Payable</SelectItem>
                        <SelectItem value="400">Revenue</SelectItem>
                        <SelectItem value="500">Expenses</SelectItem>
                        <SelectItem value="600">Cost of Goods Sold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`why-${transaction.id}`}>Why</Label>
                  <Input
                    id={`why-${transaction.id}`}
                    placeholder="Enter a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Transfer Tab */}
              <TabsContent value="transfer" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`bank-account-${transaction.id}`}>Select a bank account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger id={`bank-account-${transaction.id}`}>
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Business Savings Account</SelectItem>
                      <SelectItem value="checking">Business Checking Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`reference-${transaction.id}`}>Reference</Label>
                  <Input
                    id={`reference-${transaction.id}`}
                    placeholder="Enter reference..."
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                  />
                </div>
              </TabsContent>

              {/* Discuss Tab */}
              <TabsContent value="discuss">
                <EmptyState
                  icon={MessageSquare}
                  title="Discussion coming soon"
                  description="Leave notes on a transaction for your team"
                />
              </TabsContent>
            </Tabs>
          </div>

          <SheetFooter className="px-6 py-3 border-t border-border flex-row justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsExpanded(false)}>
              Cancel
            </Button>
            {activeTab === "match" && !isMatched && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleOkClick}
                disabled={selectedMatches.length === 0 || matchMutation.isPending}
              >
                {matchMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Match
              </Button>
            )}
            {activeTab === "create" && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateTransaction}
                disabled={!contactName || !accountCode || createMutation.isPending}
              >
                {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                Create
              </Button>
            )}
            {activeTab === "transfer" && (
              <Button variant="primary" size="sm" disabled={!selectedBankAccount}>
                Transfer
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
