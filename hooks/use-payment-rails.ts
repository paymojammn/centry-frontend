/**
 * Payment Rails hook + selection state.
 *
 * Owns the org → country → rail chain for the Pay In and Pay Out pages:
 * picks sensible defaults, keeps the selection valid when the org changes,
 * and derives the working currency from the chosen country.
 */

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { paymentRailsApi, type RailCapability } from '@/lib/payment-rails-api';

export const railKeys = {
  all: ['payment-rails'] as const,
  list: (organizationId?: string, capability?: RailCapability) =>
    [...railKeys.all, organizationId, capability] as const,
};

export function usePaymentRails(organizationId: string | undefined, capability: RailCapability) {
  return useQuery({
    queryKey: railKeys.list(organizationId, capability),
    queryFn: () => paymentRailsApi.list(organizationId!, capability),
    enabled: !!organizationId,
    staleTime: 60_000,
  });
}

/**
 * Country + rail selection for one organisation, with defaults applied.
 *
 * Selection resets whenever the org changes, so a rail from the previous org
 * can never leak into a request.
 */
export function useRailSelection(
  organizationId: string | undefined,
  capability: RailCapability,
  fallbackCurrency = 'UGX'
) {
  const { data, isLoading, error } = usePaymentRails(organizationId, capability);
  const countries = useMemo(() => data?.countries ?? [], [data]);

  const [countryCode, setCountryCode] = useState<string>('');
  const [railId, setRailId] = useState<string>('');

  // Default to the first country that has a usable rail.
  useEffect(() => {
    if (!countries.length) {
      setCountryCode('');
      return;
    }
    const stillValid = countries.some((c) => c.code === countryCode);
    if (stillValid) return;

    const preferred =
      countries.find((c) => c.rails.some((r) => r.supported)) ?? countries[0];
    setCountryCode(preferred?.code ?? '');
  }, [countries, countryCode]);

  const country = useMemo(
    () => countries.find((c) => c.code === countryCode),
    [countries, countryCode]
  );

  // Default to the country's default rail, preferring one we can execute.
  useEffect(() => {
    const rails = country?.rails ?? [];
    if (!rails.length) {
      setRailId('');
      return;
    }
    if (rails.some((r) => r.id === railId)) return;

    const preferred = rails.find((r) => r.supported) ?? rails[0];
    setRailId(preferred?.id ?? '');
  }, [country, railId]);

  const rail = useMemo(
    () => country?.rails.find((r) => r.id === railId),
    [country, railId]
  );

  return {
    isLoading,
    error,
    countries,
    countryCode,
    setCountryCode,
    country,
    railId,
    setRailId,
    rail,
    /** Country currency wins; falls back to the org's currency. */
    currency: country?.currency || fallbackCurrency,
    phoneCode: country?.phone_code || '',
    /** True when a rail is chosen and the platform can actually run it. */
    ready: !!rail?.supported,
  };
}
