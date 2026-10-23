'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getProviders, signIn } from 'next-auth/react';

type Mode = 'login' | 'signup';

const ERRORS: Record<string, string> = {
  CredentialsSignin:     'Incorrect email or password.',
  OAuthAccountNotLinked: 'This email is already registered. Sign in with your password.',
};

export default function AuthForm({ mode }: { mode: Mode }) {
  const [name, setName]         = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);
  const [hasGoogle, setHasGoogle] = useState(false);

  useEffect(() => {
    getProviders().then(p => setHasGoogle(Boolean(p?.google)));
    const code = new URLSearchParams(window.location.search).get('error');
    if (code) setError(ERRORS[code] ?? 'Sign-in failed. Please try again.');
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.error ?? 'Could not create account.');
          return;
        }
      }
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setError(ERRORS[res.error] ?? 'Sign-in failed. Please try again.');
        return;
      }
      window.location.href = '/';
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-md)' }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>
          {isSignup ? 'Create your workspace' : 'Welcome back'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>
          {isSignup ? 'Your projects and planner stay private to you.' : 'Sign in to your workspace.'}
        </div>

        <form onSubmit={handleSubmit}>
          {isSignup && (
            <div className="form-group">
              <label htmlFor="name">Name</label>
              <input id="name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" />
            </div>
          )}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password" type="password" required minLength={isSignup ? 8 : undefined}
              value={password} onChange={e => setPassword(e.target.value)}
              autoComplete={isSignup ? 'new-password' : 'current-password'}
            />
          </div>

          {error && (
            <div style={{
              fontSize: 13, color: '#a35656', background: 'var(--danger-light)',
              borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 16,
            }}>{error}</div>
          )}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Please wait…' : isSignup ? 'Create account' : 'Sign in'}
          </button>
        </form>

        {hasGoogle && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0', color: 'var(--text-faint)', fontSize: 12 }}>
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
              or
              <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            </div>
            <button
              type="button" className="btn btn-outline"
              onClick={() => signIn('google', { callbackUrl: '/' })}
              style={{ width: '100%', justifyContent: 'center' }}
            >
              <svg viewBox="0 0 24 24" style={{ width: 16, height: 16 }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0012 23z"/>
                <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 010-4.2V7.06H2.18a11 11 0 000 9.88l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.96 10.96 0 0012 1 11 11 0 002.18 7.06l3.66 2.84C6.71 7.3 9.14 5.38 12 5.38z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          {isSignup ? 'Already have an account? ' : 'New here? '}
          <Link href={isSignup ? '/login' : '/signup'} style={{ color: 'var(--text)', fontWeight: 600 }}>
            {isSignup ? 'Sign in' : 'Create an account'}
          </Link>
        </div>
      </div>
    </div>
  );
}
