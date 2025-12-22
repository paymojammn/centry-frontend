"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, ExternalLink, Info, ListChecks } from "lucide-react";

interface ReconciliationInfoProps {
  hasSyncedTransactions?: boolean;
}

export function ReconciliationInfo({ hasSyncedTransactions = false }: ReconciliationInfoProps) {
  return (
    <Card className="border-blue-200 bg-blue-50/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-blue-900">
          <ListChecks className="h-5 w-5" />
          Bank Reconciliation Workflow
        </CardTitle>
        <CardDescription className="text-blue-700">
          How transactions appear in Xero for reconciliation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Important Note about Statement Lines */}
        <Alert className="border-orange-300 bg-orange-50">
          <Info className="h-4 w-4 text-orange-600" />
          <AlertTitle className="text-orange-900">Important: Statement Import vs Transactions</AlertTitle>
          <AlertDescription className="text-orange-800 space-y-2">
            <p className="text-sm"><strong>Two ways to import to Xero:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>
                <strong>&quot;Bank → Xero&quot; Sync:</strong> Creates transactions in Xero (increases account transaction count)
              </li>
              <li>
                <strong>&quot;Export CSV&quot;:</strong> Creates statement lines that await reconciliation (recommended for reconciliation workflow)
              </li>
            </ul>
            <p className="text-sm font-medium mt-2">For true statement import, use the CSV export method below.</p>
          </AlertDescription>
        </Alert>

        {/* How it works */}
        <Alert className="border-blue-300 bg-white">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertTitle className="text-blue-900">How Transactions Are Synced</AlertTitle>
          <AlertDescription className="text-blue-800 space-y-2">
            <p>When you sync bank statements to Xero, transactions are created with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>
                <Badge variant="outline" className="mr-2 border-green-300 bg-green-50 text-green-700">
                  CREDIT
                </Badge>
                → Type: <strong>RECEIVE</strong> (money in)
              </li>
              <li>
                <Badge variant="outline" className="mr-2 border-red-300 bg-red-50 text-red-700">
                  DEBIT
                </Badge>
                → Type: <strong>SPEND</strong> (money out)
              </li>
              <li>
                <Badge variant="outline" className="mr-2 border-yellow-300 bg-yellow-50 text-yellow-700">
                  IsReconciled
                </Badge>
                → <strong>false</strong> (ready to match)
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Steps to verify */}
        <div className="space-y-3">
          <h4 className="font-semibold text-blue-900 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Verify in Xero (5 Steps)
          </h4>
          
          <ol className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Log in to your <strong>Xero account</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Go to <strong>Accounting → Bank Accounts</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Click on your <strong>bank account</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Click the <strong>&quot;Reconcile&quot;</strong> tab</span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                5
              </span>
              <span>You should see your imported transactions as <strong>unreconciled</strong></span>
            </li>
          </ol>
        </div>

        {/* What you can do */}
        <div className="rounded-lg border border-blue-200 bg-white p-4 space-y-2">
          <h4 className="font-semibold text-blue-900">In Xero&apos;s Reconciliation Screen:</h4>
          <ul className="text-sm text-blue-800 space-y-1 ml-4 list-disc">
            <li>Match transactions to existing invoices or bills</li>
            <li>Create new spend/receive money entries</li>
            <li>Split transactions across multiple accounts</li>
            <li>Add notes and attachments</li>
          </ul>
        </div>

        {/* Action button */}
        {hasSyncedTransactions && (
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            onClick={() => window.open('https://go.xero.com/Bank/BankAccounts.aspx', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Xero Bank Accounts
          </Button>
        )}

        {/* Documentation link */}
        <div className="text-xs text-blue-600 text-center pt-2 border-t border-blue-200">
          <a 
            href="https://central.xero.com/s/article/Reconcile-bank-accounts" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline inline-flex items-center gap-1"
          >
            Learn more about reconciliation in Xero
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
