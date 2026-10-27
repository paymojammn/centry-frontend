'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useRegisterFiscalGoods } from '@/hooks/use-fiscal';
import type { FiscalGoodInput } from '@/types/fiscal';
import { ItemResults } from './item-results';

/** Form state: every field as typed text; converted on submit. */
interface GoodDraft {
  good_code: string;
  name: string;
  measure_unit: string;
  unit_price: string;
  currency: string;
  commodity_category: string;
  stock_prewarning: string;
  have_excise_tax: boolean;
}

type TextKey = Exclude<keyof GoodDraft, 'have_excise_tax'>;

/** EFRIS currency code 101 = UGX (T115 currencyType). */
const DEFAULT_CURRENCY_CODE = '101';

const blankGood = (): GoodDraft => ({
  good_code: '',
  name: '',
  measure_unit: '',
  unit_price: '',
  currency: DEFAULT_CURRENCY_CODE,
  commodity_category: '',
  stock_prewarning: '',
  have_excise_tax: false,
});

const COLUMNS: { key: TextKey; label: string; placeholder?: string; type?: string; required?: boolean }[] = [
  { key: 'good_code', label: 'Goods code', required: true },
  { key: 'name', label: 'Name', required: true },
  { key: 'measure_unit', label: 'Unit code', placeholder: 'e.g. 101', required: true },
  { key: 'unit_price', label: 'Unit price', type: 'number', required: true },
  { key: 'currency', label: 'Currency code', placeholder: '101 = UGX' },
  { key: 'commodity_category', label: 'Commodity category', required: true },
  { key: 'stock_prewarning', label: 'Stock pre-warning', type: 'number' },
];

export function toGoodInput(d: GoodDraft, operation: 'add' | 'update'): FiscalGoodInput {
  const prewarning = parseInt(d.stock_prewarning, 10);
  return {
    good_code: d.good_code.trim(),
    name: d.name.trim(),
    measure_unit: d.measure_unit.trim(),
    unit_price: d.unit_price.trim(),
    currency: d.currency.trim() || DEFAULT_CURRENCY_CODE,
    commodity_category: d.commodity_category.trim(),
    have_excise_tax: d.have_excise_tax,
    ...(Number.isFinite(prewarning) && prewarning >= 0 ? { stock_prewarning: prewarning } : {}),
    operation,
  };
}

/** Register / update goods with the authority (EFRIS T130). */
export function GoodsRegisterForm({ connectionId }: { connectionId: string }) {
  const [items, setItems] = useState<GoodDraft[]>([blankGood()]);
  const [operation, setOperation] = useState<'add' | 'update'>('add');
  const register = useRegisterFiscalGoods(connectionId);

  const setItem = (i: number, patch: Partial<GoodDraft>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const valid =
    items.length > 0 &&
    items.every((it) => COLUMNS.every((c) => !c.required || it[c.key].trim()));

  const submit = () => {
    if (!valid) return;
    register.mutate(
      { items: items.map((it) => toGoodInput(it, operation)) },
      // Keep the form on partial failure so the failed lines can be fixed.
      { onSuccess: (res) => res?.ok && setItems([blankGood()]) },
    );
  };

  return (
    <div className="space-y-4">
      <div className="max-w-xs space-y-1">
        <label htmlFor="goods-operation" className="text-xs font-medium text-muted-foreground">
          Operation
        </label>
        <Select value={operation} onValueChange={(v) => setOperation(v as 'add' | 'update')}>
          <SelectTrigger id="goods-operation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="add">Register new goods</SelectItem>
            <SelectItem value="update">Update existing goods</SelectItem>
          </SelectContent>
        </Select>
      </div>
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border border-border p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Item {i + 1}</p>
            {items.length > 1 && (
              <Button
                size="sm"
                variant="ghost"
                aria-label={`Remove item ${i + 1}`}
                onClick={() => setItems((list) => list.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {COLUMNS.map((col) => (
              <div key={col.key} className="space-y-1">
                <label htmlFor={`good-${i}-${col.key}`} className="text-xs font-medium text-muted-foreground">
                  {col.label}
                </label>
                <Input
                  id={`good-${i}-${col.key}`}
                  type={col.type ?? 'text'}
                  placeholder={col.placeholder}
                  value={item[col.key]}
                  onChange={(e) => setItem(i, { [col.key]: e.target.value })}
                />
              </div>
            ))}
            <div className="flex items-center gap-2 pt-5">
              <Switch
                id={`good-${i}-excise`}
                checked={item.have_excise_tax}
                onCheckedChange={(v) => setItem(i, { have_excise_tax: v })}
              />
              <label htmlFor={`good-${i}-excise`} className="text-sm text-foreground">
                Excise duty applies
              </label>
            </div>
          </div>
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setItems((list) => [...list, blankGood()])}>
          <Plus className="h-4 w-4 mr-1.5" /> Add item
        </Button>
        <Button onClick={submit} disabled={!valid || register.isPending}>
          {register.isPending ? 'Submitting…' : operation === 'add' ? 'Register goods' : 'Update goods'}
        </Button>
      </div>
      {register.data && <ItemResults result={register.data} />}
    </div>
  );
}
