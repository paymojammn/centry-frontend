/**
 * MTN MoMo Open API — SIT Sign-off Test Runner
 *
 * Fires each MTN SIT scenario (from the "UG Momo OpenAPI SIT Sheet" workbook)
 * against the configured MTN provider account via /payments/api/mtn/cert-test/,
 * captures the raw HTTP status + body + reference id, and exports the filled-in
 * SIT CSVs (one per sheet) plus a combined workbook for MTN go-live sign-off.
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
import { Loader2, Play, ChevronDown, ChevronRight, Download, FileSpreadsheet } from 'lucide-react';
import { ProviderAccountPicker } from '@/components/payments/provider-account-picker';
import {
  SIT_SHEETS,
  actualResults,
  downloadSheetCsv,
  downloadSitWorkbook,
  type RunResult,
  type SitCase,
  type SitSheet,
} from '@/lib/mtn-sit';

const key = (sheet: string, tc: string) => `${sheet}:${tc}`;

function statusVariant(r?: RunResult): 'success' | 'warning' | 'destructive' | 'outline' {
  if (!r) return 'outline';
  if (r.error != null) return 'destructive';
  if (r.http_status == null) return 'warning';
  if (r.http_status >= 200 && r.http_status < 300) return 'success';
  if (r.http_status >= 400) return 'destructive';
  return 'warning';
}

function statusText(r?: RunResult): string {
  if (!r) return '—';
  if (r.error != null) return 'error';
  if (r.http_status == null) return '—';
  return `${r.http_status}`;
}

function SheetTable({
  sheet,
  currency,
  accountId,
  results,
  setResults,
}: {
  sheet: SitSheet;
  currency: string;
  accountId: string;
  results: Record<string, RunResult>;
  setResults: React.Dispatch<React.SetStateAction<Record<string, RunResult>>>;
}) {
  const [edits, setEdits] = useState<Record<string, { amount?: string; msisdn?: string }>>({});
  const [running, setRunning] = useState<Record<string, boolean>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [runningAll, setRunningAll] = useState(false);

  const editOf = (c: SitCase) => ({
    amount: edits[c.tc]?.amount ?? c.request.amount ?? '',
    msisdn: edits[c.tc]?.msisdn ?? c.request.msisdn ?? '',
  });

  const post = (body: Record<string, unknown>) =>
    api.post<RunResult>('/payments/api/mtn/cert-test/', {
      ...body,
      currency,
      ...(accountId ? { account_id: accountId } : {}),
    });

  const run = async (c: SitCase) => {
    const k = key(sheet.name, c.tc);
    setRunning((s) => ({ ...s, [k]: true }));
    try {
      const req = { ...c.request };
      const e = editOf(c);
      if (c.editable?.includes('amount')) req.amount = e.amount;
      if (c.editable?.includes('msisdn')) req.msisdn = e.msisdn;

      let result: RunResult;
      if (req.chainCreate) {
        // Create a fresh transaction with VALID auth to obtain a real
        // reference, then run the status case (optionally with bad auth).
        const createCase = req.service === 'disbursement' ? 'transfer' : 'request_to_pay';
        const created = await post({ case: createCase, service: req.service, amount: '100', msisdn: e.msisdn || '46733123453' });
        const ref = created.reference_id;
        result = await post({ ...req, chainCreate: undefined, reference_id: ref });
      } else {
        result = await post(req);
      }
      setResults((s) => ({ ...s, [k]: result }));
    } catch (err: any) {
      setResults((s) => ({ ...s, [k]: { error: err?.message || String(err) } }));
    } finally {
      setRunning((s) => ({ ...s, [k]: false }));
    }
  };

  const runAll = async () => {
    setRunningAll(true);
    for (const c of sheet.cases) {
      // sequential — avoid hammering MTN and keep the ReferenceID trail readable
      await run(c);
    }
    setRunningAll(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => downloadSheetCsv(sheet, results)}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
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
              <th className="p-2 w-20">TC#</th>
              <th className="p-2">Test case</th>
              <th className="p-2 w-40">Inputs</th>
              <th className="p-2">Expected</th>
              <th className="p-2 w-24">Result</th>
              <th className="p-2 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sheet.cases.map((c) => {
              const k = key(sheet.name, c.tc);
              const r = results[k];
              const isOpen = expanded[k];
              const e = editOf(c);
              return (
                <Fragment key={k}>
                  <tr className="border-t align-top">
                    <td className="p-2">
                      <button
                        onClick={() => setExpanded((s) => ({ ...s, [k]: !s[k] }))}
                        className="text-muted-foreground"
                        aria-label="toggle details"
                      >
                        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    </td>
                    <td className="p-2 font-mono text-xs">{c.tc}</td>
                    <td className="p-2 font-medium">{c.label}</td>
                    <td className="p-2 space-y-1">
                      {c.editable?.includes('msisdn') && (
                        <Input
                          value={e.msisdn}
                          onChange={(ev) => setEdits((s) => ({ ...s, [c.tc]: { ...s[c.tc], msisdn: ev.target.value } }))}
                          placeholder="MSISDN"
                          className="h-7"
                        />
                      )}
                      {c.editable?.includes('amount') && (
                        <Input
                          value={e.amount}
                          onChange={(ev) => setEdits((s) => ({ ...s, [c.tc]: { ...s[c.tc], amount: ev.target.value } }))}
                          placeholder="Amount"
                          className="h-7"
                        />
                      )}
                      {!c.editable?.length && <span className="text-muted-foreground">—</span>}
                    </td>
                    <td className="p-2 text-muted-foreground">{c.expected}</td>
                    <td className="p-2">
                      <Badge variant={statusVariant(r)}>{statusText(r)}</Badge>
                    </td>
                    <td className="p-2">
                      <Button size="sm" variant="outline" onClick={() => run(c)} disabled={running[k]}>
                        {running[k] ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                        Run
                      </Button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t bg-muted/30">
                      <td></td>
                      <td colSpan={6} className="p-3">
                        <div className="space-y-1 text-xs">
                          <div className="text-muted-foreground">{c.objective}</div>
                          {r ? (
                            <>
                              <div>reference: <code>{r.reference_id || '—'}</code></div>
                              <div>target env: <code>{r.target_environment || '—'}</code></div>
                              {r.error && <div className="text-destructive">error: {r.error}</div>}
                              <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded bg-background p-2">
                                {actualResults(r)}
                              </pre>
                            </>
                          ) : (
                            <div className="text-muted-foreground">Not run yet.</div>
                          )}
                        </div>
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

export default function MtnCertificationPage() {
  const [currency, setCurrency] = useState('EUR');
  const [accountId, setAccountId] = useState('');
  const [results, setResults] = useState<Record<string, RunResult>>({});

  return (
    <PageContainer>
      <PageHeader
        title="MTN MoMo — SIT Sign-off Tests"
        subtitle="Run the MTN Open API SIT scenarios against the configured MTN account, then export the filled SIT CSVs for go-live sign-off. Fires real sandbox transactions."
      />
      <ContentCard>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <ProviderAccountPicker
              provider="mtn"
              value={accountId}
              onChange={(id, account) => {
                setAccountId(id);
                if (account) setCurrency(account.active_environment === 'production' ? 'UGX' : 'EUR');
              }}
            />
            <div>
              <label className="text-xs text-muted-foreground">Currency</label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value)} className="h-9 w-24" />
            </div>
          </div>
          <Button variant="outline" onClick={() => downloadSitWorkbook(results)}>
            <FileSpreadsheet className="h-4 w-4" />
            Export all sheets (.xlsx)
          </Button>
        </div>

        <Tabs defaultValue={SIT_SHEETS[0]?.name ?? ''}>
          <TabsList className="flex-wrap">
            {SIT_SHEETS.map((s) => (
              <TabsTrigger key={s.name} value={s.name}>
                {s.name} ({s.cases.length})
              </TabsTrigger>
            ))}
          </TabsList>
          {SIT_SHEETS.map((s) => (
            <TabsContent key={s.name} value={s.name} className="mt-4">
              <SheetTable
                sheet={s}
                currency={currency}
                accountId={accountId}
                results={results}
                setResults={setResults}
              />
            </TabsContent>
          ))}
        </Tabs>
      </ContentCard>
    </PageContainer>
  );
}
