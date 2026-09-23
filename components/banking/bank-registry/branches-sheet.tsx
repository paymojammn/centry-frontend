'use client';

import { useEffect, useState } from 'react';
import { Pencil, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { StatusBadge } from '@/components/ui/status-badge';
import { useRegistryBranches } from '@/hooks/use-bank-registry';
import type { RegistryBank, RegistryBranch, RegistryRights } from '@/lib/bank-registry-api';
import { BranchFormDialog } from './branch-form-dialog';
import { RegistryPager } from './registry-pager';
import { useDebouncedValue } from './use-debounced-value';

interface Props {
  bank: RegistryBank | null;
  rights: RegistryRights;
  onClose: () => void;
}

export function BranchesSheet({ bank, rights, onClose }: Props) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RegistryBranch | null>(null);
  const debouncedSearch = useDebouncedValue(search);

  useEffect(() => {
    setSearch('');
    setPage(1);
  }, [bank?.id]);
  useEffect(() => setPage(1), [debouncedSearch]);

  const { data, isLoading, error } = useRegistryBranches(bank?.id, { search: debouncedSearch, page });
  const branches = data?.results || [];

  const openForm = (branch: RegistryBranch | null) => {
    setEditing(branch);
    setFormOpen(true);
  };

  return (
    <Sheet open={!!bank} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:w-[520px] sm:max-w-none p-0 gap-0 flex flex-col">
        {bank && (
          <>
            <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
              <SheetTitle>{bank.short_name || bank.name}</SheetTitle>
              <SheetDescription>
                {bank.country_name}
                {bank.swift_code ? ` · SWIFT ${bank.swift_code}` : ''} · Branches
              </SheetDescription>
            </SheetHeader>

            <div className="px-6 py-3 flex items-center gap-2 border-b border-border">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search branch name or code…"
                  className="h-9 pl-9"
                />
              </div>
              {rights.add_branch && (
                <Button
                  size="sm"
                  onClick={() => openForm(null)}
                  className="h-9 bg-primary hover:bg-primary/90 text-white"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Add Branch
                </Button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto">
              {error ? (
                <p className="px-6 py-10 text-center text-sm text-destructive">
                  Couldn&apos;t load branches — {(error as Error).message}
                </p>
              ) : isLoading ? (
                <p className="px-6 py-10 text-center text-sm text-muted-foreground">Loading branches…</p>
              ) : branches.length === 0 ? (
                <div className="px-6 py-10 text-center">
                  <p className="text-sm text-foreground">
                    {debouncedSearch ? 'No branches match your search.' : 'No branches on file for this bank.'}
                  </p>
                  {!debouncedSearch && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Local transfers need a branch code, so this bank can&apos;t be paid locally yet.
                    </p>
                  )}
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {branches.map((b) => (
                    <li key={b.id} className="px-6 py-3 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">
                          {b.branch_name || 'Branch'}
                          {b.is_head_office && (
                            <span className="ml-2 text-[11px] text-primary font-medium">Head office</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{b.branch_code}</p>
                      </div>
                      {!b.is_active && <StatusBadge status="draft" label="Inactive" size="sm" />}
                      {rights.change_branch && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-muted-foreground/60 hover:text-foreground"
                          onClick={() => openForm(b)}
                          aria-label={`Edit ${b.branch_name || b.branch_code}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {data && data.count > 0 && (
              <div className="px-6 py-3 border-t border-border">
                <RegistryPager
                  page={page}
                  count={data.count}
                  hasNext={!!data.next}
                  onPageChange={setPage}
                  noun="branch"
                  plural="branches"
                />
              </div>
            )}

            <BranchFormDialog
              open={formOpen}
              onClose={() => setFormOpen(false)}
              bank={bank}
              branch={editing}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
