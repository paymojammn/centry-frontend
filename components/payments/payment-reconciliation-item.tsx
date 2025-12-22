"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { 
  ChevronDown, 
  ChevronUp,
  CheckCircle2,
  XCircle
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
  counterparty_phone: string;
  source_type: string;
  source_provider: string;
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

interface PaymentReconciliationItemProps {
  transaction: Transaction;
  onUpdate: () => void;
  isMatched?: boolean;
  isReconciled?: boolean;
}

export function PaymentReconciliationItem({ 
  transaction, 
  onUpdate,
  isMatched = false,
  isReconciled = false
}: PaymentReconciliationItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("match");
  const [selectedMatches, setSelectedMatches] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchAmount, setSearchAmount] = useState("");
  const [showCurrencyOnly, setShowCurrencyOnly] = useState(true);
  const [selectedBankAccount, setSelectedBankAccount] = useState("");
  const [transferReference, setTransferReference] = useState("");
  
  // Create transaction form state
  const [contactName, setContactName] = useState("");
  const [accountCode, setAccountCode] = useState("");
  const [description, setDescription] = useState(transaction.description);
  const [region, setRegion] = useState("");
  const [taxRate, setTaxRate] = useState("");

  const queryClient = useQueryClient();

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
        transaction_ids: [transaction.id]
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
    setSelectedMatches([matchId]);
  };

  const handleOkClick = () => {
    if (selectedMatches.length === 0) {
      toast.error("Please select a match");
      return;
    }

    const selectedMatch = matches.find(m => m.id === selectedMatches[0]);
    if (selectedMatch) {
      matchMutation.mutate({
        matched_to_id: selectedMatch.id,
        matched_to_type: selectedMatch.type
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

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) {
      return <Badge className="bg-green-100 text-green-800 text-xs">High confidence</Badge>;
    } else if (confidence >= 50) {
      return <Badge className="bg-blue-100 text-blue-800 text-xs">Medium confidence</Badge>;
    }
    return <Badge className="bg-gray-100 text-gray-800 text-xs">Low confidence</Badge>;
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "mobile_money":
        return "📱";
      case "credit_card":
        return "💳";
      case "bank":
        return "🏦";
      case "payment_gateway":
        return "🌐";
      default:
        return "💰";
    }
  };

  const filteredMatches = matches.filter(match => {
    if (searchQuery && !match.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !match.reference.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    if (searchAmount && Math.abs(match.amount - parseFloat(searchAmount)) > 0.01) {
      return false;
    }
    return true;
  });

  const selectedTotal = selectedMatches.reduce((sum, id) => {
    const match = matches.find(m => m.id === id);
    return sum + (match?.amount || 0);
  }, 0);

  const amountDifference = Math.abs(transaction.amount - selectedTotal);

  return (
    <Card className="border-gray-200 overflow-hidden">
      {/* Transaction Header */}
      <div className="bg-gray-50 p-4 flex items-center justify-between border-b">
        <div className="flex items-center gap-4 flex-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-0 h-auto hover:bg-transparent"
          >
            {isExpanded ? (
              <ChevronUp className="h-5 w-5 text-[#638C80]" />
            ) : (
              <ChevronDown className="h-5 w-5 text-[#638C80]" />
            )}
          </Button>

          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-900">
                {format(new Date(transaction.transaction_date), "dd MMM yyyy")}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getSourceIcon(transaction.source_type)}</span>
                  <div>
                    <div className="font-medium text-gray-900">{transaction.description}</div>
                    <div className="text-sm text-gray-600">
                      {transaction.counterparty_name || transaction.source_provider || transaction.bank_name}
                      {transaction.counterparty_phone && ` • ${transaction.counterparty_phone}`}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right min-w-[100px]">
              <div className="text-sm font-medium text-gray-600">Spent</div>
              {transaction.transaction_type === "DEBIT" && (
                <div className="font-semibold text-gray-900">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </div>
              )}
            </div>
            <div className="text-right min-w-[100px]">
              <div className="text-sm font-medium text-gray-600">Received</div>
              {transaction.transaction_type === "CREDIT" && (
                <div className="font-semibold text-gray-900">
                  {formatCurrency(transaction.amount, transaction.currency)}
                </div>
              )}
            </div>
          </div>

          {!isExpanded && !isReconciled && (
            <Button
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="bg-[#638C80] hover:bg-[#638C80]/90 text-white"
            >
              OK
            </Button>
          )}

          {isReconciled && (
            <Badge className="bg-[#638C80]/20 text-[#638C80]">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Reconciled
            </Badge>
          )}
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-6 bg-white">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-gray-600">
              Options <ChevronDown className="h-4 w-4 inline ml-1" />
            </div>
            <div className="text-sm text-[#638C80] font-medium cursor-pointer hover:underline">
              Find & Match
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-4 bg-gray-100">
              <TabsTrigger value="match">Match</TabsTrigger>
              <TabsTrigger value="create">Create</TabsTrigger>
              <TabsTrigger value="transfer">Transfer</TabsTrigger>
              <TabsTrigger value="discuss">Discuss</TabsTrigger>
            </TabsList>

            {/* Match Tab */}
            <TabsContent value="match" className="space-y-4">
              {isMatched ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-green-900">Transaction Matched</h4>
                      <p className="text-sm text-green-700 mt-1">
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
                        Unmatch
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleReconcile}
                        disabled={reconcileMutation.isPending}
                        className="bg-[#638C80] hover:bg-[#638C80]/90 text-white"
                      >
                        {reconcileMutation.isPending ? "Reconciling..." : "Reconcile"}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-center py-4 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">Find & select matching transactions below</p>
                  </div>

                  {/* Search section */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="show-currency"
                        checked={showCurrencyOnly}
                        onCheckedChange={(checked) => setShowCurrencyOnly(checked as boolean)}
                      />
                      <Label htmlFor="show-currency" className="text-sm">
                        Show {transaction.currency} items only
                      </Label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="Search by name or reference"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Search by amount"
                        type="number"
                        step="0.01"
                        value={searchAmount}
                        onChange={(e) => setSearchAmount(e.target.value)}
                        className="w-[150px]"
                      />
                      <Button size="sm" className="bg-[#638C80] hover:bg-[#638C80]/90 text-white">
                        Go
                      </Button>
                      <Button
                        size="sm"
                        variant="link"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchAmount("");
                        }}
                        className="text-[#638C80]"
                      >
                        Clear search
                      </Button>
                    </div>
                  </div>

                  {/* Matches Table */}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b">
                        <tr>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Date</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Name</th>
                          <th className="text-left p-3 text-sm font-medium text-gray-700">Reference</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-700">Spent</th>
                          <th className="text-right p-3 text-sm font-medium text-gray-700">Received</th>
                        </tr>
                      </thead>
                      <tbody>
                        {matchesLoading ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">
                              Loading matches...
                            </td>
                          </tr>
                        ) : filteredMatches.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="text-center py-8 text-gray-500">
                              No matching transactions found
                            </td>
                          </tr>
                        ) : (
                          filteredMatches.map((match) => (
                            <tr
                              key={match.id}
                              className={`border-b hover:bg-gray-50 cursor-pointer ${
                                selectedMatches.includes(match.id) ? "bg-green-50" : ""
                              }`}
                              onClick={() => handleMatchSelect(match.id)}
                            >
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedMatches.includes(match.id)}
                                    onCheckedChange={() => handleMatchSelect(match.id)}
                                  />
                                  <span className="text-sm">
                                    {format(new Date(match.date), "dd MMM yyyy")}
                                  </span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div>
                                  <div className="text-sm font-medium text-[#638C80] hover:underline">
                                    {match.contact_name}
                                  </div>
                                  {match.confidence && (
                                    <div className="mt-1">{getConfidenceBadge(match.confidence)}</div>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 text-sm">{match.reference}</td>
                              <td className="p-3 text-right text-sm font-medium">
                                {match.type === "bill" || transaction.transaction_type === "DEBIT"
                                  ? formatCurrency(match.amount, transaction.currency)
                                  : ""}
                              </td>
                              <td className="p-3 text-right text-sm font-medium">
                                {match.type === "invoice" || transaction.transaction_type === "CREDIT"
                                  ? formatCurrency(match.amount, transaction.currency)
                                  : ""}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Match Summary */}
                  {selectedMatches.length > 0 && (
                    <div className="bg-gray-50 border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">
                          Must match money {transaction.transaction_type === "DEBIT" ? "spent" : "received"}:
                        </span>
                        <span className="font-semibold">
                          {transaction.currency} {transaction.amount.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{transaction.currency} 0.00</span>
                        {amountDifference > 0.01 ? (
                          <span className="text-sm text-red-600 flex items-center gap-1">
                            <XCircle className="h-4 w-4" />
                            Total is out by: {amountDifference.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-sm text-green-600 flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" />
                            Amounts match
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Create Tab */}
            <TabsContent value="create" className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="who">Who</Label>
                    <Input
                      id="who"
                      placeholder="Name of the contact..."
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="what">What</Label>
                    <Select value={accountCode} onValueChange={setAccountCode}>
                      <SelectTrigger>
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
                  <Label htmlFor="why">Why</Label>
                  <Textarea
                    id="why"
                    placeholder="Enter a description..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Select value={region} onValueChange={setRegion}>
                      <SelectTrigger>
                        <SelectValue placeholder="Region" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ug">Uganda</SelectItem>
                        <SelectItem value="ke">Kenya</SelectItem>
                        <SelectItem value="tz">Tanzania</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Select value={taxRate} onValueChange={setTaxRate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Tax Rate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0">0% - No VAT</SelectItem>
                        <SelectItem value="18">18% - Standard VAT</SelectItem>
                        <SelectItem value="12">12% - Reduced VAT</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="text-right">
                  <Button variant="link" className="text-[#638C80] text-sm">
                    Add details
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Transfer Tab */}
            <TabsContent value="transfer" className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="bank-account">Select a bank account</Label>
                  <Select value={selectedBankAccount} onValueChange={setSelectedBankAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="savings">Business Savings Account</SelectItem>
                      <SelectItem value="checking">Business Checking Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Reference</Label>
                  <Input
                    id="reference"
                    placeholder="Enter reference..."
                    value={transferReference}
                    onChange={(e) => setTransferReference(e.target.value)}
                  />
                </div>
              </div>
            </TabsContent>

            {/* Discuss Tab */}
            <TabsContent value="discuss" className="space-y-4">
              <div className="text-center py-8 text-gray-500">
                <p>Discussion feature coming soon...</p>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 mt-6 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => setIsExpanded(false)}
            >
              Cancel
            </Button>
            {activeTab === "match" && !isMatched && (
              <Button
                onClick={handleOkClick}
                disabled={selectedMatches.length === 0 || matchMutation.isPending}
                className="bg-[#638C80] hover:bg-[#638C80]/90 text-white"
              >
                {matchMutation.isPending ? "Matching..." : "OK"}
              </Button>
            )}
            {activeTab === "create" && (
              <Button
                onClick={handleCreateTransaction}
                disabled={!contactName || !accountCode || createMutation.isPending}
                className="bg-[#638C80] hover:bg-[#638C80]/90 text-white"
              >
                {createMutation.isPending ? "Creating..." : "Create"}
              </Button>
            )}
            {activeTab === "transfer" && (
              <Button
                disabled={!selectedBankAccount}
                className="bg-[#638C80] hover:bg-[#638C80]/90 text-white"
              >
                Transfer
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}
