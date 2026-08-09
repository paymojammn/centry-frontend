/**
 * Rail Selector
 *
 * Country + rail pickers shared by Pay In and Pay Out. Rails the platform
 * can't execute yet are shown but disabled, with the reason spelled out —
 * better than letting someone pick one and fail at dispatch.
 */

'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { AlertCircle, Globe, Loader2, Radio } from 'lucide-react';
import type { PaymentRail, RailCountry } from '@/lib/payment-rails-api';

interface RailSelectorProps {
  countries: RailCountry[];
  countryCode: string;
  onCountryChange: (code: string) => void;
  railId: string;
  onRailChange: (id: string) => void;
  country?: RailCountry;
  rail?: PaymentRail;
  isLoading: boolean;
  /** "collect through" vs "send from" wording. */
  capability: 'payin' | 'payout';
}

export function RailSelector({
  countries,
  countryCode,
  onCountryChange,
  railId,
  onRailChange,
  country,
  rail,
  isLoading,
  capability,
}: RailSelectorProps) {
  const railLabel = capability === 'payin' ? 'Collect through' : 'Send from';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground sm:col-span-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading available rails…
      </div>
    );
  }

  if (!countries.length) {
    return (
      <div className="sm:col-span-2">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-foreground">No rails configured</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              This organisation has no active provider account that supports{' '}
              {capability === 'payin' ? 'collections' : 'payouts'}. Add one under{' '}
              <a href="/banking/provider-accounts" className="text-primary hover:underline">
                Provider Accounts
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rails = country?.rails ?? [];

  return (
    <>
      <div className="space-y-1.5">
        <Label htmlFor="rail-country" className="flex items-center gap-1.5">
          <Globe className="h-3.5 w-3.5 text-muted-foreground" />
          Country
        </Label>
        <Select value={countryCode} onValueChange={onCountryChange}>
          <SelectTrigger id="rail-country">
            <SelectValue placeholder="Select a country" />
          </SelectTrigger>
          <SelectContent>
            {countries.map((c) => (
              <SelectItem key={c.code} value={c.code}>
                {c.name} {c.currency ? `· ${c.currency}` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="rail-provider" className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-muted-foreground" />
          {railLabel}
        </Label>
        <Select value={railId} onValueChange={onRailChange} disabled={!rails.length}>
          <SelectTrigger id="rail-provider">
            <SelectValue placeholder={rails.length ? 'Select a rail' : 'No rails here'} />
          </SelectTrigger>
          <SelectContent>
            {rails.map((r) => (
              <SelectItem key={r.id} value={r.id} disabled={!r.supported}>
                {r.provider_display} · {r.name}
                {!r.is_live ? ' (sandbox)' : ''}
                {!r.supported ? ' — unavailable' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Notices span the grid so they read as belonging to the form, not to
          whichever field happens to sit last in the row. */}
      {rail && !rail.supported && (
        <div className="sm:col-span-2 flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 text-amber-800">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <p className="text-xs">{rail.unsupported_reason}</p>
        </div>
      )}

      {rail?.supported && !rail.is_live && (
        <p className="sm:col-span-2 text-xs text-muted-foreground">
          Sandbox rail — no real money moves.
        </p>
      )}
    </>
  );
}
