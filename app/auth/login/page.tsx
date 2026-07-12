'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search, Loader2, ArrowRight, XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { getApiUrl } from '@/config/api';
import { signInWithOdoo } from '@/lib/odoo-api';

// Provider branding — colors & icons for known ERPs
const PROVIDER_BRANDING: Record<string, { color: string; icon: string }> = {
  xero:       { color: '#13B5EA', icon: 'X' },
  qbo:        { color: '#2CA01C', icon: 'QB' },
  erpnext:    { color: '#0089FF', icon: 'EN' },
  sage:       { color: '#00DC00', icon: 'S' },
  freshbooks: { color: '#0075DD', icon: 'FB' },
  zoho:       { color: '#E42527', icon: 'Z' },
  wave:       { color: '#2A3B4C', icon: 'W' },
  netsuite:   { color: '#1B3A56', icon: 'NS' },
  dynamics:   { color: '#002050', icon: 'D' },
  myob:       { color: '#6100A5', icon: 'M' },
  odoo:       { color: '#714B67', icon: 'O' },
};

const DEFAULT_BRANDING = { color: '#64748B', icon: '?' };

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
      : `${frontendUrl}/dashboard`;

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
        : `${frontendUrl}/dashboard`;

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
    <div className="fixed inset-0 flex">
      {/* Left - Branding Panel */}
      <div className="hidden lg:flex w-[45%] bg-[rgb(var(--brand-dark))] relative overflow-hidden">
        <svg className="absolute inset-0 w-full h-full opacity-15" viewBox="0 0 800 600" preserveAspectRatio="none">
          <path d="M0,200 Q200,150 400,200 T800,180" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="1" />
          <path d="M0,220 Q200,170 400,220 T800,200" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.8" />
          <path d="M0,240 Q200,190 400,240 T800,220" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.6" />
          <path d="M0,400 Q200,350 400,400 T800,380" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="1" />
          <path d="M0,420 Q200,370 400,420 T800,400" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.8" />
          <path d="M0,440 Q200,390 400,440 T800,420" fill="none" stroke="rgb(var(--brand-primary-light))" strokeWidth="0.6" />
        </svg>

        <div className="relative z-10 flex flex-col items-center justify-center w-full h-full p-12">
          <img src="/media/app/centry-logo-dark.svg" alt="Centry" className="h-24 w-24 mb-6" />
          <h1 className="text-5xl xl:text-6xl font-bold text-white tracking-wide">Centry</h1>
          <p className="text-white/40 mt-3 text-sm">Business payments, simplified.</p>
        </div>
      </div>

      {/* Right - ERP Picker */}
      <div className="w-full lg:w-[55%] flex flex-col bg-card overflow-hidden">
        {/* Mobile header */}
        <div className="lg:hidden p-5 border-b border-border shrink-0">
          <div className="flex items-center gap-3">
            <img src="/media/app/centry-logo.svg" alt="Centry" className="h-8 w-8" />
            <span className="text-lg font-semibold text-foreground">Centry</span>
          </div>
        </div>

        {/* Header */}
        <div className="px-8 pt-10 pb-6 lg:px-12 xl:px-16 shrink-0">
          <h2 className="text-2xl font-semibold text-foreground mb-1">
            Connect your ERP
          </h2>
          <p className="text-muted-foreground text-sm">
            Choose your accounting software to get started
          </p>

          {/* Search */}
          <div className="relative mt-5">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search accounting software..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 pl-10 pr-4 bg-muted/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
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
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {cat === 'all' ? 'All' : cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Provider Grid — scrollable */}
        <div className="flex-1 overflow-y-auto px-8 pb-6 lg:px-12 xl:px-16">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {filtered.map((provider) => {
              const branding = PROVIDER_BRANDING[provider.code] || DEFAULT_BRANDING;
              const isLoading = loadingProvider === provider.code;
              const isDisabled = loadingProvider !== null;

              return (
                <button
                  key={provider.id}
                  onClick={() => selectProvider(provider)}
                  disabled={isDisabled}
                  className="group relative flex items-center gap-3.5 p-4 bg-card border border-border rounded-xl hover:border-primary/30 hover:shadow-md hover:shadow-primary/5 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-left"
                >
                  {/* Provider icon */}
                  <div
                    className="shrink-0 w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-sm"
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
                      <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-12">
              <div className="text-muted-foreground text-sm">
                No providers found for &ldquo;{searchQuery}&rdquo;
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-border shrink-0 lg:px-12 xl:px-16">
          <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground flex-wrap">
            <a href="/terms-of-service" className="hover:text-foreground transition-colors">Terms</a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <a href="/privacy-policy" className="hover:text-foreground transition-colors">Privacy</a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <a href="/help-centre" className="hover:text-foreground transition-colors">Help</a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <a href="/docs/checkout" className="hover:text-foreground transition-colors">API Docs</a>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <a href={`${getApiUrl()}/admin/`} className="hover:text-foreground transition-colors">Admin</a>
          </div>
        </div>
      </div>

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
