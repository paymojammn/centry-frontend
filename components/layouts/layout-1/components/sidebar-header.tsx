import { ChevronFirst } from 'lucide-react';
import { toAbsoluteUrl } from '@/lib/helpers';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
        <div className="dark:hidden">
          <img
            src={toAbsoluteUrl('/media/app/centry-logo.svg')}
            className="default-logo h-[28px] max-w-none"
            alt="Centry"
          />
          <img
            src={toAbsoluteUrl('/media/app/centry-mini-logo.svg')}
            className="small-logo h-[28px] max-w-none"
            alt="Centry"
          />
        </div>
        <div className="hidden dark:block">
          <img
            src={toAbsoluteUrl('/media/app/centry-logo-dark.svg')}
            className="default-logo h-[28px] max-w-none"
            alt="Centry"
          />
          <img
            src={toAbsoluteUrl('/media/app/centry-mini-logo.svg')}
            className="small-logo h-[28px] max-w-none"
            alt="Centry"
          />
        </div>
      </Link>
      <Button
        onClick={handleToggleClick}
        size="sm"
        mode="icon"
        variant="outline"
        className={cn(
          'size-7 absolute start-full top-2/4 rtl:translate-x-2/4 -translate-x-2/4 -translate-y-2/4',
          sidebarCollapse ? 'ltr:rotate-180' : 'rtl:rotate-180',
        )}
      >
        <ChevronFirst className="size-4!" />
      </Button>
    </div>
  );
}
