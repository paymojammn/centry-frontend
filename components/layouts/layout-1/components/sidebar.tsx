import { cn } from '@/lib/utils';
import { useLayout } from './context';
import { SidebarHeader } from './sidebar-header';
import { SidebarMenu } from './sidebar-menu';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const { sidebarTheme } = useLayout();
  const pathname = usePathname();

  return (
    <div
      className={cn(
        'sidebar bg-gradient-to-b from-white via-gray-50/30 to-white lg:border-e lg:border-gray-200 lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0 shadow-sm',
        (sidebarTheme === 'dark' || pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="overflow-hidden">
        <div className="w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
    </div>
  );
}
