'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import AuthCard, { AuthMessage } from '@/components/AuthCard';
import PasswordInput from '@/components/ui/PasswordInput';
import PasswordChecklist from '@/components/PasswordChecklist';
import { validatePassword } from '@/lib/password';

type LinkState = 'checking' | 'valid' | 'invalid';

export default function ResetPasswordPage() {
  const [token, setToken]       = useState('');
  const [link, setLink]         = useState<LinkState>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [busy, setBusy]         = useState(false);

  // Read once: the address bar is cleared below, and effects can run more than once.
  const urlToken = useRef<string | null>(null);

  useEffect(() => {
    if (urlToken.current === null) {
      urlToken.current = new URLSearchParams(window.location.search).get('token') ?? '';
    }
    const t = urlToken.current;
    setToken(t);
    // Drop the token from the address bar so it isn't left in history or shared by accident
    window.history.replaceState(null, '', '/reset-password');
    if (!t) { setLink('invalid'); return; }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(t)}`)
      .then(res => setLink(res.ok ? 'valid' : 'invalid'))
      .catch(() => setLink('valid')); // let the submit report a network problem
  }, []);

  const passwordOk = validatePassword(password) === null;
  const mismatch   = confirm.length > 0 && confirm !== password;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const problem = validatePassword(password);
    if (problem) { setError(problem); return; }
    if (password !== confirm) { setError('The passwords don’t match.'); return; }

    setBusy(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 400 && !validatePassword(password)) setLink('invalid');
        setError(body.error ?? 'Could not reset your password.');
        return;
      }
      const signedIn = await signIn('credentials', { email: body.email, password, redirect: false });
      window.location.href = signedIn?.error ? '/login' : '/';
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  if (link === 'invalid') {
    return (
      <AuthCard title="Link expired" subtitle="Reset links work once and expire after an hour.">
        {error && <AuthMessage tone="error">{error}</AuthMessage>}
        <Link href="/forgot-password" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          Send a new link
        </Link>
        <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
          <Link href="/login" style={{ color: 'var(--text)', fontWeight: 600 }}>Back to sign in</Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard title="Choose a new password" subtitle="You’ll be signed in once it’s saved.">
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="password">New password</label>
          <PasswordInput
            id="password" required autoFocus
            value={password} onChange={e => setPassword(e.target.value)}
            autoComplete="new-password" aria-describedby="password-rules"
          />
          <PasswordChecklist id="password-rules" password={password} />
        </div>
        <div className="form-group">
          <label htmlFor="confirm">Confirm new password</label>
          <PasswordInput
            id="confirm" required
            value={confirm} onChange={e => setConfirm(e.target.value)}
            autoComplete="new-password" aria-invalid={mismatch}
            aria-describedby={mismatch ? 'confirm-error' : undefined}
          />
          {mismatch && (
            <div id="confirm-error" style={{ fontSize: 12.5, color: 'var(--danger-text)', marginTop: 6 }}>
              The passwords don’t match.
            </div>
          )}
        </div>

        {error && <AuthMessage tone="error">{error}</AuthMessage>}

        <button
          type="submit" className="btn btn-primary"
          disabled={busy || link === 'checking' || !passwordOk || confirm !== password}
          style={{ width: '100%', justifyContent: 'center' }}
        >
          {busy ? 'Saving…' : 'Save password'}
        </button>
      </form>
    </AuthCard>
  );
}
