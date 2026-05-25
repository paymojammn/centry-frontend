'use client';

import { JSX, useCallback, useMemo } from 'react';
import { MENU_SIDEBAR } from '@/config/layout-1.config';
import { MenuConfig, MenuItem } from '@/config/types';
import { cn } from '@/lib/utils';
import {
  AccordionMenu,
  AccordionMenuClassNames,
  AccordionMenuGroup,
  AccordionMenuItem,
  AccordionMenuLabel,
  AccordionMenuSub,
  AccordionMenuSubContent,
  AccordionMenuSubTrigger,
} from '@/components/ui/accordion-menu';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-user';

export function SidebarMenu() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  // Check if user is finance role or an org owner/admin (bypass)
  const isFinanceOrAdmin = useMemo(() => {
    if (!user) return false;
    if (user.role === 'finance') return true;
    return user.organizations?.some(
      (o) => o.membership_role === 'owner' || o.membership_role === 'admin',
    );
  }, [user]);

  // Filter menu items based on user role
  const filteredMenu = useMemo(() => {
    const items: MenuConfig = [];
    for (let i = 0; i < MENU_SIDEBAR.length; i++) {
      const item = MENU_SIDEBAR[i];

      // If item requires a role, check access
      if (item.requiredRole === 'finance' && !isFinanceOrAdmin) {
        continue;
      }

      // If this is a heading, check if the next non-heading items are all filtered out
      if (item.heading) {
        let hasVisibleChild = false;
        for (let j = i + 1; j < MENU_SIDEBAR.length; j++) {
          const next = MENU_SIDEBAR[j];
          if (next.heading) break;
          if (!next.requiredRole || next.requiredRole !== 'finance' || isFinanceOrAdmin) {
            hasVisibleChild = true;
            break;
          }
        }
        if (!hasVisibleChild) continue;
      }

      items.push(item);
    }
    return items;
  }, [isFinanceOrAdmin]);

  // Memoize matchPath to prevent unnecessary re-renders.
  // Active when the path equals the pathname exactly, or when the
  // pathname is a sub-route under that path — but the boundary has to
  // be a slash, so `/reports` matches `/reports/x` but NOT `/reports`
  // collapsing onto every sibling like `/reports/transactions`.
  const matchPath = useCallback(
    (path: string): boolean =>
      path === pathname ||
      (path.length > 1 && path !== '/layout-1' && pathname.startsWith(path + '/')),
    [pathname],
  );

  // Global classNames for consistent styling - Dark theme with green accents
  // Using ! (important) to override base accordion-menu styles
  const classNames: AccordionMenuClassNames = {
    root: 'space-y-0.5',
    group: 'space-y-0.5',
    label:
      'uppercase text-[11px] font-bold text-white/40 pt-5 pb-2 px-3 tracking-wider',
    separator: 'border-white/10',
    item: 'h-10 bg-transparent! text-white/70! hover:bg-white/5! hover:text-white! data-[selected=true]:bg-primary! data-[selected=true]:text-white! data-[selected=true]:font-semibold data-[selected=true]:shadow-md transition-all duration-200 rounded-lg',
    sub: '',
    subTrigger:
      'h-10 bg-transparent! text-white/70! hover:bg-white/5! hover:text-white! data-[selected=true]:bg-primary! data-[selected=true]:text-white! data-[selected=true]:font-semibold data-[selected=true]:shadow-md transition-all duration-200 rounded-lg',
    subContent: 'py-0.5 ps-6',
    indicator: 'text-primary',
  };

  const buildMenu = (items: MenuConfig): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.heading) {
        return buildMenuHeading(item, index);
      } else if (item.disabled) {
        return buildMenuItemRootDisabled(item, index);
      } else {
        return buildMenuItemRoot(item, index);
      }
    });
  };

  const buildMenuItemRoot = (item: MenuItem, index: number): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub key={index} value={item.path || `root-${index}`}>
          <AccordionMenuSubTrigger className="text-sm font-medium gap-2.5">
            {item.icon && <item.icon data-slot="accordion-menu-icon" className="size-4 shrink-0" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `root-${index}`}
            className=""
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(item.children, 1)}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-sm font-medium"
        >
          <Link
            href={item.path || '#'}
            className="flex items-center grow gap-2.5"
          >
            {item.icon && <item.icon data-slot="accordion-menu-icon" className="size-4 shrink-0" />}
            <span data-slot="accordion-menu-title">{item.title}</span>
          </Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemRootDisabled = (
    item: MenuItem,
    index: number,
  ): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-${index}`}
        className="text-sm font-medium gap-2.5"
      >
        {item.icon && <item.icon data-slot="accordion-menu-icon" className="size-4 shrink-0" />}
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuItemChildren = (
    items: MenuConfig,
    level: number = 0,
  ): JSX.Element[] => {
    return items.map((item: MenuItem, index: number) => {
      if (item.disabled) {
        return buildMenuItemChildDisabled(item, index, level);
      } else {
        return buildMenuItemChild(item, index, level);
      }
    });
  };

  const buildMenuItemChild = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    if (item.children) {
      return (
        <AccordionMenuSub
          key={index}
          value={item.path || `child-${level}-${index}`}
        >
          <AccordionMenuSubTrigger className="text-[13px]">
            {item.collapse ? (
              <span className="text-muted-foreground">
                <span className="hidden [[data-state=open]>span>&]:inline">
                  {item.collapseTitle}
                </span>
                <span className="inline [[data-state=open]>span>&]:hidden">
                  {item.expandTitle}
                </span>
              </span>
            ) : (
              item.title
            )}
          </AccordionMenuSubTrigger>
          <AccordionMenuSubContent
            type="single"
            collapsible
            parentValue={item.path || `child-${level}-${index}`}
            className={cn(
              'ps-4',
              !item.collapse && 'relative',
              !item.collapse && (level > 0 ? '' : ''),
            )}
          >
            <AccordionMenuGroup>
              {buildMenuItemChildren(
                item.children,
                item.collapse ? level : level + 1,
              )}
            </AccordionMenuGroup>
          </AccordionMenuSubContent>
        </AccordionMenuSub>
      );
    } else {
      return (
        <AccordionMenuItem
          key={index}
          value={item.path || ''}
          className="text-[13px]"
        >
          <Link href={item.path || '#'}>{item.title}</Link>
        </AccordionMenuItem>
      );
    }
  };

  const buildMenuItemChildDisabled = (
    item: MenuItem,
    index: number,
    level: number = 0,
  ): JSX.Element => {
    return (
      <AccordionMenuItem
        key={index}
        value={`disabled-child-${level}-${index}`}
        className="text-[13px]"
      >
        <span data-slot="accordion-menu-title">{item.title}</span>
        {item.disabled && (
          <Badge variant="secondary" size="sm" className="ms-auto">
            Soon
          </Badge>
        )}
      </AccordionMenuItem>
    );
  };

  const buildMenuHeading = (item: MenuItem, index: number): JSX.Element => {
    return <AccordionMenuLabel key={index}>{item.heading}</AccordionMenuLabel>;
  };

  return (
    <ScrollArea className="flex grow shrink-0 py-5 px-3 lg:h-[calc(100vh-5.5rem)]">
      <AccordionMenu
        selectedValue={pathname}
        matchPath={matchPath}
        type="single"
        collapsible
        classNames={classNames}
      >
        {buildMenu(filteredMenu)}
      </AccordionMenu>
    </ScrollArea>
  );
}
