'use client';

import { useEffect, useState } from 'react';

const DISMISS_KEY = 'pm_oyint_notif_banner_dismissed';

export default function PWAInit() {
  const [permission, setPermission] = useState<NotificationPermission | null>(null);
  const [dismissed, setDismissed] = useState(true); // start hidden until we know client state

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
  }, []);

  function enableNotifications() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then(setPermission);
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  if (permission !== 'default' || dismissed) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 18, right: 18, zIndex: 200,
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
      padding: '14px 16px', maxWidth: 300,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18, color: 'var(--text)', flexShrink: 0, marginTop: 1 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Enable notifications</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Get a desktop popup when a task or meeting alert fires — as long as this tab stays open.
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-outline btn-sm" onClick={dismiss}>Not now</button>
        <button className="btn btn-primary btn-sm" onClick={enableNotifications}>Enable</button>
      </div>
    </div>
  );
}
