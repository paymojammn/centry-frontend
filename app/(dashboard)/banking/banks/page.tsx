"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Info, Landmark, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { StatusBadge } from "@/components/ui/status-badge";
import { PageHeader } from "@/components/layout/page-header";
import { BankFormDialog } from "@/components/banking/bank-registry/bank-form-dialog";
import { BranchesSheet } from "@/components/banking/bank-registry/branches-sheet";
import { RegistryPager } from "@/components/banking/bank-registry/registry-pager";
import { useDebouncedValue } from "@/components/banking/bank-registry/use-debounced-value";
import { useOrganizations } from "@/hooks/use-organization";
import { useRegistryBanks, useRegistryCountries } from "@/hooks/use-bank-registry";
import { BANK_TYPE_LABELS, NO_RIGHTS, type RegistryBank } from "@/lib/bank-registry-api";

export default function BankRegistryPage() {
  const [country, setCountry] = useState("");
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [page, setPage] = useState(1);
  const [bankFormOpen, setBankFormOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<RegistryBank | null>(null);
  const [branchesBank, setBranchesBank] = useState<RegistryBank | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  const { data: organizationsResponse } = useOrganizations();
  const { data: countriesData, isLoading: countriesLoading } = useRegistryCountries();
  const countries = useMemo(() => countriesData?.countries || [], [countriesData]);
  const rights = countriesData?.rights || NO_RIGHTS;
  const canMaintain = Object.values(rights).some(Boolean);

  // Start on the organization's own country, else the first country with banks.
  useEffect(() => {
    if (country || !countries.length) return;
    const orgs = Array.isArray(organizationsResponse)
      ? organizationsResponse
      : (organizationsResponse as any)?.results || [];
    const orgCountry = orgs[0]?.country_code;
    const initial =
      countries.find((c) => c.code === orgCountry) || countries.find((c) => c.bank_count > 0) || countries[0];
    if (initial) setCountry(initial.code);
  }, [country, countries, organizationsResponse]);

  useEffect(() => setPage(1), [country, debouncedSearch, showInactive]);

  const { data, isLoading, isFetching, error } = useRegistryBanks(country || undefined, {
    search: debouncedSearch,
    page,
    activeOnly: !showInactive,
  });
  const banks = data?.results || [];
  const selectedCountry = countries.find((c) => c.code === country);

  const openBankForm = (bank: RegistryBank | null) => {
    setEditingBank(bank);
    setBankFormOpen(true);
  };

  return (
    <div className="min-h-screen bg-[rgb(var(--page-bg))]">
      <PageHeader
        title="Banks & Branches"
        subtitle="The banks and branch codes available when paying recipients"
        breadcrumbs={[{ label: "Banking", href: "/banking" }, { label: "Banks & Branches" }]}
      >
        {rights.add_bank && (
          <Button size="sm" onClick={() => openBankForm(null)} className="h-9 bg-primary hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />
            Add Bank
          </Button>
        )}
      </PageHeader>

      <div className="px-6 py-6 space-y-4">
        {countriesData && !canMaintain && (
          <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-4 py-3">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              This list is shared by every organization, so it is read-only for you. If a bank or
              branch is missing, ask a platform administrator with bank registry rights to add it.
            </p>
          </div>
        )}

        <div className="bg-card rounded-lg border border-border">
          <div className="px-6 py-4 border-b border-border flex flex-wrap items-end gap-3">
            <div className="w-full sm:w-64">
              <SearchableSelect
                label="Country"
                placeholder={countriesLoading ? "Loading countries…" : "Select country…"}
                value={country}
                displayValue={selectedCountry?.name || ""}
                loading={countriesLoading}
                options={countries.map((c) => ({
                  value: c.code,
                  label: c.name,
                  hint: c.bank_count ? `${c.bank_count} bank${c.bank_count === 1 ? "" : "s"}` : "no banks yet",
                }))}
                onSelect={setCountry}
              />
            </div>
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search bank name, code or SWIFT…"
                className="h-10 pl-9"
              />
            </div>
            <label className="flex items-center gap-2 h-10 text-xs text-muted-foreground cursor-pointer">
              <Switch
                checked={showInactive}
                onCheckedChange={setShowInactive}
                className="data-[state=checked]:bg-primary"
              />
              Show inactive
            </label>
          </div>

          {error ? (
            <p className="px-6 py-12 text-center text-sm text-destructive">
              Couldn&apos;t load banks — {(error as Error).message}
            </p>
          ) : isLoading || !country ? (
            <p className="px-6 py-12 text-center text-sm text-muted-foreground">Loading banks…</p>
          ) : banks.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Landmark className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-foreground">
                {debouncedSearch
                  ? `No banks in ${selectedCountry?.name} match "${debouncedSearch}".`
                  : `No banks on file for ${selectedCountry?.name} yet.`}
              </p>
              {rights.add_bank && (
                <Button variant="outline" size="sm" className="mt-4 h-9" onClick={() => openBankForm(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add a bank in {selectedCountry?.name}
                </Button>
              )}
            </div>
          ) : (
            <div className={`overflow-x-auto transition-opacity ${isFetching ? "opacity-60" : ""}`}>
              <table className="w-full table-professional">
                <thead>
                  <tr>
                    <th>Bank</th>
                    <th>SWIFT / BIC</th>
                    <th>Type</th>
                    <th>Branches</th>
                    <th>Status</th>
                    <th className="w-20"></th>
                  </tr>
                </thead>
                <tbody>
                  {banks.map((bank) => (
                    <tr key={bank.id} className="cursor-pointer" onClick={() => setBranchesBank(bank)}>
                      <td className="cell-primary">
                        <div>{bank.short_name || bank.name}</div>
                        {bank.short_name && bank.short_name !== bank.name && (
                          <div className="cell-sub">{bank.name}</div>
                        )}
                      </td>
                      <td className="font-mono text-xs">{bank.swift_code || "—"}</td>
                      <td className="cell-muted">{BANK_TYPE_LABELS[bank.bank_type] || bank.bank_type}</td>
                      <td>
                        {bank.branch_count > 0 ? (
                          bank.branch_count.toLocaleString()
                        ) : (
                          <span className="text-xs text-destructive">None</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge
                          status={bank.is_active ? "success" : "draft"}
                          label={bank.is_active ? "Active" : "Inactive"}
                          size="sm"
                        />
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          {rights.change_bank && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
                              onClick={(e) => {
                                e.stopPropagation();
                                openBankForm(bank);
                              }}
                              aria-label={`Edit ${bank.name}`}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {data && data.count > 0 && (
            <div className="px-6 py-3 border-t border-border">
              <RegistryPager
                page={page}
                count={data.count}
                hasNext={!!data.next}
                onPageChange={setPage}
                noun="bank"
              />
            </div>
          )}
        </div>
      </div>

      <BankFormDialog
        open={bankFormOpen}
        onClose={() => setBankFormOpen(false)}
        bank={editingBank}
        countries={countries}
        defaultCountry={country}
        // Jump to the new bank's country so it is visible straight away.
        onSaved={(saved) => setCountry(saved.country)}
      />

      <BranchesSheet bank={branchesBank} rights={rights} onClose={() => setBranchesBank(null)} />
    </div>
  );
}
