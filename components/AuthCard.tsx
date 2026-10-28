// Centered card shared by the sign-in, sign-up and password reset pages.
export default function AuthCard({ title, subtitle, children }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 16,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-md)' }}>
        <div className="modal-title" style={{ marginBottom: 6 }}>{title}</div>
        <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 22 }}>{subtitle}</div>
        {children}
      </div>
    </div>
  );
}

export function AuthMessage({ tone, children }: { tone: 'error' | 'success'; children: React.ReactNode }) {
  const danger = tone === 'error';
  return (
    <div role={danger ? 'alert' : 'status'} style={{
      fontSize: 13, borderRadius: 'var(--radius-sm)', padding: '8px 12px', marginBottom: 16,
      color:      danger ? 'var(--danger-text)'  : 'var(--success-text)',
      background: danger ? 'var(--danger-light)' : 'var(--success-light)',
    }}>{children}</div>
  );
}

// Carries the typed email from the sign-in form to the forgot-password form
// without putting it in the URL.
const EMAIL_KEY = 'pm_auth_email';

export function rememberAuthEmail(email: string) {
  try { email ? sessionStorage.setItem(EMAIL_KEY, email) : sessionStorage.removeItem(EMAIL_KEY); } catch {}
}

export function recallAuthEmail(): string {
  try { return sessionStorage.getItem(EMAIL_KEY) ?? ''; } catch { return ''; }
}
