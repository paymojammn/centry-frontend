import { ReactNode } from 'react';
import {
  Moon,
  UserCircle,
  Users,
  LogOut,
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { clearAuthToken } from '@/lib/api';
import { useCurrentUser } from '@/hooks/use-user';
import { getInitials } from '@/lib/theme';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();
  const { data: user } = useCurrentUser();

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await clearAuthToken();
    router.push('/auth/login');
  };

  const displayName = user?.full_name || user?.username || 'User';
  const displayRole = user?.role
    ? user.role.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase())
    : 'Member';
  const initials = getInitials(displayName);

  // Which ERP this session signed in with — org visibility is scoped to it.
  const PROVIDER_NAMES: Record<string, string> = {
    xero: 'Xero',
    qbo: 'QuickBooks',
    erpnext: 'ERPNext',
    odoo: 'Odoo',
  };
  const providerLabel = user?.login_provider
    ? PROVIDER_NAMES[user.login_provider] ?? user.login_provider
    : null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-border" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-full border-2 border-primary bg-primary/10 flex items-center justify-center">
              <span className="text-xs font-semibold text-primary">{initials}</span>
            </div>
            <div className="flex flex-col">
              <Link
                href="/account/profile"
                className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                {displayName}
              </Link>
              <span className="text-xs text-muted-foreground">
                {displayRole}
              </span>
            </div>
          </div>
        </div>

        {providerLabel && (
          <div className="px-3 py-1.5 text-[11px] text-muted-foreground border-b border-border">
            Signed in with <span className="font-medium text-foreground">{providerLabel}</span>
          </div>
        )}

        <DropdownMenuSeparator />

        {/* Menu Items */}
        <DropdownMenuItem asChild>
          <Link
            href="/account/profile"
            className="flex items-center gap-2 text-foreground hover:text-primary"
          >
            <UserCircle className="text-primary" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link
            href="/organizations"
            className="flex items-center gap-2 text-foreground hover:text-primary"
          >
            <Users className="text-primary" />
            Organizations
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Footer */}
        <DropdownMenuItem
          onSelect={(event) => event.preventDefault()}
        >
          <Moon className="text-primary" />
          <div className="flex items-center gap-2 justify-between grow text-foreground">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full hover:bg-primary hover:text-white hover:border-primary transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
