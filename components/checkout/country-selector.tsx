'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Country } from '@/lib/checkout-api';

// Country flag emoji mapping
const COUNTRY_FLAGS: Record<string, string> = {
  UG: '\ud83c\uddfa\ud83c\uddec',
  KE: '\ud83c\uddf0\ud83c\uddea',
  NG: '\ud83c\uddf3\ud83c\uddec',
  GH: '\ud83c\uddec\ud83c\udded',
  ZA: '\ud83c\uddff\ud83c\udde6',
  TZ: '\ud83c\uddf9\ud83c\uddff',
  RW: '\ud83c\uddf7\ud83c\uddfc',
};

interface CountrySelectorProps {
  countries: Country[];
  selectedCountry: string | null;
  onSelect: (country: string) => void;
  disabled?: boolean;
}

export function CountrySelector({
  countries,
  selectedCountry,
  onSelect,
  disabled = false,
}: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);

  const selected = countries.find((c) => c.code === selectedCountry);

  // If only one country, show it without dropdown
  if (countries.length === 1) {
    const country = countries[0];
    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
        <span className="text-2xl">{COUNTRY_FLAGS[country.code] || ''}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{country.name}</p>
          <p className="text-xs text-gray-500">Currency: {country.currency}</p>
        </div>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          mode="input"
          size="lg"
          disabled={disabled}
          className="w-full justify-between"
        >
          {selected ? (
            <span className="flex items-center gap-2">
              <span className="text-xl">{COUNTRY_FLAGS[selected.code] || ''}</span>
              <span>{selected.name}</span>
            </span>
          ) : (
            <span className="flex items-center gap-2 text-gray-500">
              <Globe className="size-4" />
              <span>Select your country</span>
            </span>
          )}
          <ChevronDown className="size-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-1" align="start">
        <div className="flex flex-col">
          {countries.map((country) => (
            <button
              key={country.code}
              onClick={() => {
                onSelect(country.code);
                setOpen(false);
              }}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                'hover:bg-gray-100',
                selectedCountry === country.code && 'bg-gray-100'
              )}
            >
              <span className="text-xl">{COUNTRY_FLAGS[country.code] || ''}</span>
              <div className="flex-1 text-left">
                <p className="font-medium text-gray-900">{country.name}</p>
                <p className="text-xs text-gray-500">{country.currency}</p>
              </div>
              {selectedCountry === country.code && (
                <Check className="size-4 text-primary" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
