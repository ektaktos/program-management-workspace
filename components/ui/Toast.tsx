'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NotifIcon } from '@/components/NotificationCenter';

const SNOOZE_OPTIONS = [5, 10, 30, 60];

export default function ToastContainer() {
  const toasts = useAppStore(s => s.toasts);
  const removeToast = useAppStore(s => s.removeToast);
  const openNotification = useAppStore(s => s.openNotification);
  const snoozeNotification = useAppStore(s => s.snoozeNotification);
  const notifications = useAppStore(s => s.notifications);
  const [snoozeFor, setSnoozeFor] = useState<string | null>(null);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-stack" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(t => {
        const isAlert = t.type === 'alert';
        return (
          <div key={t.id} className={`toast-enter toast${isAlert ? ' toast-alert' : ''} toast-${t.kind ?? 'info'}`}>
            <NotifIcon kind={t.kind ?? (isAlert ? 'task' : 'info')} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="toast-title">{t.title}</div>
              <div className="toast-msg">{t.message}</div>
              {t.notifId && (
                <div className="toast-actions">
                  <button className="btn btn-outline btn-sm" onClick={() => openNotification(t.notifId!)}>
                    {notifications.find(n => n.id === t.notifId)?.target?.view === 'report' ? 'Download PDF' : 'Open'}
                  </button>
                  {snoozeFor === t.id ? (
                    SNOOZE_OPTIONS.map(m => (
                      <button key={m} className="btn btn-ghost btn-sm" onClick={() => { setSnoozeFor(null); snoozeNotification(t.notifId!, m); }}>
                        {m < 60 ? `${m}m` : '1h'}
                      </button>
                    ))
                  ) : (
                    <button className="btn btn-ghost btn-sm" onClick={() => setSnoozeFor(t.id)}>Snooze</button>
                  )}
                </div>
              )}
            </div>
            <button className="btn-icon" style={{ width: 22, height: 22 }} aria-label="Dismiss" onClick={() => removeToast(t.id)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
