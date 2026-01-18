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
        'sidebar bg-[#1c252c] lg:border-e lg:border-[#2d3a44] lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (sidebarTheme === 'dark' || pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="sidebar-wrapper overflow-hidden">
        <div className="sidebar-logo w-(--sidebar-default-width)">
          <SidebarMenu />
        </div>
      </div>
    </div>
  );
}
