'use client';

/**
 * Accept an organization invitation.
 *
 * Lives outside the dashboard layout so an invitee who is not signed in can
 * still see what they were invited to. Flow: look the token up (public) →
 * sign in if needed (login returns here via ?next=) → accept → dashboard.
 */

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Building2 } from 'lucide-react';
import { BRAND, copyrightLine } from '@/config/brand';
import { getAuthToken } from '@/lib/api';
import { exchangeAuthCode } from '@/lib/billing-api';
import { acceptInvitation, lookupInvitation } from '@/lib/organization-api';
import { roleLabel, type InvitationLookup } from '@/types/organization';

const ACCEPT_PATH = '/invitations/accept';

function InvitationCard({ token }: { token: string }) {
  const searchParams = useSearchParams();
  const [invitation, setInvitation] = useState<InvitationLookup | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const nextHere = `${ACCEPT_PATH}?token=${encodeURIComponent(token)}`;
  const loginHref = `/auth/login?next=${encodeURIComponent(nextHere)}`;

  // Returning from login: the backend appended ?auth_code= to our own URL.
  useEffect(() => {
    const authCode = searchParams.get('auth_code');
    const finish = async () => {
      if (authCode) {
        try {
          const tokens = await exchangeAuthCode(authCode);
          localStorage.setItem('auth_token', tokens.access_token);
          localStorage.setItem('refresh_token', tokens.refresh_token);
        } catch {
          // fall through: the user can sign in again
        }
        window.history.replaceState({}, '', nextHere);
      }
      setSignedIn(!!getAuthToken());
    };
    finish();
  }, [searchParams, nextHere]);

  useEffect(() => {
    lookupInvitation(token)
      .then(setInvitation)
      .catch((e: unknown) => setLookupError(e instanceof Error ? e.message : 'This invitation link is not valid.'));
  }, [token]);

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptError(null);
    try {
      const result = await acceptInvitation(token);
      try {
        localStorage.setItem('selectedOrganizationId', result.organization_id);
      } catch {
        // per-viewer convenience only
      }
      setDone(true);
      window.location.href = '/dashboard';
    } catch (e) {
      setAcceptError(e instanceof Error ? e.message : 'Could not accept the invitation.');
      setAccepting(false);
    }
  };

  const switchAccount = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('refresh_token');
    window.location.href = loginHref;
  };

  if (lookupError) {
    return (
      <>
        <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>{lookupError}</div>
        </div>
        <a href="/auth/login" className="mt-6 block text-center text-sm text-muted-foreground hover:text-foreground">
          Go to sign in
        </a>
      </>
    );
  }

  if (!invitation || signedIn === null) {
    return (
      <div className="flex items-center justify-center py-10">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const blocked = invitation.accepted
    ? 'This invitation has already been accepted.'
    : invitation.is_expired
      ? 'This invitation has expired. Ask the person who invited you to send a new one.'
      : null;

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Building2 className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-base font-semibold text-foreground">{invitation.organization_name}</div>
          <div className="text-sm text-muted-foreground">
            Invited as <span className="font-medium text-foreground">{roleLabel(invitation.role)}</span>
            {invitation.invited_by_name ? ` by ${invitation.invited_by_name}` : ''}
          </div>
        </div>
      </div>

      <dl className="mt-6 space-y-2 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Sent to</dt>
          <dd className="truncate text-foreground">{invitation.email}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Expires</dt>
          <dd className="text-foreground">{new Date(invitation.expires_at).toLocaleDateString()}</dd>
        </div>
      </dl>

      {blocked ? (
        <div className="mt-6 rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">{blocked}</div>
      ) : signedIn ? (
        <div className="mt-6 space-y-3">
          {acceptError && (
            <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>{acceptError}</div>
            </div>
          )}
          <button
            type="button"
            onClick={handleAccept}
            disabled={accepting || done}
            className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {done ? <CheckCircle2 className="h-4 w-4" /> : accepting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {done ? 'Joined — opening dashboard…' : accepting ? 'Accepting…' : 'Accept invitation'}
          </button>
          <button type="button" onClick={switchAccount} className="block w-full text-center text-xs text-muted-foreground hover:text-foreground">
            Not {invitation.email}? Sign in with a different account
          </button>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in with <span className="font-medium text-foreground">{invitation.email}</span> to accept this invitation.
          </p>
          <a
            href={loginHref}
            className="flex h-11 w-full items-center justify-center rounded-xl bg-primary text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            Sign in to accept
          </a>
        </div>
      )}
    </>
  );
}

function AcceptInvitationContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl border border-forest/[0.08] bg-white/60 shadow-lg shadow-forest/[0.04] backdrop-blur-sm animate-fade-in-up">
      <div className="px-6 py-7 sm:px-8">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">You&apos;re invited</h2>
        <p className="mt-1 text-sm text-muted-foreground">Join an organization on {BRAND.name}.</p>
        <div className="mt-6">
          {token ? (
            <InvitationCard token={token} />
          ) : (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              This link is missing its invitation token. Open the link from your invitation email.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AcceptInvitationPage() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col bg-[rgb(var(--page-bg))]">
      <div aria-hidden className="relative z-10 h-1 w-full bg-forest" />
      <main className="relative z-10 flex flex-1 flex-col justify-center px-4 py-12">
        <header className="flex flex-col items-center pb-10 text-center">
          <img src={BRAND.logo.wordmark} alt={BRAND.name} className="h-11 w-auto" />
          <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.3em] text-muted-foreground">{BRAND.motto}</p>
        </header>
        <Suspense
          fallback={
            <div className="flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <AcceptInvitationContent />
        </Suspense>
      </main>
      <footer className="relative z-10 px-6 py-5">
        <p className="text-center text-[11px] text-muted-foreground/70">{copyrightLine()}</p>
      </footer>
    </div>
  );
}
