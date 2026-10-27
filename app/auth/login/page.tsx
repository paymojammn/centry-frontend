'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ArrowRight, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import { BRAND, copyrightLine } from '@/config/brand';
import { vendorBrand, vendorBrandDefault } from '@/lib/colors';
import { signInWithOdoo } from '@/lib/odoo-api';

// Provider branding — vendors' own identity colours live in lib/colors.ts
const PROVIDER_BRANDING = vendorBrand;
const DEFAULT_BRANDING = vendorBrandDefault;

/**
 * Only same-origin paths may be used as a post-login destination (`?next=`),
 * e.g. `/invitations/accept?token=…`. Anything else falls back to the dashboard.
 */
function safeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  return next;
}

interface Provider {
  id: string;
  code: string;
  name: string;
  category?: string;
  requires_oauth?: boolean;
}

export default function LoginPage() {
  const searchParams = useSearchParams();
  const [loadingProvider, setLoadingProvider] = useState<string | null>(null);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // API-key provider (e.g. Odoo) connect modal
  const [apiKeyProvider, setApiKeyProvider] = useState<Provider | null>(null);
  const [odooForm, setOdooForm] = useState({ base_url: '', database: '', api_key: '' });
  const [odooSubmitting, setOdooSubmitting] = useState(false);
  const [odooError, setOdooError] = useState<string | null>(null);

  // Handle OAuth error redirects (e.g. user denied consent)
  useEffect(() => {
    const error = searchParams.get('error');
    const message = searchParams.get('message');
    if (error) {
      setErrorMessage(message || 'Login failed. Please try again.');
      // Clean error params from URL
      window.history.replaceState({}, '', '/auth/login');
    }
  }, [searchParams]);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/v1/erp/providers/available/`)
      .then((res) => res.json())
      .then((data) => setProviders(data))
      .catch(() => {
        setProviders([
          { id: '1', code: 'xero', name: 'Xero', category: 'Accounting', requires_oauth: true },
          { id: '2', code: 'qbo', name: 'QuickBooks Online', category: 'Accounting', requires_oauth: true },
          { id: '3', code: 'erpnext', name: 'ERPNext', category: 'ERP', requires_oauth: true },
          { id: '4', code: 'odoo', name: 'Odoo', category: 'ERP', requires_oauth: false },
        ]);
      });
  }, []);

  const categories = useMemo(() => {
    const cats = new Set(providers.map((p) => p.category || 'Other'));
    return ['all', ...Array.from(cats)];
  }, [providers]);

  const filtered = useMemo(() => {
    return providers.filter((p) => {
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || (p.category || 'Other') === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [providers, searchQuery, selectedCategory]);

  const selectProvider = (provider: Provider) => {
    // API-key providers (e.g. Odoo) open a credential form instead of redirecting.
    if (provider.requires_oauth === false) {
      setOdooError(null);
      setOdooForm({ base_url: '', database: '', api_key: '' });
      setApiKeyProvider(provider);
      return;
    }
    handleProviderLogin(provider.code);
  };

  const handleProviderLogin = (code: string) => {
    setLoadingProvider(code);
    const apiUrl = getApiUrl();
    const frontendUrl = window.location.origin;

    // Preserve plan + cycle from pricing page so the backend can assign the right plan
    const plan = searchParams.get('plan');
    const cycle = searchParams.get('cycle');
    const redirectUrl = plan
      ? `${frontendUrl}/billing/subscribe?plan=${plan}${cycle ? `&cycle=${cycle}` : ''}`
      : `${frontendUrl}${safeNextPath(searchParams.get('next')) ?? '/dashboard'}`;

    let authUrl = `${apiUrl}/api/auth/${code}/signin/?redirect_url=${encodeURIComponent(redirectUrl)}`;
    if (plan) authUrl += `&plan=${encodeURIComponent(plan)}`;
    if (cycle) authUrl += `&cycle=${encodeURIComponent(cycle)}`;

    window.location.href = authUrl;
  };

  const handleOdooSubmit = async () => {
    if (!odooForm.base_url || !odooForm.api_key) {
      setOdooError('Base URL and API key are required.');
      return;
    }
    setOdooSubmitting(true);
    setOdooError(null);
    try {
      const plan = searchParams.get('plan');
      const cycle = searchParams.get('cycle');
      const frontendUrl = window.location.origin;
      const redirect_url = plan
        ? `${frontendUrl}/billing/subscribe?plan=${plan}${cycle ? `&cycle=${cycle}` : ''}`
        : `${frontendUrl}${safeNextPath(searchParams.get('next')) ?? '/dashboard'}`;

      const result = await signInWithOdoo({
        base_url: odooForm.base_url.trim(),
        database: odooForm.database.trim() || undefined,
        api_key: odooForm.api_key.trim(),
        redirect_url,
      });

      localStorage.setItem('auth_token', result.access_token);
      localStorage.setItem('refresh_token', result.refresh_token);
      // Land on the Odoo org just connected (active org is otherwise sticky).
      if (result.organization_id) {
        localStorage.setItem('selectedOrganizationId', result.organization_id);
      }
      window.location.href = result.has_active_subscription
        ? result.redirect_url
        : `${frontendUrl}/billing/subscribe`;
    } catch (err) {
      setOdooError(err instanceof Error ? err.message : 'Sign-in failed. Check your credentials.');
      setOdooSubmitting(false);
    }
  };

  return (
    <div className="relative w-full min-h-dvh flex flex-col bg-[rgb(var(--page-bg))]">
      {/* Forest hairline across the top — the only chrome on the page */}
      <div aria-hidden className="relative z-10 h-1 w-full bg-forest" />

      {/* Topographic contour texture from the brand board, sage at very low
          opacity so it reads as paper grain, not decoration. */}
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 h-full w-full text-sage opacity-[0.14]"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
      >
        <path d="M-50,120 C250,60 450,200 800,140 S1350,60 1650,160" strokeWidth="1" />
        <path d="M-50,160 C250,100 450,240 800,180 S1350,100 1650,200" strokeWidth="0.8" />
        <path d="M-50,200 C250,140 450,280 800,220 S1350,140 1650,240" strokeWidth="0.6" />
        <path d="M-50,700 C250,640 450,780 800,720 S1350,640 1650,740" strokeWidth="1" />
        <path d="M-50,740 C250,680 450,820 800,760 S1350,680 1650,780" strokeWidth="0.8" />
        <path d="M-50,780 C250,720 450,860 800,800 S1350,720 1650,820" strokeWidth="0.6" />
      </svg>

      {/* Optically centred composition: header + card move together */}
      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 py-12">
        {/* Wordmark + motto — the logo is the hero, nothing competes with it */}
        <header className="flex flex-col items-center pb-10 text-center">
          <img src={BRAND.logo.wordmark} alt={BRAND.name} className="h-11 w-auto" />
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">
            {BRAND.motto}
          </p>
        </header>

        {/* Single centred card */}
        <div className="mx-auto w-full max-w-md rounded-2xl bg-white/60 backdrop-blur-sm border border-forest/[0.08] shadow-lg shadow-forest/[0.04] animate-fade-in-up">
          <div className="px-6 pt-7 pb-4 sm:px-8">
            <h2 className="text-lg font-semibold tracking-tight text-foreground">Sign in</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the accounting software you use and we&apos;ll sign you in with it.
            </p>

            {/* Search */}
            <div className="relative mt-6">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search accounting software…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-white/70 border border-forest/10 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary transition-all"
              />
            </div>

            {/* Category pills */}
            {categories.length > 2 && (
              <div className="flex gap-2 mt-4 flex-wrap">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'bg-muted text-muted-foreground hover:bg-sage/20 hover:text-foreground'
                    }`}
                  >
                    {cat === 'all' ? 'All' : cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Provider list */}
          <div className="px-6 pb-7 sm:px-8">
            {/* Error banner for failed OAuth */}
            {errorMessage && (
              <div className="mb-4 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive">
                <XCircle className="h-5 w-5 shrink-0 mt-0.5" />
                <div className="flex-1">{errorMessage}</div>
                <button onClick={() => setErrorMessage(null)} className="shrink-0 text-destructive/60 hover:text-destructive">
                  &times;
                </button>
              </div>
            )}
            {/* One column, Xero-style: each provider is a full-width row so
                three or eleven providers read equally well. */}
            <div className="flex flex-col gap-2">
              {filtered.map((provider) => {
                const branding = PROVIDER_BRANDING[provider.code] || DEFAULT_BRANDING;
                const isLoading = loadingProvider === provider.code;
                const isDisabled = loadingProvider !== null;

                return (
                  <button
                    key={provider.id}
                    onClick={() => selectProvider(provider)}
                    disabled={isDisabled}
                    className="group relative flex items-center gap-3.5 p-3.5 bg-white/55 border border-forest/[0.08] rounded-xl hover:border-primary/40 hover:bg-white/90 hover:shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
                  >
                    {/* Provider icon — the ERP's own colour, not ours */}
                    <div
                      className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-xs"
                      style={{ backgroundColor: branding.color }}
                    >
                      {branding.icon}
                    </div>

                    {/* Provider info */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-foreground truncate">
                        {provider.name}
                      </div>
                      {provider.category && (
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {provider.category}
                        </div>
                      )}
                    </div>

                    {/* Arrow / Loading */}
                    <div className="shrink-0">
                      {isLoading ? (
                        <Loader2 className="h-4 w-4 text-primary animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-12">
                <div className="text-muted-foreground text-sm">
                  {searchQuery
                    ? <>No providers found for &ldquo;{searchQuery}&rdquo;</>
                    : 'No accounting software is connected yet.'}
                </div>
              </div>
            )}
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-5">
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
          <a href="/terms-of-service" className="hover:text-foreground transition-colors">Terms</a>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</a>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <a href="/help-centre" className="hover:text-foreground transition-colors">Help</a>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <a href="/docs" className="hover:text-foreground transition-colors">Docs</a>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <a href={`${getApiUrl()}/admin/`} className="hover:text-foreground transition-colors">Admin</a>
        </div>
        <p className="mt-2 text-center text-[11px] text-muted-foreground/70">{copyrightLine()}</p>
      </footer>

      {/* API-key connect modal (Odoo) */}
      {apiKeyProvider && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => !odooSubmitting && setApiKeyProvider(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-card border border-border shadow-xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-1">
              <div
                className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm"
                style={{ backgroundColor: (PROVIDER_BRANDING[apiKeyProvider.code] || DEFAULT_BRANDING).color }}
              >
                {(PROVIDER_BRANDING[apiKeyProvider.code] || DEFAULT_BRANDING).icon}
              </div>
              <h3 className="text-lg font-semibold text-foreground">Connect {apiKeyProvider.name}</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-5">
              Enter your {apiKeyProvider.name} instance details and API key to sign in.
            </p>

            {odooError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>{odooError}</div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Base URL</label>
                <input
                  type="url"
                  placeholder="https://mycompany.odoo.com"
                  value={odooForm.base_url}
                  onChange={(e) => setOdooForm((f) => ({ ...f, base_url: e.target.value }))}
                  className="w-full h-10 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Database <span className="text-muted-foreground/60">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="mycompany"
                  value={odooForm.database}
                  onChange={(e) => setOdooForm((f) => ({ ...f, database: e.target.value }))}
                  className="w-full h-10 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">API Key</label>
                <input
                  type="password"
                  placeholder="Your Odoo API key"
                  value={odooForm.api_key}
                  onChange={(e) => setOdooForm((f) => ({ ...f, api_key: e.target.value }))}
                  onKeyDown={(e) => e.key === 'Enter' && handleOdooSubmit()}
                  className="w-full h-10 px-3 bg-muted/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setApiKeyProvider(null)}
                disabled={odooSubmitting}
                className="flex-1 h-10 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleOdooSubmit}
                disabled={odooSubmitting}
                className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {odooSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Connect & Sign in'}
              </button>
            </div>

            <p className="text-xs text-muted-foreground/70 mt-4">
              Create an API key in Odoo under Preferences → Account Security → New API Key.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
