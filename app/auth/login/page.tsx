'use client';

import { useState, FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { RiArrowRightLine, RiShieldCheckLine } from '@remixicon/react';
import { setAuthToken } from '@/lib/api';
import { toast } from 'sonner';
import { getApiUrl } from '@/config/api';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

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

      if (data.access) {
        setAuthToken(data.access);
        toast.success('Login successful!');
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
    
    // Redirect to Django backend Xero Sign-In endpoint
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const frontendUrl = window.location.origin;
    const redirectUrl = `${frontendUrl}/dashboard`;
    
    // Use the correct "Sign in with Xero" endpoint (not organization connection)
    const xeroAuthUrl = `${apiUrl}/api/auth/xero/signin/?redirect_url=${encodeURIComponent(redirectUrl)}`;
    
    // Redirect to Django backend for Xero authentication
    window.location.href = xeroAuthUrl;
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#638C80] relative overflow-hidden">
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-24 text-white">
          <div className="mb-12">
            <h1 className="text-5xl font-bold mb-4">Centry</h1>
            <p className="text-xl text-white/95">
              Streamline your business payments and collections with seamless ERP integration
            </p>
          </div>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RiShieldCheckLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Secure Authentication</h3>
                <p className="text-white/90">
                  OAuth2.0 secured connection with ERP's for maximum data protection
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RiShieldCheckLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Real-time Sync</h3>
                <p className="text-white/90">
                  Automatic synchronization of invoices, bills, and transactions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                <RiShieldCheckLine className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-1">Complete Control</h3>
                <p className="text-white/90">
                  Manage multiple organizations and tenants from one dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 lg:px-12 bg-white">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-black mb-2">
              Welcome to Centry
            </h2>
            <p className="text-muted-foreground">
              Sign in with your account to get started
            </p>
          </div>

          <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-8">
            {/* Error Alert */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-100 rounded-lg shadow-sm">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Credentials Login Form */}
            <form onSubmit={handleCredentialsLogin} className="space-y-6">
              <div>
                <label
                  htmlFor="username"
                  className="block text-sm font-medium text-black mb-2"
                >
                  Username
                </label>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="username"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-[#638C80] bg-white text-black disabled:opacity-50 transition-all shadow-sm"
                  placeholder="Enter your username"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-black mb-2"
                >
                  Password
                </label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#638C80] focus:border-[#638C80] bg-white text-black disabled:opacity-50 transition-all shadow-sm"
                  placeholder="Enter your password"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !username || !password}
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-[#638C80] hover:bg-[#4f7068] text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign in</span>
                    <RiArrowRightLine className="w-5 h-5" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-100"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-muted-foreground">
                  Or continue with ERP
                </span>
              </div>
            </div>

            <div className="space-y-4">
              {/* Xero Login Button */}
              <button
                onClick={handleXeroLogin}
                disabled={isLoading}
                type="button"
                className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-black hover:bg-gray-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Connecting to Xero...</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-6 h-6"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm6.337 14.883c-.25.393-.788.528-1.186.286l-2.391-1.476-2.39 1.476c-.187.115-.398.172-.608.172-.274 0-.545-.098-.757-.286-.311-.276-.448-.704-.354-1.116l.72-3.115-2.26-2.26c-.311-.311-.41-.777-.252-1.186.158-.41.538-.69.976-.719l3.18-.254 1.287-2.925c.172-.39.546-.642.964-.642s.792.252.964.642l1.287 2.925 3.18.254c.438.029.818.31.976.719.158.409.059.875-.252 1.186l-2.26 2.26.72 3.115c.094.412-.043.84-.354 1.116z" />
                    </svg>
                    <span>Sign in with Xero</span>
                    <RiArrowRightLine className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>

            {/* Info Box */}
            <div className="mt-6 bg-[#638C80]/5 border border-gray-100 rounded-lg p-4 shadow-sm">
              <div className="flex gap-3">
                <RiShieldCheckLine className="w-5 h-5 text-[#638C80] flex-shrink-0 mt-0.5" />
                <div className="text-sm text-black">
                  <p className="font-medium mb-1">Secure Authentication</p>
                  <p className="text-muted-foreground text-xs">
                    Sign in with your credentials or connect via ERP. All data is encrypted and handled securely.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-muted-foreground">
            <p>By signing in, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </div>
  );
}
