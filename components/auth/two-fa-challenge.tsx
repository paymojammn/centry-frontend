'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import {
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiSmartphoneLine,
  RiKey2Line,
  RiArrowLeftLine,
  RiArrowRightLine,
} from '@remixicon/react';

interface TwoFAChallengeProps {
  sessionToken: string;
  enabledMethods: string[];
  preferredMethod: string;
  onSuccess: (tokens: { access: string; refresh: string }) => void;
  onCancel: () => void;
}

export function TwoFAChallenge({
  sessionToken,
  enabledMethods,
  preferredMethod,
  onSuccess,
  onCancel,
}: TwoFAChallengeProps) {
  const [selectedMethod, setSelectedMethod] = useState(preferredMethod || enabledMethods[0]);
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [showBackupInput, setShowBackupInput] = useState(false);
  const [backupCode, setBackupCode] = useState('');

  const apiUrl = getApiUrl();

  // Auto-send OTP for preferred method on mount (except TOTP)
  useEffect(() => {
    if (selectedMethod && selectedMethod !== 'totp') {
      sendOTP(selectedMethod);
    }
  }, []);

  const sendOTP = async (method: string) => {
    if (method === 'totp') return;

    setIsSending(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/2fa/send-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          channel: method,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.error || 'Failed to send code');
      }
    } catch {
      toast.error('Failed to send verification code');
    } finally {
      setIsSending(false);
    }
  };

  const verifyOTP = async () => {
    if (code.length !== 6) return;

    setIsLoading(true);
    try {
      // Use different endpoint for TOTP
      const endpoint = selectedMethod === 'totp'
        ? `${apiUrl}/api/auth/2fa/totp/login/`
        : `${apiUrl}/api/auth/2fa/verify-otp/`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          code,
        }),
      });

      const data = await response.json();

      if (data.success && data.access) {
        onSuccess({ access: data.access, refresh: data.refresh });
      } else {
        toast.error(data.error || 'Invalid code');
        setCode('');
      }
    } catch {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyBackupCode = async () => {
    if (!backupCode.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/auth/2fa/backup-codes/verify/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_token: sessionToken,
          code: backupCode,
        }),
      });

      const data = await response.json();

      if (data.success && data.access) {
        if (data.warning) {
          toast.warning(data.warning);
        }
        onSuccess({ access: data.access, refresh: data.refresh });
      } else {
        toast.error(data.error || 'Invalid backup code');
      }
    } catch {
      toast.error('Verification failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (method: string) => {
    setSelectedMethod(method);
    setCode('');
    if (method !== 'totp') {
      sendOTP(method);
    }
  };

  const methodIcons: Record<string, React.ReactNode> = {
    email: <RiMailLine className="w-5 h-5" />,
    sms: <RiPhoneLine className="w-5 h-5" />,
    whatsapp: <RiWhatsappLine className="w-5 h-5" />,
    totp: <RiSmartphoneLine className="w-5 h-5" />,
  };

  const methodLabels: Record<string, string> = {
    email: 'Email',
    sms: 'SMS',
    whatsapp: 'WhatsApp',
    totp: 'Authenticator',
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
          <div className="max-w-lg">
            <h1 className="text-4xl xl:text-5xl 2xl:text-6xl font-semibold text-white leading-tight mb-6">
              Security first,
              <br />
              always.
            </h1>
            <p className="text-lg xl:text-xl text-white/60 leading-relaxed">
              Two-factor authentication helps protect your account by requiring a second form of verification.
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center gap-8 text-white/40 text-sm">
            <span>Secure login</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>256-bit encryption</span>
            <span className="w-1 h-1 rounded-full bg-white/20" />
            <span>Protected</span>
          </div>
        </div>
      </div>

      {/* Right - 2FA Form (40%) */}
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
            <button
              onClick={onCancel}
              className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors"
            >
              <RiArrowLeftLine className="w-4 h-4" />
              Back to login
            </button>

            {!showBackupInput ? (
              <>
                <div className="mb-8">
                  <h2 className="text-2xl xl:text-3xl font-semibold text-gray-900 mb-2">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-gray-500">
                    Enter the verification code to continue
                  </p>
                </div>

                {/* Method Selection */}
                {enabledMethods.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {enabledMethods.map((method) => (
                      <button
                        key={method}
                        onClick={() => handleMethodChange(method)}
                        disabled={isSending}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border transition-colors ${
                          selectedMethod === method
                            ? 'border-[#1c252c] bg-[#1c252c]/5 text-[#1c252c]'
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {methodIcons[method]}
                        <span className="text-sm font-medium">{methodLabels[method]}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Instructions */}
                <div className="mb-6">
                  <p className="text-sm text-gray-600">
                    {selectedMethod === 'totp'
                      ? 'Enter the 6-digit code from your authenticator app'
                      : `Enter the 6-digit code sent to your ${methodLabels[selectedMethod]?.toLowerCase()}`}
                  </p>
                </div>

                {/* OTP Input */}
                <div className="mb-6">
                  <div className="flex justify-center">
                    <InputOTP
                      maxLength={6}
                      value={code}
                      onChange={(value) => setCode(value)}
                      onComplete={verifyOTP}
                      disabled={isLoading}
                    >
                      <InputOTPGroup className="gap-2">
                        <InputOTPSlot index={0} className="w-12 h-14 text-xl border-gray-200" />
                        <InputOTPSlot index={1} className="w-12 h-14 text-xl border-gray-200" />
                        <InputOTPSlot index={2} className="w-12 h-14 text-xl border-gray-200" />
                        <InputOTPSlot index={3} className="w-12 h-14 text-xl border-gray-200" />
                        <InputOTPSlot index={4} className="w-12 h-14 text-xl border-gray-200" />
                        <InputOTPSlot index={5} className="w-12 h-14 text-xl border-gray-200" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                {/* Resend Button (for non-TOTP methods) */}
                {selectedMethod !== 'totp' && (
                  <div className="text-center mb-6">
                    <button
                      onClick={() => sendOTP(selectedMethod)}
                      disabled={isSending}
                      className="text-sm text-[#1c252c] hover:underline disabled:opacity-50"
                    >
                      {isSending ? 'Sending...' : "Didn't receive a code? Resend"}
                    </button>
                  </div>
                )}

                {/* Verify Button */}
                <button
                  onClick={verifyOTP}
                  disabled={code.length !== 6 || isLoading}
                  className="w-full h-12 bg-[#1c252c] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify</span>
                      <RiArrowRightLine className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Backup Code Link */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => setShowBackupInput(true)}
                    className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700"
                  >
                    <RiKey2Line className="w-4 h-4" />
                    Use a backup code instead
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Backup Code Input */}
                <div className="mb-8">
                  <h2 className="text-2xl xl:text-3xl font-semibold text-gray-900 mb-2">
                    Use Backup Code
                  </h2>
                  <p className="text-gray-500">
                    Enter one of your backup codes to sign in
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Backup code
                  </label>
                  <input
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX"
                    className="w-full h-12 px-4 border border-gray-200 rounded-lg text-center text-lg tracking-widest font-mono focus:outline-none focus:border-[#1c252c] focus:ring-1 focus:ring-[#1c252c]"
                    disabled={isLoading}
                  />
                  <p className="mt-2 text-xs text-gray-400">
                    Backup codes are single-use and will be removed after use
                  </p>
                </div>

                <button
                  onClick={verifyBackupCode}
                  disabled={!backupCode.trim() || isLoading}
                  className="w-full h-12 bg-[#1c252c] hover:bg-[#2d3a44] text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Verify Backup Code</span>
                      <RiArrowRightLine className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="mt-6 text-center">
                  <button
                    onClick={() => {
                      setShowBackupInput(false);
                      setBackupCode('');
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Back to verification code
                  </button>
                </div>
              </>
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
