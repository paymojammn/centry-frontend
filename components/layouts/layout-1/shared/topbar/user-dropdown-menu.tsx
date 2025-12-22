import { ReactNode } from 'react';
import {
  BetweenHorizontalStart,
  Moon,
  Settings,
  Shield,
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { clearAuthToken } from '@/lib/api';

export function UserDropdownMenu({ trigger }: { trigger: ReactNode }) {
  const { theme, setTheme } = useTheme();
  const router = useRouter();

  const handleThemeToggle = (checked: boolean) => {
    setTheme(checked ? 'dark' : 'light');
  };

  const handleLogout = async () => {
    await clearAuthToken();
    router.push('/auth/login');
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 border-[rgb(var(--divider-warm))]" side="bottom" align="end">
        {/* Header */}
        <div className="flex items-center justify-between p-3 border-b border-[rgb(var(--divider-light))]">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-full border-2 border-[#638C80] bg-[#638C80]/10 flex items-center justify-center">
              <UserCircle className="h-6 w-6 text-[#638C80]" />
            </div>
            <div className="flex flex-col">
              <Link
                href="/account/profile"
                className="text-sm font-semibold text-black hover:text-[#638C80] transition-colors"
              >
                Admin
              </Link>
              <span className="text-xs text-muted-foreground">
                Administrator
              </span>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-[rgb(var(--divider-light))]" />

        {/* Menu Items */}
        <DropdownMenuItem asChild className="hover:bg-[var(--hover-row)] focus:bg-[var(--hover-row)]">
          <Link
            href="/account/profile"
            className="flex items-center gap-2 text-black hover:text-[#638C80]"
          >
            <UserCircle className="text-[#638C80]" />
            My Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="hover:bg-[var(--hover-row)] focus:bg-[var(--hover-row)]">
          <Link
            href="/organizations"
            className="flex items-center gap-2 text-black hover:text-[#638C80]"
          >
            <Users className="text-[#638C80]" />
            Organizations
          </Link>
        </DropdownMenuItem>

        {/* Account Settings Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="flex items-center gap-2 hover:bg-[var(--hover-row)] text-black hover:text-[#638C80]">
            <Settings className="text-[#638C80]" />
            Settings
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48 border-[rgb(var(--divider-warm))]">
            <DropdownMenuItem asChild className="hover:bg-[var(--hover-row)] focus:bg-[var(--hover-row)]">
              <Link
                href="/account/security"
                className="flex items-center gap-2 text-black hover:text-[#638C80]"
              >
                <Shield className="text-[#638C80]" />
                Security
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild className="hover:bg-[var(--hover-row)] focus:bg-[var(--hover-row)]">
              <Link
                href="/integrations"
                className="flex items-center gap-2 text-black hover:text-[#638C80]"
              >
                <BetweenHorizontalStart className="text-[#638C80]" />
                Integrations
              </Link>
            </DropdownMenuItem>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator className="bg-[rgb(var(--divider-light))]" />

        {/* Footer */}
        <DropdownMenuItem
          className="flex items-center gap-2 hover:bg-[var(--hover-row)] focus:bg-[var(--hover-row)]"
          onSelect={(event) => event.preventDefault()}
        >
          <Moon className="text-[#638C80]" />
          <div className="flex items-center gap-2 justify-between grow text-black">
            Dark Mode
            <Switch
              size="sm"
              checked={theme === 'dark'}
              onCheckedChange={handleThemeToggle}
            />
          </div>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-[rgb(var(--divider-light))]" />
        <div className="p-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full border-[rgb(var(--divider-warm))] hover:bg-[#638C80] hover:text-white hover:border-[#638C80] transition-colors" 
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
