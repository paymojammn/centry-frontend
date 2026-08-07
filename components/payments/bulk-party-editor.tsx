/**
 * Bulk Party Editor
 *
 * Shared row editor for bulk pay-in and pay-out. "Party" is whoever the money
 * moves between — payers on the pay-in side, recipients on the pay-out side —
 * so both pages get the same paste/import/edit behaviour.
 */

'use client';

import { useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Download, Plus, Trash2, Upload, Users } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';

export interface PartyRow {
  id: string;
  name: string;
  phone: string;
  amount: string;
}

interface BulkPartyEditorProps {
  rows: PartyRow[];
  onChange: (rows: PartyRow[]) => void;
  currency: string;
  /** Column label for the counterparty, e.g. "Payer" or "Recipient". */
  partyLabel: string;
  /** Empty-state copy. */
  emptyHint?: string;
  disabled?: boolean;
}

let rowSeq = 0;
function newRow(partial?: Partial<PartyRow>): PartyRow {
  rowSeq += 1;
  return {
    id: `row-${rowSeq}-${rowSeq * 7919}`,
    name: '',
    phone: '',
    amount: '',
    ...partial,
  };
}

/** Accepts "name,phone,amount" or "phone,amount" per line, with or without a header. */
function parseDelimited(text: string): PartyRow[] {
  const parsed: PartyRow[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    const cells = line.split(/[,;\t]/).map((c) => c.trim().replace(/^"|"$/g, ''));
    if (!cells.length) continue;

    const first = cells[0] ?? '';
    const second = cells[1] ?? '';
    const third = cells[2] ?? '';

    // Skip a header row
    if (/^(name|payer|recipient|phone|msisdn|number)$/i.test(first)) continue;

    let name = '';
    let phone = '';
    let amount = '';

    if (cells.length >= 3) {
      name = first;
      phone = second;
      amount = third;
    } else if (cells.length === 2) {
      // "phone,amount" when the first cell looks like a number
      if (/^[+\d]/.test(first)) {
        phone = first;
        amount = second;
      } else {
        name = first;
        phone = second;
      }
    } else {
      phone = first;
    }

    if (!phone) continue;
    parsed.push(newRow({ name, phone, amount: amount.replace(/[^\d.]/g, '') }));
  }

  return parsed;
}

export function BulkPartyEditor({
  rows,
  onChange,
  currency,
  partyLabel,
  emptyHint,
  disabled = false,
}: BulkPartyEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pasteText, setPasteText] = useState('');

  const total = useMemo(
    () => rows.reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    [rows]
  );
  const invalidCount = useMemo(
    () => rows.filter((r) => !r.phone.trim() || !(parseFloat(r.amount) > 0)).length,
    [rows]
  );

  const updateRow = (id: string, patch: Partial<PartyRow>) => {
    onChange(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  };

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const parsed = parseDelimited((e.target?.result as string) || '');
      if (!parsed.length) {
        toast.error('No rows found — expected "name,phone,amount" per line');
        return;
      }
      onChange([...rows, ...parsed]);
      toast.success(`Imported ${parsed.length} ${parsed.length === 1 ? 'row' : 'rows'}`);
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handlePaste = () => {
    const parsed = parseDelimited(pasteText);
    if (!parsed.length) {
      toast.error('Nothing to add — expected "name,phone,amount" per line');
      return;
    }
    onChange([...rows, ...parsed]);
    setPasteText('');
    toast.success(`Added ${parsed.length} ${parsed.length === 1 ? 'row' : 'rows'}`);
  };

  const downloadTemplate = () => {
    const blob = new Blob([`name,phone,amount\nJane Doe,256700000000,50000\n`], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'bulk-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...rows, newRow()])}
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Add row
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-1.5" />
          Import CSV
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={downloadTemplate}>
          <Download className="h-4 w-4 mr-1.5" />
          Template
        </Button>
        {rows.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive ml-auto"
            disabled={disabled}
            onClick={() => onChange([])}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear all
          </Button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleFile}
        />
      </div>

      {/* Paste box */}
      <div className="space-y-1.5">
        <Label htmlFor="bulk-paste" className="text-xs text-muted-foreground">
          Or paste numbers — one per line, as{' '}
          <code className="text-[11px]">name,phone,amount</code>
        </Label>
        <div className="flex gap-2">
          <textarea
            id="bulk-paste"
            rows={2}
            disabled={disabled}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={'Jane Doe,256700000000,50000\nJohn Doe,256770000000,25000'}
            className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:opacity-50"
          />
          <Button
            type="button"
            variant="secondary"
            disabled={disabled || !pasteText.trim()}
            onClick={handlePaste}
          >
            Add
          </Button>
        </div>
      </div>

      {/* Rows */}
      {rows.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-border rounded-xl">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Users className="h-6 w-6 text-muted-foreground/60" />
          </div>
          <p className="text-sm font-medium text-foreground">No {partyLabel.toLowerCase()}s yet</p>
          <p className="text-xs text-muted-foreground mt-1">
            {emptyHint || 'Add a row, paste a list, or import a CSV to get started'}
          </p>
        </div>
      ) : (
        <div className="border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[35%]">{partyLabel} name</TableHead>
                <TableHead className="w-[30%]">Phone number</TableHead>
                <TableHead className="w-[25%]">Amount ({currency})</TableHead>
                <TableHead className="w-[10%]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const badPhone = !row.phone.trim();
                const badAmount = !(parseFloat(row.amount) > 0);
                return (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Input
                        value={row.name}
                        disabled={disabled}
                        placeholder="Optional"
                        onChange={(e) => updateRow(row.id, { name: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.phone}
                        disabled={disabled}
                        placeholder="256700000000"
                        aria-invalid={badPhone}
                        className={badPhone ? 'border-destructive' : ''}
                        onChange={(e) => updateRow(row.id, { phone: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.amount}
                        disabled={disabled}
                        inputMode="decimal"
                        placeholder="0.00"
                        aria-invalid={badAmount}
                        className={badAmount ? 'border-destructive' : ''}
                        onChange={(e) =>
                          updateRow(row.id, { amount: e.target.value.replace(/[^\d.]/g, '') })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={disabled}
                        onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Totals */}
      {rows.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-muted rounded-xl">
          <div className="text-sm text-muted-foreground">
            {rows.length} {rows.length === 1 ? partyLabel.toLowerCase() : `${partyLabel.toLowerCase()}s`}
            {invalidCount > 0 && (
              <span className="text-destructive ml-2">
                · {invalidCount} incomplete
              </span>
            )}
          </div>
          <div className="text-sm font-semibold text-foreground">
            Total {formatCurrency(total, currency)}
          </div>
        </div>
      )}
    </div>
  );
}

export { newRow as createPartyRow };
