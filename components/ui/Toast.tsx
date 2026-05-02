'use client';

import { useAppStore } from '@/store/useAppStore';

export default function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);
  const removeToast = useAppStore(s => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div style={{ position: 'fixed', bottom: 22, right: 22, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} className="toast-enter" style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          boxShadow: 'var(--shadow-md)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 12,
          minWidth: 280,
          maxWidth: 360,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warning)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 2 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.message}</div>
          </div>
          <button className="btn-icon" style={{ width: 22, height: 22 }} onClick={() => removeToast(t.id)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
