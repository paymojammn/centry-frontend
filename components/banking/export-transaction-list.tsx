"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Search,
  Loader2,
  XCircle,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useExportPayments, useBankPaymentExports, type ExportPayment } from "@/hooks/use-banking";
import { format } from "date-fns";

interface ExportTransactionListProps {
  exportId?: number;
  organizationId?: string;
}

function formatCurrency(amount: string, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "KES",
  }).format(parseFloat(amount));
}

export function ExportTransactionList({ exportId, organizationId }: ExportTransactionListProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Get the selected export details
  const { data: exportsData } = useBankPaymentExports({ organizationId });
  const exports = exportsData?.results || [];
  const selectedExport = exports.find(exp => exp.id === exportId);

  // Get payments for the selected export
  const { data, isLoading, error } = useExportPayments(exportId);
  const payments = data?.results || [];

  // Filter payments by search term
  const filteredPayments = payments.filter((payment: ExportPayment) => {
    const matchesSearch =
      payment.beneficiary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.beneficiary_account?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case "completed":
      case "processed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700">
            <CheckCircle className="h-3 w-3" />
            {status}
          </span>
        );
      case "failed":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-50 text-orange-700">
            <XCircle className="h-3 w-3" />
            Failed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700">
            <Clock className="h-3 w-3" />
            {status || "Pending"}
          </span>
        );
    }
  };

  // No export selected state
  if (!exportId) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Payments</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <AlertCircle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">No export file selected</p>
          <p className="text-xs text-gray-400 mt-1">
            Select an export file from the SFTP Export tab to view its payments
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Payments</h3>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Payments</h3>
          </div>
        </div>
        <div className="text-center py-12">
          <XCircle className="h-8 w-8 text-orange-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Failed to load payments</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-medium text-gray-900">Payments</h3>
            <span className="text-xs text-gray-500">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} in export
            </span>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Selected Export Info */}
        {selectedExport && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 flex items-center gap-3">
            <FileText className="h-4 w-4 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">{selectedExport.file_name}</p>
              <p className="text-xs text-blue-600">
                {selectedExport.payment_count} payments · {formatCurrency(selectedExport.total_amount, selectedExport.currency)}
              </p>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search beneficiary, reference..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-gray-50 border-gray-200"
          />
        </div>

        {/* Table */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No payments found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Reference</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Beneficiary</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Bank</th>
                <th className="text-right text-xs font-medium text-gray-500 px-4 py-3">Amount</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Date</th>
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPayments.map((payment: ExportPayment) => (
                <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {payment.reference}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{payment.beneficiary_name}</p>
                      <p className="text-xs text-gray-500">{payment.beneficiary_account}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-600">{payment.beneficiary_bank}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-sm font-medium text-gray-900">
                      {formatCurrency(payment.amount, payment.currency)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-sm text-gray-500">
                      {payment.payment_date ? format(new Date(payment.payment_date), "MMM dd, yyyy") : "-"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {getStatusBadge(payment.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
