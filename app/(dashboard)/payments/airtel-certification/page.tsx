/**
 * Airtel Money — Go-live Certification Test Runner
 *
 * Fires each Airtel certification scenario (collections + disbursements) against
 * the configured Airtel provider account via /payments/api/airtel/cert-test/ and
 * shows the raw provider result. Amounts/MSISDNs are editable per row.
 */

'use client';

import { Fragment, useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/layout/page-header';
import { PageContainer } from '@/components/layout/page-container';
import { ContentCard } from '@/components/layout/content-card';
import { Loader2, Play, ChevronDown, ChevronRight } from 'lucide-react';
import { ProviderAccountPicker } from '@/components/payments/provider-account-picker';

type Kind = 'collection' | 'disbursement';

interface CertCase {
  id: string;
  label: string;
  kind: Kind;
  amount: string;
  msisdn: string;
  pin?: string; // disbursement wrong-pin scenario
  expected: string;
}

interface RunResult {
  status?: string;
  reference?: string;
  provider_ref?: string | null;
  environment?: string;
  error?: string | null;
  response?: unknown;
}

// Airtel-provided certification matrix. Collection MSISDNs default to a
// placeholder — enter the Airtel test numbers for barred/unregistered rows.
const COLLECTIONS: CertCase[] = [
  { id: 'c1', label: 'Push for 6000', kind: 'collection', amount: '6000', msisdn: '', expected: 'Success (customer approves)' },
  { id: 'c2', label: 'Push to barred number', kind: 'collection', amount: '2000', msisdn: '', expected: 'Fail — barred subscriber' },
  { id: 'c3', label: 'Push 2500 after unbarred', kind: 'collection', amount: '2500', msisdn: '', expected: 'Success (after unbar)' },
  { id: 'c4', label: 'Push 6000 — incorrect PIN', kind: 'collection', amount: '6000', msisdn: '', expected: 'Fail — wrong PIN (entered on handset)' },
  { id: 'c5', label: 'Insufficient balance (5,000,000)', kind: 'collection', amount: '5000000', msisdn: '', expected: 'Fail — insufficient balance' },
  { id: 'c6', label: 'Above transaction limit (5,100,000)', kind: 'collection', amount: '5100000', msisdn: '', expected: 'Fail — over limit' },
  { id: 'c7', label: 'Below minimum (400 < 500)', kind: 'collection', amount: '400', msisdn: '', expected: 'Fail — below min amount' },
  { id: 'c8', label: 'Amount 0', kind: 'collection', amount: '0', msisdn: '', expected: 'Fail — invalid amount' },
  { id: 'c9', label: 'Amount with decimals (500.78)', kind: 'collection', amount: '500.78', msisdn: '', expected: 'Fail — decimals not allowed' },
  { id: 'c10', label: 'Negative amount (-8000)', kind: 'collection', amount: '-8000', msisdn: '', expected: 'Fail — negative amount' },
  { id: 'c11', label: 'Unregistered number', kind: 'collection', amount: '3000', msisdn: '', expected: 'Fail — unregistered subscriber' },
];

const DISBURSEMENTS: CertCase[] = [
  { id: 'd1', label: 'Deposit 8000', kind: 'disbursement', amount: '8000', msisdn: '706218827', expected: 'Success' },
  { id: 'd2', label: 'Deposit 6000 to barred', kind: 'disbursement', amount: '6000', msisdn: '706218827', expected: 'Fail — barred' },
  { id: 'd3', label: 'Deposit 6000 to unbarred', kind: 'disbursement', amount: '6000', msisdn: '706218827', expected: 'Success (after unbar)' },
  { id: 'd4', label: 'Deposit 5,100,000 (over limit)', kind: 'disbursement', amount: '5100000', msisdn: '706218827', expected: 'Fail — over limit' },
  { id: 'd5', label: 'Deposit 500,000 — wrong PIN', kind: 'disbursement', amount: '500000', msisdn: '706218827', pin: '0000', expected: 'Fail — wrong PIN' },
  { id: 'd6', label: 'Deposit 0', kind: 'disbursement', amount: '0', msisdn: '706218827', expected: 'Fail — invalid amount' },
  { id: 'd7', label: 'Deposit 5000.89 (decimals)', kind: 'disbursement', amount: '5000.89', msisdn: '706218827', expected: 'Fail — decimals not allowed' },
  { id: 'd8', label: 'Deposit -10000 (negative)', kind: 'disbursement', amount: '-10000', msisdn: '706218827', expected: 'Fail — negative amount' },
  { id: 'd9', label: 'Deposit 7000 to unregistered', kind: 'disbursement', amount: '7000', msisdn: '757772240', expected: 'Fail — unregistered' },
  { id: 'd10', label: 'Deposit 200 (below minimum)', kind: 'disbursement', amount: '200', msisdn: '756255985', expected: 'Fail — below min amount' },
];

function statusVariant(status?: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (status === 'success') return 'success';
  if (status === 'pending' || status === 'unknown') return 'warning';
  if (status === 'failed') return 'destructive';
  return 'outline';
}

function CaseTable({ initial, accountId }: { initial: CertCase[]; accountId: string }) {
  const [rows, setRows] = useState<CertCase[]>(initial);
  const [results, setResults] = useState<Record<string, RunResult>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [runningAll, setRunningAll] = useState(false);

  const update = (id: string, patch: Partial<CertCase>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));

  const run = async (row: CertCase) => {
    setRunning((s) => ({ ...s, [row.id]: true }));
    try {
      const res = await api.post<RunResult>('/payments/api/airtel/cert-test/', {
        kind: row.kind,
        amount: row.amount,
        msisdn: row.msisdn,
        ...(row.pin ? { pin: row.pin } : {}),
        ...(accountId ? { account_id: accountId } : {}),
      });
      setResults((s) => ({ ...s, [row.id]: res }));
    } catch (e: any) {
      setResults((s) => ({ ...s, [row.id]: { status: 'failed', error: e?.message || String(e) } }));
    } finally {
      setRunning((s) => ({ ...s, [row.id]: false }));
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const row of rows) {
      // sequential — avoid hammering Airtel and keep results readable
      // eslint-disable-next-line no-await-in-loop
      await run(row);
    }
    setRunningAll(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button onClick={runAll} disabled={runningAll} size="sm">
          {runningAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Run all
        </Button>
      </div>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-2 w-8"></th>
              <th className="p-2">Scenario</th>
              <th className="p-2 w-32">MSISDN</th>
              <th className="p-2 w-28">Amount</th>
              <th className="p-2">Expected</th>
              <th className="p-2 w-28">Result</th>
              <th className="p-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const r = results[row.id];
              const isOpen = expanded[row.id];
              return (
                <Fragment key={row.id}>
                  <tr className="border-t align-top">
                    <td className="p-2">
                      <button
                        onClick={() => setExpanded((s) => ({ ...s, [row.id]: !s[row.id] }))}
                        className="text-muted-foreground"
                        aria-label="toggle details"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-2 font-medium">{row.label}</td>
                    <td className="p-2">
                      <Input
                        value={row.msisdn}
                        onChange={(e) => update(row.id, { msisdn: e.target.value })}
                        placeholder="MSISDN"
                        className="h-8"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        value={row.amount}
                        onChange={(e) => update(row.id, { amount: e.target.value })}
                        className="h-8"
                      />
                    </td>
                    <td className="p-2 text-muted-foreground">{row.expected}</td>
                    <td className="p-2">
                      {r ? (
                        <Badge variant={statusVariant(r.status)}>{r.status}</Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => run(row)} disabled={running[row.id]}>
                        {running[row.id] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Run
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-muted/30">
                      <td></td>
                      <td colSpan={6} className="p-3">
                        {r ? (
                          <div className="space-y-1 text-xs">
                            <div>reference: <code>{r.reference || '—'}</code></div>
                            <div>provider_ref: <code>{r.provider_ref || '—'}</code></div>
                            {r.error && <div className="text-destructive">error: {r.error}</div>}
                            <pre className="mt-2 max-h-64 overflow-auto rounded bg-background p-2">
                              {JSON.stringify(r.response ?? r, null, 2)}
                            </pre>
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">Not run yet.</div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Read-only Airtel lookups: User Enquiry (KYC) and Balance. */
function LookupPanel({ kind, label, accountId }: { kind: 'kyc' | 'balance'; label: string; accountId: string }) {
  const [msisdn, setMsisdn] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RunResult | null>(null);

  const run = async () => {
    setRunning(true);
    try {
      const body = {
        ...(kind === 'kyc' ? { kind, msisdn } : { kind }),
        ...(accountId ? { account_id: accountId } : {}),
      };
      const res = await api.post<RunResult>('/payments/api/airtel/cert-test/', body);
      setResult(res);
    } catch (e: any) {
      setResult({ status: 'failed', error: e?.message || String(e) });
    } finally {
      setRunning(false);
    }
  };

  const data = (result?.response as any)?.data;

  return (
    <div className="space-y-3">
      <div className="flex items-end gap-2">
        {kind === 'kyc' && (
          <div>
            <label className="text-xs text-muted-foreground">MSISDN</label>
            <Input
              value={msisdn}
              onChange={(e) => setMsisdn(e.target.value)}
              placeholder="e.g. 256706218827"
              className="h-9 w-56"
            />
          </div>
        )}
        <Button onClick={run} disabled={running || (kind === 'kyc' && !msisdn)}>
          {running ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          {label}
        </Button>
        {result && <Badge variant={statusVariant(result.status)}>{result.status}</Badge>}
      </div>

      {data && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border p-3 text-sm sm:grid-cols-3">
          {Object.entries(data).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span className="text-muted-foreground">{k}</span>
              <span className="font-medium">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
            </div>
          ))}
        </div>
      )}
      {result && (
        <pre className="max-h-72 overflow-auto rounded bg-muted/40 p-3 text-xs">
          {JSON.stringify(result.response ?? result, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function AirtelCertificationPage() {
  const [accountId, setAccountId] = useState('');
  return (
    <PageContainer>
      <PageHeader
        title="Airtel Money — Certification Tests"
        subtitle="Run the Airtel go-live certification scenarios against a chosen Airtel provider account. Fires real sandbox/UAT transactions."
      />
      <ContentCard>
        <div className="mb-4">
          <ProviderAccountPicker provider="airtel" value={accountId} onChange={setAccountId} />
        </div>
        <Tabs defaultValue="collections">
          <TabsList>
            <TabsTrigger value="collections">Collections ({COLLECTIONS.length})</TabsTrigger>
            <TabsTrigger value="disbursements">Disbursements ({DISBURSEMENTS.length})</TabsTrigger>
            <TabsTrigger value="kyc">User Enquiry (KYC)</TabsTrigger>
            <TabsTrigger value="balance">Balance</TabsTrigger>
          </TabsList>
          <TabsContent value="collections" className="mt-4">
            <CaseTable initial={COLLECTIONS} accountId={accountId} />
          </TabsContent>
          <TabsContent value="disbursements" className="mt-4">
            <CaseTable initial={DISBURSEMENTS} accountId={accountId} />
          </TabsContent>
          <TabsContent value="kyc" className="mt-4">
            <LookupPanel kind="kyc" label="Look up user" accountId={accountId} />
          </TabsContent>
          <TabsContent value="balance" className="mt-4">
            <LookupPanel kind="balance" label="Check balance" accountId={accountId} />
          </TabsContent>
        </Tabs>
      </ContentCard>
    </PageContainer>
  );
}
