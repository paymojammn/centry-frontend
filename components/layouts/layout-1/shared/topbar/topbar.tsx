import { Search, Bell, UserCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UserDropdownMenu } from './user-dropdown-menu';

export function StoreClientTopbar() {
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative lg:w-[280px] me-3">
          <Search className="size-4 text-muted-foreground absolute top-1/2 -translate-y-1/2 start-3" />
          <Input 
            type="text" 
            className="ps-9 pe-3 border-[rgb(var(--divider-warm))] focus:ring-[#638C80] focus:border-[#638C80]" 
            placeholder="Search bills, vendors, transactions..." 
          />
        </div>

        {/* Notifications */}
        <Button
          variant="ghost"
          size="lg"
          mode="icon"
          shape="circle"
          className="hover:text-[#638C80] hover:bg-[var(--hover-row)] relative transition-colors"
        >
          <Bell className="size-5!" />
          <Badge
            className="absolute top-0.5 end-0.5 bg-[#638C80] text-white border-none"
            size="xs"
            shape="circle"
          >
            3
          </Badge>
        </Button>

        {/* User Menu */}
        <UserDropdownMenu
          trigger={
            <Button
              variant="ghost"
              size="lg"
              mode="icon"
              shape="circle"
              className="hover:text-[#638C80] hover:bg-[var(--hover-row)] transition-colors"
            >
              <UserCircle className="size-5!" />
            </Button>
          }
        />
      </div>
    </>
  );
}
