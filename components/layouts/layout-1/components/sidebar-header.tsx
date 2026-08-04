import { ChevronFirst } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BRAND } from '@/config/brand';
import { useLayout } from './context';
import Link from 'next/link';

export function SidebarHeader() {
  const { sidebarCollapse, setSidebarCollapse } = useLayout();

  const handleToggleClick = () => {
    setSidebarCollapse(!sidebarCollapse);
  };

  return (
    <div className="sidebar-header hidden lg:flex items-center relative justify-between px-3 lg:px-6 shrink-0">
      <Link href="/dashboard">
        {/* Full logo (with border) when expanded, mini P mark when collapsed */}
        <img
          src={toAbsoluteUrl(BRAND.logo.markDark)}
          className="default-logo h-[32px] max-w-none"
          alt={BRAND.name}
        />
        <img
          src={toAbsoluteUrl(BRAND.logo.miniDark)}
          className="small-logo h-[28px] max-w-none"
          alt={BRAND.name}
        />
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4 border-[rgb(var(--brand-dark-light))] bg-[rgb(var(--brand-dark))] text-white/70 hover:bg-[rgb(var(--brand-dark-light))] hover:text-white',
          sidebarCollapse ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
