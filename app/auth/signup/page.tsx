'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiArrowRightLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine,
  RiMailLine,
  RiUserLine,
  RiBuildingLine
} from '@remixicon/react';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';

export default function SignupPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/register/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          company_name: formData.company,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Registration failed');
      }

      toast.success('Account created! Please check your email to verify.');
      router.push('/auth/login?registered=true');
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
              Start your
              <br />
              journey.
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              Join hundreds of businesses streamlining their accounts payable with Centry. Setup takes less than 5 minutes.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-8 text-white/40 text-sm">
            <span>Free trial</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>No credit card</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Cancel anytime</span>
          </div>
        </div>
      </div>

      {/* Right - Form (40%) */}
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

        {/* Form container */}
        <div className="flex-1 flex flex-col justify-center px-8 py-12 lg:px-12 xl:px-16 2xl:px-20">
          <div className="w-full">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Create account
              </h2>
              <p className="text-muted-foreground">
                Get started with your free account
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-foreground mb-1.5">
                    First name
                  </label>
                  <div className="relative">
                    <RiUserLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                    <input
                      type="text"
                      id="firstName"
                      value={formData.firstName}
                      onChange={(e) => handleChange('firstName', e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="given-name"
                      className="w-full h-12 pl-10 pr-4 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                      placeholder="John"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-foreground mb-1.5">
                    Last name
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="family-name"
                    className="w-full h-12 px-4 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
                  Work email
                </label>
                <div className="relative">
                  <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="email"
                    className="w-full h-12 pl-10 pr-4 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="you@company.com"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="company" className="block text-sm font-medium text-foreground mb-1.5">
                  Company name
                </label>
                <div className="relative">
                  <RiBuildingLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type="text"
                    id="company"
                    value={formData.company}
                    onChange={(e) => handleChange('company', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="organization"
                    className="w-full h-12 pl-10 pr-4 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="Acme Inc."
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full h-12 pl-10 pr-11 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="Create password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    {showPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-muted-foreground/60">Minimum 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1.5">
                  Confirm password
                </label>
                <div className="relative">
                  <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleChange('confirmPassword', e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className="w-full h-12 pl-10 pr-11 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
                  >
                    {showConfirmPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading || !formData.firstName || !formData.lastName || !formData.email || !formData.company || !formData.password || !formData.confirmPassword}
                className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Create account</span>
                    <RiArrowRightLine className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-xs text-muted-foreground/60 text-center">
                By creating an account, you agree to our{' '}
                <a href="#" className="text-[rgb(var(--brand-dark))] hover:underline">Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="text-[rgb(var(--brand-dark))] hover:underline">Privacy Policy</a>
              </p>
            </form>

            {/* Footer */}
            <p className="mt-8 text-center text-sm text-muted-foreground/60">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-[rgb(var(--brand-dark))] font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Security footer */}
        <div className="p-6 border-t border-border shrink-0">
          <div className="flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">
              Protected by 256-bit SSL encryption
            </p>
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
