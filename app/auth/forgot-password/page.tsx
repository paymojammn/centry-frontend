'use client';

import { useState, FormEvent, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiArrowLeftLine,
  RiArrowRightLine,
  RiMailLine,
  RiCheckLine,
  RiLockLine,
  RiEyeLine,
  RiEyeOffLine
} from '@remixicon/react';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';

type Step = 'email' | 'otp' | 'password' | 'success';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Email step
  const [email, setEmail] = useState('');

  // OTP step
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password step
  const [resetToken, setResetToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setResendDisabled(false);
    }
  }, [countdown]);

  // Focus first OTP input when step changes to OTP
  useEffect(() => {
    if (step === 'otp') {
      otpRefs.current[0]?.focus();
    }
  }, [step]);

  const handleEmailSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to send reset email');
      }

      toast.success('Verification code sent!');
      setStep('otp');
      setResendDisabled(true);
      setCountdown(60);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6);
      const newOtp = [...otp];
      digits.split('').forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtp(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otp];
      newOtp[index] = value.replace(/\D/g, '');
      setOtp(newOtp);

      if (value && index < 5) {
        otpRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    const code = otp.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/password-reset/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Invalid verification code');
      }

      setResetToken(data.token);
      setStep('password');
      toast.success('Code verified!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Invalid code';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendDisabled) return;

    setResendDisabled(true);
    setCountdown(60);
    setError('');

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success('New code sent!');
        setOtp(['', '', '', '', '', '']);
        otpRefs.current[0]?.focus();
      }
    } catch {
      toast.error('Failed to resend code');
    }
  };

  const handlePasswordSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const apiUrl = getApiUrl();
      const response = await fetch(`${apiUrl}/api/auth/password-reset/confirm/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.error || 'Failed to reset password');
      }

      setStep('success');
      toast.success('Password reset successful!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Something went wrong';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderEmailStep = () => (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Reset password
        </h2>
        <p className="text-muted-foreground">
          Enter your email to receive a verification code
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5">
            Email address
          </label>
          <div className="relative">
            <RiMailLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="email"
              className="w-full h-12 pl-10 pr-4 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
              placeholder="you@company.com"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !email}
          className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Send code</span>
              <RiArrowRightLine className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderOtpStep = () => (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Enter verification code
        </h2>
        <p className="text-muted-foreground">
          We sent a 6-digit code to <span className="font-medium text-foreground">{email}</span>
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handleOtpSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-foreground mb-3">
            Verification code
          </label>
          <div className="flex gap-2 justify-between">
            {otp.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { otpRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleOtpKeyDown(index, e)}
                disabled={isLoading}
                className="w-12 h-14 text-center text-xl font-semibold border border-border rounded-lg text-foreground focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || otp.join('').length !== 6}
          className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Verify code</span>
              <RiArrowRightLine className="w-4 h-4" />
            </>
          )}
        </button>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Didn't receive the code?{' '}
            {resendDisabled ? (
              <span className="text-muted-foreground/60">Resend in {countdown}s</span>
            ) : (
              <button
                type="button"
                onClick={handleResendOtp}
                className="text-[rgb(var(--brand-dark))] font-medium hover:underline"
              >
                Resend code
              </button>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setStep('email');
            setOtp(['', '', '', '', '', '']);
            setError('');
          }}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Use a different email
        </button>
      </form>
    </div>
  );

  const renderPasswordStep = () => (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Set new password
        </h2>
        <p className="text-muted-foreground">
          Create a strong password for your account
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <form onSubmit={handlePasswordSubmit} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
            New password
          </label>
          <div className="relative">
            <RiLockLine className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full h-12 pl-10 pr-11 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground"
            >
              {showPassword ? <RiEyeOffLine className="w-5 h-5" /> : <RiEyeLine className="w-5 h-5" />}
            </button>
          </div>
          <p className="mt-1.5 text-xs text-muted-foreground/60">Minimum 8 characters</p>
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full h-12 pl-10 pr-11 border border-border rounded-lg text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-[rgb(var(--brand-dark))] focus:ring-1 focus:ring-[rgb(var(--brand-dark))] transition-colors disabled:opacity-50 disabled:bg-muted"
              placeholder="Confirm new password"
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
          disabled={isLoading || !password || !confirmPassword}
          className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Reset password</span>
              <RiArrowRightLine className="w-4 h-4" />
            </>
          )}
        </button>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div>
      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <RiCheckLine className="w-6 h-6 text-primary" />
      </div>
      <h2 className="text-2xl font-semibold text-foreground mb-2">
        Password updated
      </h2>
      <p className="text-muted-foreground mb-6">
        Your password has been reset successfully. You can now sign in with your new password.
      </p>
      <button
        onClick={() => router.push('/auth/login')}
        className="w-full h-12 bg-[rgb(var(--brand-dark))] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <span>Sign in</span>
        <RiArrowRightLine className="w-4 h-4" />
      </button>
    </div>
  );

  const getStepContent = () => {
    switch (step) {
      case 'email':
        return renderEmailStep();
      case 'otp':
        return renderOtpStep();
      case 'password':
        return renderPasswordStep();
      case 'success':
        return renderSuccessStep();
    }
  };

  const getBrandingText = () => {
    switch (step) {
      case 'email':
        return {
          title: "Don't worry,\nwe've got you.",
          subtitle: "Enter your email address and we'll send you a verification code to reset your password."
        };
      case 'otp':
        return {
          title: "Check your\ninbox.",
          subtitle: "We've sent a 6-digit verification code to your email address."
        };
      case 'password':
        return {
          title: "Create a new\npassword.",
          subtitle: "Choose a strong password to keep your account secure. Use a mix of letters, numbers, and symbols."
        };
      case 'success':
        return {
          title: "All done!",
          subtitle: "Your password has been reset successfully. You can now sign in with your new password."
        };
    }
  };

  const branding = getBrandingText();

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
            <h1 className="text-4xl xl:text-5xl font-semibold text-white leading-tight mb-6 whitespace-pre-line">
              {branding.title}
            </h1>
            <p className="text-lg text-white/60 leading-relaxed">
              {branding.subtitle}
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
            {/* Back link */}
            <Link
              href="/auth/login"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8 transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4" />
              Back to sign in
            </Link>

            {getStepContent()}
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
