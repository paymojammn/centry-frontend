import { ReactNode, useMemo, useState } from 'react';
import {
  CreditCard,
  FileText,
  BarChart3,
  Building2,
  Landmark,
  ArrowRightLeft,
  CheckSquare,
  FileDown,
  FileUp,
  Search,
  Shield,
  ShieldCheck,
  Send,
  TrendingUp,
  User,
  Wallet,
  Users,
  Receipt,
  Banknote,
} from 'lucide-react';
import { useOrgFeatures } from '@/hooks/use-user';
import type { OrgFeature } from '@/lib/features';
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
  /** Shown only when the selected organization has this feature on. */
  feature?: OrgFeature;
}

// Mirrors MENU_SIDEBAR (config/layout-1.config.tsx) plus the account and
// organization pages that live in the user menu. Every path here is a real route.
const NAV_ITEMS: NavItem[] = [
  // Main
  { icon: BarChart3, label: 'Dashboard', path: '/dashboard', keywords: ['home', 'overview', 'stats'], section: 'Main' },
  { icon: Receipt, label: 'Expenses', path: '/expenses', keywords: ['spend', 'cost', 'claims'], section: 'Main', feature: 'expenses' },
  { icon: Wallet, label: 'Wallet', path: '/wallet', keywords: ['balance', 'funds'], section: 'Main', feature: 'wallet' },
  // ERP
  { icon: FileText, label: 'Invoices', path: '/erp/invoices', keywords: ['receivables', 'customers', 'sales'], section: 'ERP' },
  { icon: FileText, label: 'Bills', path: '/erp/bills', keywords: ['payables', 'vendor', 'purchases'], section: 'ERP' },
  { icon: Users, label: 'Vendors', path: '/erp/vendors', keywords: ['suppliers', 'contacts', 'bank details'], section: 'ERP' },
  // Banking
  { icon: FileUp, label: 'Banking Dashboard', path: '/banking/export', keywords: ['pain.001', 'bank file', 'xml'], section: 'Banking' },
  { icon: ArrowRightLeft, label: 'Bank Payments', path: '/banking/transactions', keywords: ['payments', 'history'], section: 'Banking' },
  { icon: CheckSquare, label: 'Approvals', path: '/banking/approvals', keywords: ['approve', 'maker', 'checker', 'queue'], section: 'Banking' },
  { icon: FileDown, label: 'ERP Sync', path: '/banking/reconciliation', keywords: ['pain.002', 'bank response', 'sync'], section: 'Banking' },
  { icon: Building2, label: 'Accounts', path: '/banking/accounts', keywords: ['accounts', 'iban'], section: 'Banking' },
  { icon: Landmark, label: 'Banks', path: '/banking/banks', keywords: ['bank', 'branch', 'sort code', 'swift', 'registry'], section: 'Banking' },
  // Payments (mobile money)
  { icon: TrendingUp, label: 'Pay In', path: '/payments/payin', keywords: ['collect', 'request to pay', 'mobile money'], section: 'Payments', feature: 'mobile_money' },
  { icon: Send, label: 'Pay Out', path: '/payments/payout', keywords: ['disburse', 'transfer', 'send', 'mobile money'], section: 'Payments', feature: 'mobile_money' },
  { icon: CreditCard, label: 'Reconciliation', path: '/payments', keywords: ['match', 'unmatched', 'mobile money'], section: 'Payments', feature: 'mobile_money' },
  // Rails certification
  { icon: Send, label: 'MTN Sign-off', path: '/payments/mtn-certification', keywords: ['momo', 'sit', 'certification'], section: 'Rails', feature: 'rails_certification' },
  { icon: Send, label: 'Airtel Sign-off', path: '/payments/airtel-certification', keywords: ['airtel money', 'certification'], section: 'Rails', feature: 'rails_certification' },
  { icon: Send, label: 'Ozow Sign-off', path: '/banking/ozow/signoff', keywords: ['eft', 'south africa', 'certification'], section: 'Rails', feature: 'rails_certification' },
  { icon: Send, label: 'Onegate Sign-off', path: '/banking/onegate/signoff', keywords: ['card', 'south africa', 'certification'], section: 'Rails', feature: 'rails_certification' },
  // Lending
  { icon: Banknote, label: 'Loan Book', path: '/lending', keywords: ['loans', 'borrowers', 'sacco'], section: 'Lending', feature: 'lending' },
  { icon: Banknote, label: 'Collections', path: '/lending/collections', keywords: ['repayments', 'due', 'instalments'], section: 'Lending', feature: 'lending' },
  { icon: Banknote, label: 'Disbursements', path: '/lending/disbursements', keywords: ['payout', 'loan release'], section: 'Lending', feature: 'lending' },
  // Reports
  { icon: BarChart3, label: 'Reports', path: '/reports', keywords: ['analytics', 'pipeline', 'charts', 'overview'], section: 'Reports' },
  { icon: ArrowRightLeft, label: 'Payments report', path: '/reports/payments', keywords: ['history', 'export'], section: 'Reports' },
  { icon: Shield, label: 'Exceptions report', path: '/reports/exceptions', keywords: ['failed', 'errors', 'rejected'], section: 'Reports' },
  { icon: Receipt, label: 'Expenses report', path: '/reports/expenses', keywords: ['spend', 'departments'], section: 'Reports' },
  // Organization
  { icon: Building2, label: 'Organizations', path: '/organizations', keywords: ['org', 'company', 'team'], section: 'Organization' },
  { icon: Users, label: 'Users', path: '/organizations/members', keywords: ['members', 'invite', 'roles'], section: 'Organization' },
  { icon: ShieldCheck, label: 'Audit trail', path: '/organizations/audit', keywords: ['log', 'history', 'who did what'], section: 'Organization' },
  // Account
  { icon: User, label: 'My Profile', path: '/account/profile', keywords: ['account', 'name', 'email'], section: 'Account' },
  { icon: Shield, label: 'Security', path: '/account/security', keywords: ['password', '2fa', 'two-factor'], section: 'Account' },
];

export function SearchDialog({ trigger }: { trigger: ReactNode }) {
  const [searchInput, setSearchInput] = useState('');
  const { hasFeature } = useOrgFeatures();

  const available = useMemo(
    () => NAV_ITEMS.filter((item) => !item.feature || hasFeature(item.feature)),
    [hasFeature],
  );

  const filtered = useMemo(() => {
    const query = searchInput.toLowerCase().trim();
    if (!query) return available;
    return available.filter(
      (item) =>
        item.label.toLowerCase().includes(query) ||
        item.keywords.some((kw) => kw.includes(query)) ||
        item.section.toLowerCase().includes(query)
    );
  }, [searchInput, available]);

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
