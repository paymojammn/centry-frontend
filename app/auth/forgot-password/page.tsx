'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiMailLine,
  RiCheckLine
} from '@remixicon/react';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/password-reset/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || data.error || 'Failed to send reset email');
      }

      setIsSubmitted(true);
      toast.success('Reset instructions sent!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex">
      {/* Left - Branding Panel (60%) */}
      <div className="hidden lg:flex w-[60%] bg-[#1c252c] relative">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/4 -right-1/4 w-[800px] h-[800px] rounded-full bg-[#49a034]/5" />
          <div className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] rounded-full bg-[#4E97D1]/5" />
        </div>

        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-16 2xl:p-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1c252c] font-bold text-xl">C</span>
            </div>
            <span className="text-xl font-semibold text-white">Centry</span>
          </div>

          {/* Main message */}
          <div className="max-w-md">
            <h1 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6">
              Don't worry,
              <br />
              we've got you.
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Enter your email address and we'll send you instructions to reset your password.
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

      {/* Right - Form (40%) */}
      <div className="w-full lg:w-[40%] flex flex-col bg-white overflow-y-auto">
        {/* Mobile header */}
        <div className="lg:hidden p-6 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#1c252c] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">C</span>
            </div>
            <span className="text-lg font-semibold text-gray-900">Centry</span>
          </div>
        </div>

        {/* Form container */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-12 xl:px-16 2xl:px-20">
          <div className="w-full">
            {/* Back link */}
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4" />
              Back to sign in
            </Link>

            {isSubmitted ? (
              /* Success state */
              <div>
                <div className="w-12 h-12 rounded-full bg-[#49a034]/10 flex items-center justify-center mb-6">
                  <RiCheckLine className="w-6 h-6 text-[#49a034]" />
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  Check your email
                </h2>
                <p className="text-gray-500 mb-6">
                  We've sent password reset instructions to <span className="font-medium text-gray-900">{email}</span>
                </p>
                <p className="text-sm text-gray-400 mb-6">
                  Didn't receive the email? Check your spam folder or try again.
                </p>
                <button
                  onClick={() => setIsSubmitted(false)}
                  className="text-sm text-[#1c252c] font-medium hover:underline"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              /* Form state */
              <div>
                <div className="mb-8">
                  <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                    Reset password
                  </h2>
                  <p className="text-gray-500">
                    Enter your email to receive reset instructions
                  </p>
                </div>

                {/* Error */}
                {error && (
                  <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-lg">
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Email address
                    </label>
                    <div className="relative">
                      <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                        autoComplete="email"
                        className="w-full h-12 pl-10 pr-4 border border-gray-200 rounded-lg text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#1c252c] focus:ring-1 focus:ring-[#1c252c] transition-colors disabled:opacity-50 disabled:bg-gray-50"
                        placeholder="you@company.com"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !email}
                    className="w-full h-12 bg-[#1c252c] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Send instructions</span>
                        <RiArrowRightLine className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* Security footer */}
        <div className="p-6 border-t border-gray-100 text-center shrink-0">
          <p className="text-xs text-gray-400">
            Protected by 256-bit SSL encryption
          </p>
        </div>
      </div>
    </div>
  );
}
