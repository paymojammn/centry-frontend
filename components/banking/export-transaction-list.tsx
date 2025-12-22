"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  XCircle,
  FileText,
  CheckCircle,
  Clock,
  AlertCircle,
  User,
  Building2
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
          <Badge variant="success">
            <CheckCircle className="mr-1 h-3 w-3" />
            {status}
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <XCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <Clock className="mr-1 h-3 w-3" />
            {status || "Pending"}
          </Badge>
        );
    }
  };

  // No export selected state
  if (!exportId) {
    return (
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#638C80]" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">Payments</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-16">
            <div className="p-4 bg-amber-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-amber-500" />
            </div>
            <p className="text-sm font-medium text-gray-500">No export file selected</p>
            <p className="text-xs text-gray-400 mt-1">
              Select an export file from the SFTP Export tab to view its payments
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#638C80]" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">Payments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
              <FileText className="h-5 w-5 text-[#638C80]" />
            </div>
            <CardTitle className="text-xl font-semibold text-gray-900">Payments</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-red-500">
            <XCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="text-sm">Failed to load payments</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-lg rounded-2xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#638C80]/10 rounded-xl">
            <FileText className="h-5 w-5 text-[#638C80]" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold text-gray-900">Payments</CardTitle>
            <CardDescription className="mt-0.5">
              {filteredPayments.length} payment{filteredPayments.length !== 1 ? 's' : ''} in export
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-6">
        {/* Selected Export Info */}
        {selectedExport && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-4 w-4 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-blue-800">{selectedExport.file_name}</p>
                <p className="text-sm text-blue-600">
                  {selectedExport.payment_count} payments • {formatCurrency(selectedExport.total_amount, selectedExport.currency)}
                </p>
              </div>
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
            className="pl-10 h-11 bg-gray-50 border-gray-200 rounded-xl shadow-sm transition-all focus:bg-white focus:border-[#638C80] focus:ring-2 focus:ring-[#638C80]/20"
          />
        </div>

        {/* Table */}
        {filteredPayments.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="p-4 bg-gray-50 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <FileText className="h-8 w-8 text-gray-300" />
            </div>
            <p className="text-sm font-medium text-gray-500">No payments found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search</p>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-100 overflow-hidden bg-white">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80 border-b border-gray-100">
                  <TableHead className="font-semibold text-gray-600">Reference</TableHead>
                  <TableHead className="font-semibold text-gray-600">Beneficiary</TableHead>
                  <TableHead className="font-semibold text-gray-600">Bank</TableHead>
                  <TableHead className="text-right font-semibold text-gray-600">Amount</TableHead>
                  <TableHead className="font-semibold text-gray-600">Date</TableHead>
                  <TableHead className="font-semibold text-gray-600">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.map((payment: ExportPayment, index) => (
                  <TableRow
                    key={payment.id}
                    className={`border-b border-gray-50 last:border-0 hover:bg-[#638C80]/5 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    }`}
                  >
                    <TableCell className="font-medium">
                      <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
                        {payment.reference}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-gray-100 rounded-lg">
                          <User className="h-3.5 w-3.5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">{payment.beneficiary_name}</p>
                          <p className="text-xs text-gray-500">{payment.beneficiary_account}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-gray-400" />
                        <span className="text-sm text-gray-600">{payment.beneficiary_bank}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-gray-800">
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-500">
                        {payment.payment_date ? format(new Date(payment.payment_date), "MMM dd, yyyy") : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(payment.status)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
