'use client';

import { useState } from 'react';
import { getApiUrl } from '@/config/api';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);

  const handleXeroLogin = () => {
    setIsLoading(true);

    const apiUrl = getApiUrl();
    const frontendUrl = window.location.origin;
    const redirectUrl = `${frontendUrl}/dashboard`;

    const xeroAuthUrl = `${apiUrl}/api/auth/xero/signin/?redirect_url=${encodeURIComponent(redirectUrl)}`;

    window.location.href = xeroAuthUrl;
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
                Sign in with your accounting software to get started
              </p>
            </div>

            {/* Xero Login Button */}
            <button
              onClick={handleXeroLogin}
              disabled={isLoading}
              type="button"
              className="w-full h-14 flex items-center justify-center gap-3 bg-[#13B5EA] hover:bg-[#0fa0d1] text-white font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0z" fill="white" fillOpacity="0.2" />
                    <path d="M8.145 8.26l2.19 3.35-2.19 3.35c-.19.29-.06.66.29.66h1.32c.23 0 .44-.12.56-.32l1.69-2.7 1.69 2.7c.12.2.33.32.56.32h1.32c.35 0 .48-.37.29-.66l-2.19-3.35 2.19-3.35c.19-.29.06-.66-.29-.66h-1.32c-.23 0-.44.12-.56.32l-1.69 2.7-1.69-2.7c-.12-.2-.33-.32-.56-.32H8.435c-.35 0-.48.37-.29.66z" fill="white" />
                  </svg>
                  <span>Continue with Xero</span>
                </>
              )}
            </button>

            <p className="mt-6 text-center text-sm text-muted-foreground">
              Connect your Xero account to manage bills, payments, and banking — all in one place.
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className="p-6 border-t border-border shrink-0">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
              <span>Protected by 256-bit SSL encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
