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
        'sidebar bg-[rgb(var(--brand-dark))] lg:border-e lg:border-[rgb(var(--brand-dark-light))] lg:fixed lg:top-0 lg:bottom-0 lg:z-20 lg:flex flex-col items-stretch shrink-0',
        (sidebarTheme === 'dark' || pathname.includes('dark-sidebar')) &&
          'dark',
      )}
    >
      <SidebarHeader />
      <div className="sidebar-wrapper overflow-hidden">
        {/* Width is owned by demo1.css / sidebar-collapse rules — don't
            hardcode a Tailwind utility here or it overrides the collapse
            width and the menu items push their icons off-screen. */}
        <div className="sidebar-logo">
          <SidebarMenu />
        </div>
      </div>
    </div>
  );
}
