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
    <Card className="border-info/20 bg-info/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-info">
          <ListChecks className="h-5 w-5" />
          Bank Reconciliation Workflow
        </CardTitle>
        <CardDescription className="text-info">
          How transactions appear in Xero for reconciliation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Important Note about Statement Lines */}
        <Alert className="border-ochre/30 bg-ochre/10">
          <Info className="h-4 w-4 text-ochre" />
          <AlertTitle className="text-ochre">Important: Statement Import vs Transactions</AlertTitle>
          <AlertDescription className="text-ochre space-y-2">
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
        <Alert className="border-info/30 bg-card">
          <Info className="h-4 w-4 text-info" />
          <AlertTitle className="text-info">How Transactions Are Synced</AlertTitle>
          <AlertDescription className="text-info space-y-2">
            <p>When you sync bank statements to Xero, transactions are created with:</p>
            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
              <li>
                <Badge variant="outline" className="mr-2 border-primary/30 bg-primary/5 text-primary">
                  CREDIT
                </Badge>
                → Type: <strong>RECEIVE</strong> (money in)
              </li>
              <li>
                <Badge variant="outline" className="mr-2 border-destructive/30 bg-destructive/5 text-destructive">
                  DEBIT
                </Badge>
                → Type: <strong>SPEND</strong> (money out)
              </li>
              <li>
                <Badge variant="outline" className="mr-2 border-warning-400/30 bg-warning-400/10 text-warning-400">
                  IsReconciled
                </Badge>
                → <strong>false</strong> (ready to match)
              </li>
            </ul>
          </AlertDescription>
        </Alert>

        {/* Steps to verify */}
        <div className="space-y-3">
          <h4 className="font-semibold text-info flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Verify in Xero (5 Steps)
          </h4>
          
          <ol className="space-y-2 text-sm text-info">
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                1
              </span>
              <span>Log in to your <strong>Xero account</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                2
              </span>
              <span>Go to <strong>Accounting → Bank Accounts</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                3
              </span>
              <span>Click on your <strong>bank account</strong></span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                4
              </span>
              <span>Click the <strong>&quot;Reconcile&quot;</strong> tab</span>
            </li>
            
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                5
              </span>
              <span>You should see your imported transactions as <strong>unreconciled</strong></span>
            </li>
          </ol>
        </div>

        {/* What you can do */}
        <div className="rounded-lg border border-info/20 bg-card p-4 space-y-2">
          <h4 className="font-semibold text-info">In Xero&apos;s Reconciliation Screen:</h4>
          <ul className="text-sm text-info space-y-1 ml-4 list-disc">
            <li>Match transactions to existing invoices or bills</li>
            <li>Create new spend/receive money entries</li>
            <li>Split transactions across multiple accounts</li>
            <li>Add notes and attachments</li>
          </ul>
        </div>

        {/* Action button */}
        {hasSyncedTransactions && (
          <Button 
            className="w-full"
            onClick={() => window.open('https://go.xero.com/Bank/BankAccounts.aspx', '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Open Xero Bank Accounts
          </Button>
        )}

        {/* Documentation link */}
        <div className="text-xs text-info text-center pt-2 border-t border-info/20">
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
