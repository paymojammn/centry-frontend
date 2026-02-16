'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { RiArrowLeftLine, RiArrowRightLine } from '@remixicon/react';

/**
 * This page now redirects to the forgot-password flow.
 * The password reset process uses OTP verification instead of URL tokens.
 *
 * Users may land here from old reset emails, so we provide a helpful message
 * and redirect them to start the reset process again.
 */
export default function ResetPasswordPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to forgot-password after a short delay
    const timer = setTimeout(() => {
      router.push('/auth/forgot-password');
    }, 5000);

    return () => clearTimeout(timer);
  }, [router]);

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
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6">
              Password reset
              <br />
              process updated.
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              We've improved our password reset process for better security.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-8 text-white/40 text-sm">
            <span>Secure reset</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>24/7 support</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>256-bit encryption</span>
          </div>
        </div>
      </div>

      {/* Right - Message (40%) */}
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

        {/* Content container */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-12 xl:px-16 2xl:px-20">
          <div className="w-full">
            {/* Back link */}
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4" />
              Back to sign in
            </Link>

            <div className="mb-8">
              <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mb-6">
                <svg className="w-6 h-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Start fresh
              </h2>
              <p className="text-muted-foreground mb-6">
                This reset link is no longer valid. Our password reset process now uses verification codes sent to your email.
              </p>
              <p className="text-sm text-muted-foreground/60 mb-6">
                You'll be redirected automatically, or click the button below to start now.
              </p>
            </div>

            <button
              onClick={() => router.push('/auth/forgot-password')}
              className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <span>Reset password</span>
              <RiArrowRightLine className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Security footer */}
        <div className="p-6 border-t border-border text-center shrink-0">
          <p className="text-xs text-muted-foreground/60">
            Protected by 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}
