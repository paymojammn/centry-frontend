import { ReactNode, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
  BarChart3,
  Building2,
  ArrowRightLeft,
  FileDown,
  FileUp,
  Search,
  Shield,
  Settings,
  User,
  Wallet,
  Users,
  Receipt,
} from 'lucide-react';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  keywords: string[];
  section: string;
}

const NAV_ITEMS: NavItem[] = [
  // Main
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard', keywords: ['home', 'overview', 'stats'], section: 'Main' },
  { icon: FileText, label: 'Bills', path: '/erp/bills', keywords: ['invoices', 'payables', 'vendor'], section: 'Main' },
  { icon: CreditCard, label: 'Payments', path: '/payments', keywords: ['pay', 'transfer', 'send'], section: 'Main' },
  { icon: Receipt, label: 'Expenses', path: '/expenses', keywords: ['spend', 'cost', 'claims'], section: 'Main' },
  { icon: Users, label: 'Vendors', path: '/erp/vendors', keywords: ['suppliers', 'contacts'], section: 'Main' },
  { icon: Wallet, label: 'Wallet', path: '/wallet', keywords: ['balance', 'funds'], section: 'Main' },
  // Banking
  { icon: FileUp, label: 'Export Payments', path: '/banking/export', keywords: ['pain.001', 'bank file', 'xml'], section: 'Banking' },
  { icon: ArrowRightLeft, label: 'Transactions', path: '/banking/transactions', keywords: ['payments', 'history'], section: 'Banking' },
  { icon: FileDown, label: 'Reconciliation', path: '/banking/reconciliation', keywords: ['pain.002', 'bank response', 'sync'], section: 'Banking' },
  { icon: Building2, label: 'Bank Accounts', path: '/banking/accounts', keywords: ['accounts', 'iban'], section: 'Banking' },
  // Reports
  { icon: BarChart3, label: 'Reports', path: '/reports', keywords: ['analytics', 'pipeline', 'charts'], section: 'Reports' },
  { icon: ArrowRightLeft, label: 'Transaction Reports', path: '/reports/transactions', keywords: ['history', 'export'], section: 'Reports' },
  // Settings
  { icon: User, label: 'My Profile', path: '/account/profile', keywords: ['account', 'name', 'email'], section: 'Settings' },
  { icon: Shield, label: 'Security', path: '/account/security', keywords: ['password', '2fa', 'two-factor'], section: 'Settings' },
  { icon: Building2, label: 'Organizations', path: '/organizations', keywords: ['org', 'company', 'team'], section: 'Settings' },
  { icon: Settings, label: 'Integrations', path: '/integrations', keywords: ['xero', 'erp', 'connect'], section: 'Settings' },
];

export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const [searchInput, setSearchInput] = useState('');

  const filtered = useMemo(() => {
    const query = searchInput.toLowerCase().trim();
    if (!query) return NAV_ITEMS;
    return NAV_ITEMS.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((kw) => kw.includes(query)) ||
        item.section.toLowerCase().includes(query)
    );
  }, [searchInput]);

  const grouped = useMemo(() => {
    const sections: Record<string, NavItem[]> = {};
    for (const item of filtered) {
      if (!sections[item.section]) sections[item.section] = [];
      sections[item.section].push(item);
    }
    return sections;
  }, [filtered]);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="lg:max-w-[480px] lg:top-[15%] lg:translate-y-0 p-0 [&_[data-slot=dialog-close]]:top-5.5 [&_[data-slot=dialog-close]]:end-5.5">
        <DialogHeader className="px-4 py-1 mb-1">
          <DialogTitle></DialogTitle>
          <DialogDescription></DialogDescription>
          <div className="relative">
            <Search className="absolute top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              name="query"
              value={searchInput}
              className="ps-6 outline-none! ring-0! shadow-none! border-0"
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search pages..."
            />
          </div>
        </DialogHeader>
        <DialogBody className="p-0 pb-4">
          <ScrollArea className="h-[380px]">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Search className="h-5 w-5 text-muted-foreground/50" />
                </div>
                <p className="text-sm font-medium text-foreground">No results</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try a different search term
                </p>
              </div>
            ) : (
              Object.entries(grouped).map(([section, items]) => (
                <div key={section}>
                  <div className="px-5 py-2">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {section}
                    </span>
                  </div>
                  {items.map((item) => (
                    <Link
                      key={item.path}
                      href={item.path}
                      className="flex items-center gap-3 px-5 py-2.5 hover:bg-muted transition-colors cursor-pointer"
                    >
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm text-foreground">{item.label}</span>
                    </Link>
                  ))}
                </div>
              ))
            )}
          </ScrollArea>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
