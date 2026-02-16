'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  RiArrowRightLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiMailLine
} from '@remixicon/react';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';
import { TwoFAChallenge } from '@/components/auth/two-fa-challenge';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [sessionToken, setSessionToken] = useState('');
  const [enabledMethods, setEnabledMethods] = useState<string[]>([]);
  const [preferredMethod, setPreferredMethod] = useState<string | null>(null);

  const redirectTo = searchParams?.get('redirect') || '/dashboard';

  const handleCredentialsLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/token/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Login failed');
      }

      // Check if 2FA is required
      if (data.requires_2fa) {
        setSessionToken(data.session_token);
        setEnabledMethods(data.enabled_methods || []);
        setPreferredMethod(data.preferred_method || null);
        setRequires2FA(true);
        return;
      }

      if (data.access) {
        setAuthToken(data.access);
        toast.success('Welcome back!');
        router.push(redirectTo);
      } else {
        throw new Error('No access token received');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid username or password';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleXeroLogin = () => {
    setIsLoading(true);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const frontendUrl = window.location.origin;
    const redirectUrl = `${frontendUrl}/dashboard`;

    const xeroAuthUrl = `${apiUrl}/api/auth/xero/signin/?redirect_url=${encodeURIComponent(redirectUrl)}`;

    window.location.href = xeroAuthUrl;
  };

  const handle2FASuccess = (tokens: { access: string; refresh: string }) => {
    setAuthToken(tokens.access);
    toast.success('Welcome back!');
    router.push(redirectTo);
  };

  const handle2FACancel = () => {
    setRequires2FA(false);
    setSessionToken('');
    setEnabledMethods([]);
    setPreferredMethod(null);
    setPassword('');
  };

  // Show 2FA challenge if required
  if (requires2FA) {
    return (
      <TwoFAChallenge
        sessionToken={sessionToken}
        enabledMethods={enabledMethods}
        preferredMethod={preferredMethod || enabledMethods[0] || 'email'}
        onSuccess={handle2FASuccess}
        onCancel={handle2FACancel}
      />
    );
  }

  return (
    <div className="fixed inset-0 flex">
      {/* Left - Branding Panel (60%) */}
      <div className="hidden lg:flex w-[60%] bg-[rgb(var(--brand-dark))] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-primary/5" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-[#4E97D1]/5" />
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-16 2xl:p-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[rgb(var(--brand-dark))] font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-semibold text-white">Centry</span>
          </div>

          {/* Main message */}
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-semibold text-white leading-tight mb-6">
              Business payments,
              <br />
              simplified.
            </h1>
            <p className="text-lg xl:text-xl text-white/60 leading-relaxed">
              Automate your accounts payable, sync with your accounting software, and gain real-time visibility into your cash flow.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-8 text-white/40 text-sm">
            <span>500+ companies</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>$50M+ processed</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>99.9% uptime</span>
          </div>
        </div>
      </div>

      {/* Right - Login Form (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col bg-card overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[rgb(var(--brand-dark))] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-lg font-semibold text-foreground">Centry</span>
          </div>
        </div>

        {/* Form container - fills available space */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-12 xl:px-16 2xl:px-20">
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-2xl xl:text-3xl font-semibold text-foreground mb-2">
                Sign in
              </h2>
              <p className="text-muted-foreground">
                Enter your credentials to continue
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-5">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-foreground mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="username"
                    className="w-full h-12 pl-10 pr-4 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="password" className="block text-sm font-medium text-foreground">
                    Password
                  </label>
                  <Link href="/auth/forgot-password" className="text-sm text-[rgb(var(--brand-dark))] hover:underline">
                    Forgot?
                  </Link>
                </div>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="w-full h-12 pl-10 pr-11 border border-border rounded-lg bg-card text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="Enter password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    {showPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Continue</span>
                    <RiArrowRightLine className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-card text-sm text-muted-foreground">or</span>
              </div>
            </div>

            {/* Xero */}
            <button
              onClick={handleXeroLogin}
              disabled={isLoading}
              type="button"
              className="w-full h-12 flex items-center justify-center gap-2.5 border border-border hover:border-border hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="#13B5EA" />
                <path d="M8.145 8.26l2.19 3.35-2.19 3.35c-.19.29-.06.66.29.66h1.32c.23 0 .44-.12.56-.32l1.69-2.7 1.69 2.7c.12.2.33.32.56.32h1.32c.35 0 .48-.37.29-.66l-2.19-3.35 2.19-3.35c.19-.29.06-.66-.29-.66h-1.32c-.23 0-.44.12-.56.32l-1.69 2.7-1.69-2.7c-.12-.2-.33-.32-.56-.32H8.435c-.35 0-.48.37-.29.66z" fill="white" />
              </svg>
              <span className="text-foreground font-medium">Continue with Xero</span>
            </button>

            {/* Footer */}
            <p className="mt-8 text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-[rgb(var(--brand-dark))] font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className="p-6 border-t border-border shrink-0">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Protected by 256-bit SSL encryption</span>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <Link href="/docs/checkout" className="hover:text-foreground hover:underline">
                API Docs
              </Link>
            </div>
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground/60">
              <Link href="/pricing" className="hover:text-muted-foreground hover:underline">
                Pricing
              </Link>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <Link href="/refund-policy" className="hover:text-muted-foreground hover:underline">
                Refund Policy
              </Link>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
              <Link href="/cancellation-policy" className="hover:text-muted-foreground hover:underline">
                Cancellation Policy
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
