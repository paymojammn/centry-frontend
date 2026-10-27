'use client';

import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useAdjustFiscalStock } from '@/hooks/use-fiscal';
import type { FiscalStockItem, FiscalStockOperation } from '@/types/fiscal';

/** EFRIS T131 adjustType for stock decreases. */
const DECREASE_TYPES = [
  { value: '101', label: '101 · Expired goods' },
  { value: '102', label: '102 · Damaged goods' },
  { value: '103', label: '103 · Personal uses' },
  { value: '104', label: '104 · Others' },
  { value: '105', label: '105 · Raw materials' },
];

const blankItem = (): FiscalStockItem => ({ good_code: '', quantity: '', unit_price: '' });

/** Stock increase / decrease (EFRIS T131). */
export function StockAdjustForm({ connectionId }: { connectionId: string }) {
  const [operation, setOperation] = useState<FiscalStockOperation>('increase');
  const [items, setItems] = useState<FiscalStockItem[]>([blankItem()]);
  const [supplierName, setSupplierName] = useState('');
  const [supplierTin, setSupplierTin] = useState('');
  const [adjustType, setAdjustType] = useState('');
  const [remarks, setRemarks] = useState('');
  const adjust = useAdjustFiscalStock(connectionId);

  const setItem = (i: number, patch: Partial<FiscalStockItem>) =>
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));

  const itemsValid = items.length > 0 && items.every((it) => it.good_code.trim() && parseFloat(it.quantity) > 0);
  const valid = itemsValid && (operation === 'increase' || !!adjustType);

  const reset = () => {
    setItems([blankItem()]);
    setSupplierName('');
    setSupplierTin('');
    setAdjustType('');
    setRemarks('');
  };

  const submit = () => {
    if (!valid) return;
    adjust.mutate(
      {
        operation,
        items: items.map((it) => ({ ...it, good_code: it.good_code.trim() })),
        ...(operation === 'increase'
          ? { supplier_name: supplierName.trim() || undefined, supplier_tin: supplierTin.trim() || undefined }
          : { adjust_type: adjustType }),
        remarks: remarks.trim() || undefined,
      },
      { onSuccess: reset },
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label htmlFor="stock-op" className="text-xs font-medium text-muted-foreground">
            Operation
          </label>
          <Select value={operation} onValueChange={(v) => setOperation(v as FiscalStockOperation)}>
            <SelectTrigger id="stock-op">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="increase">Increase stock</SelectItem>
              <SelectItem value="decrease">Decrease stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {operation === 'increase' ? (
          <>
            <div className="space-y-1">
              <label htmlFor="stock-supplier" className="text-xs font-medium text-muted-foreground">
                Supplier name
              </label>
              <Input id="stock-supplier" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label htmlFor="stock-supplier-tin" className="text-xs font-medium text-muted-foreground">
                Supplier TIN
              </label>
              <Input id="stock-supplier-tin" value={supplierTin} onChange={(e) => setSupplierTin(e.target.value)} />
            </div>
          </>
        ) : (
          <div className="space-y-1 sm:col-span-2">
            <label htmlFor="stock-adjust-type" className="text-xs font-medium text-muted-foreground">
              Adjustment type
            </label>
            <Select value={adjustType} onValueChange={setAdjustType}>
              <SelectTrigger id="stock-adjust-type">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                {DECREASE_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="grid grid-cols-[1fr_120px_140px_auto] gap-2 items-end">
            <div className="space-y-1">
              <label htmlFor={`stock-${i}-code`} className="text-xs font-medium text-muted-foreground">
                Goods code
              </label>
              <Input id={`stock-${i}-code`} value={item.good_code} onChange={(e) => setItem(i, { good_code: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`stock-${i}-qty`} className="text-xs font-medium text-muted-foreground">
                Quantity
              </label>
              <Input id={`stock-${i}-qty`} type="number" min="0" value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor={`stock-${i}-price`} className="text-xs font-medium text-muted-foreground">
                Unit price
              </label>
              <Input id={`stock-${i}-price`} type="number" min="0" value={item.unit_price} onChange={(e) => setItem(i, { unit_price: e.target.value })} />
            </div>
            <Button
              size="sm"
              variant="ghost"
              aria-label={`Remove line ${i + 1}`}
              disabled={items.length === 1}
              onClick={() => setItems((list) => list.filter((_, idx) => idx !== i))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
        <Button variant="outline" size="sm" onClick={() => setItems((list) => [...list, blankItem()])}>
          <Plus className="h-4 w-4 mr-1.5" /> Add line
        </Button>
      </div>

      <div className="space-y-1">
        <label htmlFor="stock-remarks" className="text-xs font-medium text-muted-foreground">
          Remarks
        </label>
        <Textarea id="stock-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
      </div>

      <div className="flex justify-end">
        <Button onClick={submit} disabled={!valid || adjust.isPending}>
          {adjust.isPending ? 'Submitting…' : operation === 'increase' ? 'Increase stock' : 'Decrease stock'}
        </Button>
      </div>
    </div>
  );
}
