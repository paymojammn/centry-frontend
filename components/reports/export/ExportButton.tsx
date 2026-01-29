"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useExportReport } from "@/hooks/use-reports";
import type { ExportParams } from "@/types/reports";
import { toast } from "sonner";

interface ExportButtonProps {
  organizationId: string;
  reportType: "expenses" | "transactions" | "financial";
  startDate?: string;
  endDate?: string;
}

export function ExportButton({
  organizationId,
  reportType,
  startDate,
  endDate,
}: ExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);
  const exportMutation = useExportReport();

  const handleExport = async (format: "csv" | "excel" | "pdf") => {
    setIsExporting(true);
    
    const params: ExportParams = {
      organization: organizationId,
      report_type: reportType,
      format,
      start_date: startDate,
      end_date: endDate,
    };

    try {
      await exportMutation.mutateAsync(params);
      toast.success("Report exported successfully!");
    } catch (error) {
      console.error("Export failed:", error);
      toast.error("Failed to export report. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Exporting..." : "Export"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleExport("csv")}>
          <FileText className="mr-2 h-4 w-4" />
          Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport("excel")}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export as Excel
        </DropdownMenuItem>
        {reportType === "financial" && (
          <DropdownMenuItem onClick={() => handleExport("pdf")}>
            <File className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
