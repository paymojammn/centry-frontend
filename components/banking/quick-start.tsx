"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

export function BankingQuickStart() {
  return (
    <Alert className="border-emerald-200 bg-emerald-50/50">
      <Lightbulb className="h-4 w-4 text-emerald-600" />
      <AlertTitle className="text-emerald-900">Quick Start: Test Bank Reconciliation</AlertTitle>
      <AlertDescription className="text-emerald-800 space-y-3">
        <p className="text-sm">Follow these steps to test the bank statement import and reconciliation workflow:</p>
        
        <ol className="text-sm space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              1
            </Badge>
            <div>
              <strong>Upload:</strong> Go to the <strong>Upload</strong> tab and upload a CAMT.053 bank statement file
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              2
            </Badge>
            <div>
              <strong>Review:</strong> Check the <strong>Transactions</strong> tab to see parsed transactions
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              3
            </Badge>
            <div>
              <strong>Sync:</strong> Go to <strong>Sync</strong> tab and click &quot;Bank → Xero&quot; to sync
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              4
            </Badge>
            <div>
              <strong>Verify:</strong> Transactions are created in Xero with <code className="bg-emerald-100 px-1 rounded">IsReconciled: false</code>
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-emerald-100 text-emerald-700 border-emerald-300">
              5
            </Badge>
            <div>
              <strong>Reconcile:</strong> Open Xero → Accounting → Bank Accounts → Reconcile to match transactions
            </div>
          </li>
        </ol>

        <div className="bg-white border border-emerald-200 rounded-md p-3 mt-3">
          <p className="text-xs text-emerald-900">
            <strong>Key Feature:</strong> All synced transactions appear as <strong>unreconciled</strong> in Xero, 
            allowing you to use the standard Xero reconciliation workflow to match them to invoices and bills.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
