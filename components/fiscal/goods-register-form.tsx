'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { useRegisterFiscalGoods } from '@/hooks/use-fiscal';
import type { FiscalGoodInput } from '@/types/fiscal';

const blankGood = (currency: string): FiscalGoodInput => ({
  good_code: '',
  name: '',
  measure_unit: '',
  unit_price: '',
  currency,
  commodity_category: '',
  have_excise_tax: false,
  stock_prewarning: '',
});

const COLUMNS: { key: Exclude<keyof FiscalGoodInput, 'have_excise_tax'>; label: string; placeholder?: string; type?: string }[] = [
  { key: 'good_code', label: 'Goods code' },
  { key: 'name', label: 'Name' },
  { key: 'measure_unit', label: 'Unit', placeholder: 'e.g. 101' },
  { key: 'unit_price', label: 'Unit price', type: 'number' },
  { key: 'currency', label: 'Currency' },
  { key: 'commodity_category', label: 'Commodity category' },
  { key: 'stock_prewarning', label: 'Stock pre-warning', type: 'number' },
];

/** Register / update goods with the authority (EFRIS T130). */
export function GoodsRegisterForm({ connectionId, defaultCurrency = 'UGX' }: { connectionId: string; defaultCurrency?: string }) {
  const [items, setItems] = useState<FiscalGoodInput[]>([blankGood(defaultCurrency)]);
  const register = useRegisterFiscalGoods(connectionId);

  const setItem = (i: number, patch: Partial<FiscalGoodInput>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const valid = items.length > 0 && items.every((it) => it.good_code.trim() && it.name.trim() && it.measure_unit.trim() && it.unit_price.trim());

  const submit = () => {
    if (!valid) return;
    register.mutate(
      { items: items.map((it) => ({ ...it, good_code: it.good_code.trim(), name: it.name.trim() })) },
      { onSuccess: () => setItems([blankGood(defaultCurrency)]) },
    );
  };

  return (
    <div className="space-y-4">
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
        <Button variant="outline" size="sm" onClick={() => setItems((list) => [...list, blankGood(defaultCurrency)])}>
          <Plus className="h-4 w-4 mr-1.5" /> Add item
        </Button>
        <Button onClick={submit} disabled={!valid || register.isPending}>
          {register.isPending ? 'Registering…' : 'Register goods'}
        </Button>
      </div>
    </div>
  );
}
