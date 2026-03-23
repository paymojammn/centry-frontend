'use client';

import { useEffect, useState } from 'react';
import { getApiUrl } from '@/config/api';

// Provider branding config — add new providers here
const PROVIDER_BRANDING: Record<string, {
  label: string;
  bg: string;
  hover: string;
  icon: React.ReactNode;
}> = {
  xero: {
    label: 'Xero',
    bg: 'bg-[#13B5EA]',
    hover: 'hover:bg-[#0fa0d1]',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="white" fillOpacity="0.2" />
        <path d="M8.145 8.26l2.19 3.35-2.19 3.35c-.19.29-.06.66.29.66h1.32c.23 0 .44-.12.56-.32l1.69-2.7 1.69 2.7c.12.2.33.32.56.32h1.32c.35 0 .48-.37.29-.66l-2.19-3.35 2.19-3.35c.19-.29.06-.66-.29-.66h-1.32c-.23 0-.44.12-.56.32l-1.69 2.7-1.69-2.7c-.12-.2-.33-.32-.56-.32H8.435c-.35 0-.48.37-.29.66z" fill="white" />
      </svg>
    ),
  },
  qbo: {
    label: 'QuickBooks',
    bg: 'bg-[#2CA01C]',
    hover: 'hover:bg-[#249117]',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.2" />
        <path d="M12 4C7.58 4 4 7.58 4 12s3.58 8 8 8 8-3.58 8-8-3.58-8-8-8zm0 14.4c-3.53 0-6.4-2.87-6.4-6.4S8.47 5.6 12 5.6s6.4 2.87 6.4 6.4-2.87 6.4-6.4 6.4zm-1.6-9.6h3.2c.88 0 1.6.72 1.6 1.6v3.2c0 .88-.72 1.6-1.6 1.6h-3.2c-.88 0-1.6-.72-1.6-1.6v-3.2c0-.88.72-1.6 1.6-1.6z" fill="white" />
      </svg>
    ),
  },
  sage: {
    label: 'Sage',
    bg: 'bg-[#00DC00]',
    hover: 'hover:bg-[#00c400]',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.2" />
        <path d="M7 12.5l3.5 3.5 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
};

// Fallback branding for unknown providers
const DEFAULT_BRANDING = {
  label: '',
  bg: 'bg-gray-700',
  hover: 'hover:bg-gray-600',
  icon: (
    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="12" fill="white" fillOpacity="0.2" />
      <path d="M12 6v12M6 12h12" stroke="white" strokeWidth="2" strokeLinecap="round" />
    </svg>
  ),
};

interface Provider {
  id: string;
  code: string;
  name: string;
}

export default function LoginPage() {
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/v1/erp/providers/available/`)
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => {
        // Fallback: show Xero and QuickBooks if API is unreachable
        setProviders([
          { id: '1', code: 'xero', name: 'Xero' },
          { id: '2', code: 'qbo', name: 'QuickBooks Online' },
        ]);
      });
  }, []);

  const handleProviderLogin = (code: string) => {
    setLoadingProvider(code);

    const apiUrl = getApiUrl();
    const frontendUrl = window.location.origin;
    const redirectUrl = `${frontendUrl}/dashboard`;

    const authUrl = `${apiUrl}/api/auth/${code}/signin/?redirect_url=${encodeURIComponent(redirectUrl)}`;
    window.location.href = authUrl;
  };

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
              One platform to manage payables, sync with your accounting software, and control your cash flow in real time.
            </p>
          </div>

          {/* Footer */}
          <div />
        </div>
      </div>

      {/* Right - Login (40%) */}
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

        {/* Content - fills available space */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-12 xl:px-16 2xl:px-20">
          <div className="w-full max-w-sm mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-2xl xl:text-3xl font-semibold text-foreground mb-2">
                Welcome to Centry
              </h2>
              <p className="text-muted-foreground">
                Sign in with your accounting software
              </p>
            </div>

            {/* Provider Buttons */}
            <div className="space-y-3">
              {providers.map((provider, index) => {
                const branding = PROVIDER_BRANDING[provider.code] || {
                  ...DEFAULT_BRANDING,
                  label: provider.name,
                };
                const isLoading = loadingProvider === provider.code;

                return (
                  <div key={provider.id}>
                    {index > 0 && (
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-xs text-muted-foreground">or</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                    <button
                      onClick={() => handleProviderLogin(provider.code)}
                      disabled={loadingProvider !== null}
                      type="button"
                      className={`w-full h-14 flex items-center justify-center gap-3 ${branding.bg} ${branding.hover} text-white font-medium rounded-xl transition-colors disabled:opacity-50`}
                    >
                      {isLoading ? (
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          {branding.icon}
                          <span>Continue with {branding.label || provider.name}</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Connect your accounting software to manage bills, payments, and banking — all in one place.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border shrink-0">
          <div className="flex flex-col items-center gap-3">
            <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
              <a href="/terms-of-service" className="hover:text-foreground transition-colors">Terms of Use</a>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</a>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <a href="/help-centre" className="hover:text-foreground transition-colors">Help Centre</a>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <a href="/docs/checkout" className="hover:text-foreground transition-colors">API Docs</a>
              <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
              <a href={`${getApiUrl()}/admin/`} className="hover:text-foreground transition-colors">Admin</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
