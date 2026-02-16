"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Lightbulb } from "lucide-react";

export function BankingQuickStart() {
  return (
    <Alert className="border-primary/20 bg-primary/5/50">
      <Lightbulb className="h-4 w-4 text-primary" />
      <AlertTitle className="text-primary">Quick Start: Test Bank Reconciliation</AlertTitle>
      <AlertDescription className="text-primary space-y-3">
        <p className="text-sm">Follow these steps to test the bank statement import and reconciliation workflow:</p>
        
        <ol className="text-sm space-y-2 ml-4">
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
              1
            </Badge>
            <div>
              <strong>Upload:</strong> Go to the <strong>Upload</strong> tab and upload a CAMT.053 bank statement file
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
              2
            </Badge>
            <div>
              <strong>Review:</strong> Check the <strong>Transactions</strong> tab to see parsed transactions
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
              3
            </Badge>
            <div>
              <strong>Sync:</strong> Go to <strong>Sync</strong> tab and click &quot;Bank → Xero&quot; to sync
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
              4
            </Badge>
            <div>
              <strong>Verify:</strong> Transactions are created in Xero with <code className="bg-primary/10 px-1 rounded">IsReconciled: false</code>
            </div>
          </li>
          
          <li className="flex items-start gap-2">
            <Badge variant="outline" className="flex-shrink-0 mt-0.5 bg-primary/10 text-primary border-primary/20">
              5
            </Badge>
            <div>
              <strong>Reconcile:</strong> Open Xero → Accounting → Bank Accounts → Reconcile to match transactions
            </div>
          </li>
        </ol>

        <div className="bg-card border border-primary/20 rounded-md p-3 mt-3">
          <p className="text-xs text-primary">
            <strong>Key Feature:</strong> All synced transactions appear as <strong>unreconciled</strong> in Xero, 
            allowing you to use the standard Xero reconciliation workflow to match them to invoices and bills.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}
