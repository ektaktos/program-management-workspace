'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthCard, { AuthMessage, recallAuthEmail } from '@/components/AuthCard';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [busy, setBusy]   = useState(false);

  useEffect(() => { setEmail(recallAuthEmail()); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Something went wrong. Please try again.');
        return;
      }
      setSentTo(email.trim());
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter the email you signed up with and we'll send you a link to choose a new password."
    >
      {sentTo ? (
        <>
          <AuthMessage tone="success">
            If an account exists for <strong>{sentTo}</strong>, a reset link is on its way. It expires in an hour.
          </AuthMessage>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 18 }}>
            Nothing arrived? Check your spam folder or{' '}
            <button
              type="button" onClick={() => setSentTo('')}
              style={{ font: 'inherit', background: 'none', border: 'none', padding: 0, color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}
            >
              send it again
            </button>
          </div>
        </>
      ) : (
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email" type="email" required autoFocus
              value={email} onChange={e => setEmail(e.target.value)} autoComplete="email"
            />
          </div>

          {error && <AuthMessage tone="error">{error}</AuthMessage>}

          <button type="submit" className="btn btn-primary" disabled={busy} style={{ width: '100%', justifyContent: 'center' }}>
            {busy ? 'Sending…' : 'Send reset link'}
          </button>
        </form>
      )}

      <div style={{ marginTop: 20, fontSize: 13, color: 'var(--text-muted)', textAlign: 'center' }}>
        Remembered it?{' '}
        <Link href="/login" style={{ color: 'var(--text)', fontWeight: 600 }}>Sign in</Link>
      </div>
    </AuthCard>
  );
}
