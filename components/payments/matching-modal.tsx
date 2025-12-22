"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  TrendingUp,
  Calendar,
  User,
  FileText,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";

interface Transaction {
  id: number;
  description: string;
  amount: number;
  credit_amount: number | null;
  debit_amount: number | null;
  currency: string;
  transaction_date: string;
  transaction_type: string;
  counterparty_name: string;
}

interface Match {
  type: string;
  id: string;
  reference: string;
  contact_name: string;
  amount: number;
  currency: string;
  date: string;
  confidence: number;
  amount_due: number;
}

interface MatchingModalProps {
  transaction: Transaction;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MatchingModal({
  transaction,
  open,
  onClose,
  onSuccess,
}: MatchingModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const queryClient = useQueryClient();

  const { data: matches, isLoading } = useQuery<{ matches: Match[] }>({
    queryKey: ["suggest-matches", transaction.id],
    queryFn: async () => {
      const response = await api.get<{ matches: Match[] }>(
        `/api/v1/banking/transactions/${transaction.id}/suggest-matches/`
      );
      return response;
    },
    enabled: open,
  });

  const applyMatchMutation = useMutation({
    mutationFn: async (match: Match) => {
      const amount = transaction.credit_amount || transaction.debit_amount || 0;
      await api.post(
        `/api/v1/banking/transactions/${transaction.id}/match/`,
        {
          match_type: match.type,
          match_id: match.id,
          amount: amount,
        }
      );
    },
    onSuccess: () => {
      toast.success("Match applied successfully!");
      queryClient.invalidateQueries({ queryKey: ["unmatched-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["reconciliation-summary"] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to apply match");
    },
  });

  const filteredMatches =
    matches?.matches?.filter(
      (match) =>
        match.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.contact_name.toLowerCase().includes(searchQuery.toLowerCase())
    ) || [];

  const transactionAmount = transaction.credit_amount || transaction.debit_amount || 0;

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600 bg-green-50";
    if (confidence >= 0.6) return "text-[#638C80] bg-[#638C80]/10";
    if (confidence >= 0.4) return "text-orange-600 bg-orange-50";
    return "text-gray-600 bg-gray-50";
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.6) return "Medium";
    if (confidence >= 0.4) return "Low";
    return "Very Low";
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Match Transaction</DialogTitle>
          <DialogDescription>
            Find and select the best match for this transaction
          </DialogDescription>
        </DialogHeader>

        {/* Transaction Info */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h3 className="font-semibold text-black text-lg">
                {transaction.description}
              </h3>
              {transaction.counterparty_name && (
                <p className="text-sm text-gray-600 mt-1">
                  {transaction.counterparty_name}
                </p>
              )}
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-bold ${
                  transaction.transaction_type === "CREDIT"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {transaction.transaction_type === "CREDIT" ? "+" : "-"}
                {formatCurrency(transactionAmount, transaction.currency)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5" />
              {format(new Date(transaction.transaction_date), "MMM dd, yyyy")}
            </div>
            <Badge variant="outline" className="text-xs">
              {transaction.transaction_type === "CREDIT" ? "Money In" : "Money Out"}
            </Badge>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            placeholder="Search invoices or bills..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Matches List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#638C80]" />
            </div>
          ) : filteredMatches.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-gray-300 rounded-lg">
              <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No matches found
              </h3>
              <p className="text-gray-500 text-sm">
                {searchQuery
                  ? "Try a different search term"
                  : "No potential matches for this transaction"}
              </p>
            </div>
          ) : (
            filteredMatches.map((match) => {
              const confidencePercent = Math.round(match.confidence * 100);
              const isSelected = selectedMatch?.id === match.id;

              return (
                <button
                  key={`${match.type}-${match.id}`}
                  onClick={() => setSelectedMatch(match)}
                  className={`w-full p-4 border rounded-lg text-left transition-all duration-200 ${
                    isSelected
                      ? "border-[#638C80] bg-[#638C80]/5 shadow-md"
                      : "border-gray-200 hover:border-[#638C80]/30 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Match Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <FileText className="h-5 w-5 text-[#638C80] flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-black truncate">
                            {match.reference}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <User className="h-3.5 w-3.5 text-gray-400" />
                            <span className="text-sm text-gray-600 truncate">
                              {match.contact_name}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600">
                          <Calendar className="h-3.5 w-3.5" />
                          {format(new Date(match.date), "MMM dd, yyyy")}
                        </div>
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                        >
                          {match.type}
                        </Badge>
                        <Badge
                          className={`text-xs font-semibold ${getConfidenceColor(
                            match.confidence
                          )}`}
                        >
                          {getConfidenceLabel(match.confidence)} ({confidencePercent}%)
                        </Badge>
                      </div>
                    </div>

                    {/* Right: Amounts */}
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg font-bold text-black">
                        {formatCurrency(match.amount, match.currency)}
                      </div>
                      {match.amount_due !== match.amount && (
                        <div className="text-sm text-gray-500 mt-1">
                          Due: {formatCurrency(match.amount_due, match.currency)}
                        </div>
                      )}
                      {isSelected && (
                        <CheckCircle2 className="h-5 w-5 text-[#638C80] mt-2 ml-auto" />
                      )}
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-3 w-full bg-gray-100 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        match.confidence >= 0.8
                          ? "bg-green-600"
                          : match.confidence >= 0.6
                          ? "bg-[#638C80]"
                          : match.confidence >= 0.4
                          ? "bg-orange-500"
                          : "bg-gray-400"
                      }`}
                      style={{ width: `${confidencePercent}%` }}
                    />
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={applyMatchMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={() => selectedMatch && applyMatchMutation.mutate(selectedMatch)}
            disabled={!selectedMatch || applyMatchMutation.isPending}
            className="bg-[#638C80] hover:bg-[#4f7068] text-white"
          >
            {applyMatchMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Applying...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Apply Match
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
