'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Package, Plug, Search } from 'lucide-react';
import { FiscalConnectionSelect } from '@/components/fiscal/connection-select';
import { DataView } from '@/components/fiscal/data-view';
import { GoodsRegisterForm } from '@/components/fiscal/goods-register-form';
import { StockAdjustForm } from '@/components/fiscal/stock-adjust-form';
import { ContentCard } from '@/components/layout/content-card';
import { EmptyState } from '@/components/layout/empty-state';
import { LoadingState } from '@/components/layout/loading-state';
import { PageHeader } from '@/components/layout/page-header';
import { PageTabs } from '@/components/layout/page-tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useFiscalConnections, useFiscalGoods } from '@/hooks/use-fiscal';
import { useFiscalOrganization } from '@/hooks/use-fiscal-organization';
import { supportsGoodsAndStock } from '@/lib/fiscal';

const TABS = [
  { id: 'inquiry', label: 'Goods' },
  { id: 'register', label: 'Register goods' },
  { id: 'stock', label: 'Stock adjustment' },
];

export default function FiscalGoodsPage() {
  const { organizations, organizationId, setOrganizationId, isLoadingOrgs } = useFiscalOrganization();
  const { data: connectionsPage, isLoading: connectionsLoading } = useFiscalConnections(organizationId);
  // Goods & stock are URA EFRIS (UG) only; ZRA and DGI connections are hidden.
  const connections = (connectionsPage?.results ?? []).filter(
    (c) => c.is_active && supportsGoodsAndStock(c.country_code),
  );

  const [pickedId, setPickedId] = useState<string>('');
  const connection = connections.find((c) => c.id === pickedId) ?? connections[0];
  const connectionId = connection?.id ?? '';
  const pickConnection = (id: string) => {
    setPickedId(id);
    setGoodsPage(1);
  };

  const [tab, setTab] = useState('inquiry');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [goodsPage, setGoodsPage] = useState(1);
  const goods = useFiscalGoods(tab === 'inquiry' ? connectionId : null, search, goodsPage);
  const records = goods.data?.records ?? [];
  // EFRIS page block: {pageNo, pageSize, totalSize, pageCount}.
  const pageCount = Number(goods.data?.page?.pageCount ?? 1) || 1;
  const totalSize = Number(goods.data?.page?.totalSize ?? records.length) || records.length;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Goods & Stock"
        organizations={organizations}
        selectedOrganizationId={organizationId}
        onOrganizationChange={setOrganizationId}
        isLoadingOrgs={isLoadingOrgs}
      >
        {connections.length > 0 && (
          <FiscalConnectionSelect connections={connections} value={connectionId} onChange={pickConnection} className="h-9 w-72" />
        )}
      </PageHeader>

      {connectionsLoading ? (
        <LoadingState />
      ) : !connection ? (
        <div className="px-6 py-6">
          <ContentCard>
            <EmptyState
              icon={Plug}
              title="No active URA EFRIS connection"
              description="Goods and stock management is available for Uganda (URA EFRIS) connections only."
            >
              <Button asChild size="sm">
                <Link href="/fiscal/connections">Go to connections</Link>
              </Button>
            </EmptyState>
          </ContentCard>
        </div>
      ) : (
        <>
          <PageTabs tabs={TABS} activeTab={tab} onTabChange={setTab} />
          <div className="px-6 py-6 space-y-4">

            {tab === 'inquiry' && (
              <ContentCard noPadding>
                <form
                  className="px-4 py-3 border-b border-border flex items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    setSearch(searchInput.trim() || undefined);
                    setGoodsPage(1);
                  }}
                >
                  <div className="relative w-72 max-w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      placeholder="Goods code or name"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      className="pl-9 h-9 bg-card border-border text-sm"
                    />
                  </div>
                  <Button type="submit" size="sm" variant="outline" className="h-9">
                    Search
                  </Button>
                </form>
                {goods.isLoading ? (
                  <LoadingState />
                ) : goods.error ? (
                  <div className="text-center py-16">
                    <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground">Goods inquiry failed</p>
                    <p className="text-sm text-muted-foreground mt-1">{goods.error.message}</p>
                  </div>
                ) : records.length === 0 ? (
                  <EmptyState
                    icon={Package}
                    title={search ? 'No goods match your search' : 'No goods registered'}
                    description="Register goods with the authority before invoicing them."
                  />
                ) : (
                  <>
                    <DataView data={records} />
                    <div className="flex items-center justify-between px-4 py-3 border-t border-border text-sm">
                      <span className="text-muted-foreground">
                        {totalSize} goods · page {goodsPage} of {pageCount}
                      </span>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" disabled={goodsPage <= 1} onClick={() => setGoodsPage((p) => p - 1)}>
                          Previous
                        </Button>
                        <Button variant="outline" size="sm" disabled={goodsPage >= pageCount} onClick={() => setGoodsPage((p) => p + 1)}>
                          Next
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </ContentCard>
            )}

            {tab === 'register' && (
              <ContentCard>
                <GoodsRegisterForm key={connectionId} connectionId={connectionId} />
              </ContentCard>
            )}

            {tab === 'stock' && (
              <ContentCard>
                <StockAdjustForm key={connectionId} connectionId={connectionId} />
              </ContentCard>
            )}
          </div>
        </>
      )}
    </div>
  );
}
