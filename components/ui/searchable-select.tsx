'use client';

/**
 * Searchable combobox (Popover + cmdk) — the same control used in the
 * bill-payments recipient step, shared so other forms can match it.
 */

import { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';

export interface SearchableOption {
  value: string;
  label: string;
  hint?: string;
}

export function SearchableSelect({
  label,
  placeholder,
  value,
  displayValue,
  onSelect,
  options,
  loading,
  optional,
  disabled,
}: {
  label?: string;
  placeholder: string;
  value: string | number;
  displayValue: string;
  onSelect: (value: string) => void;
  options: SearchableOption[];
  loading?: boolean;
  optional?: boolean;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      {label && (
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          {label}
          {optional && <span className="text-muted-foreground/40 ml-1">(optional)</span>}
        </label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className="w-full h-10 px-3 pr-9 border border-border rounded-lg text-sm bg-card text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors relative disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={displayValue ? 'text-foreground truncate' : 'text-muted-foreground'}>
              {displayValue || placeholder}
            </span>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/40 shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)]" align="start" sideOffset={4}>
          <Command>
            <CommandInput placeholder={`Search ${(label || placeholder).toLowerCase()}...`} className="h-9" />
            <CommandList className="max-h-52">
              <CommandEmpty>{loading ? 'Loading...' : 'No results found.'}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => {
                      onSelect(opt.value);
                      setOpen(false);
                    }}
                    className="flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <span className="text-sm truncate">{opt.label}</span>
                      {opt.hint && <span className="ml-2 text-xs text-muted-foreground">{opt.hint}</span>}
                    </div>
                    {String(value) === opt.value && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
