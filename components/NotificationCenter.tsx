'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CAL_LEAD_OPTIONS, NotifItem, NotifKind, SOUND_IDS, SOUND_LABELS, SoundId, inQuietHours, playSound, timeAgo, unlockAudio } from '@/lib/notifications';

export function NotifIcon({ kind }: { kind: NotifKind }) {
  const common = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <span className={`notif-icon notif-icon-${kind}`} aria-hidden>
      {kind === 'task' && <svg {...common}><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>}
      {kind === 'meeting' && <svg {...common}><circle cx="9" cy="8" r="3"/><path d="M3 20c0-3 3-5 6-5s6 2 6 5"/><circle cx="17" cy="9" r="2.4"/><path d="M16 15c2.6 0 5 1.6 5 4"/></svg>}
      {kind === 'calendar' && <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
      {kind === 'digest' && <svg {...common}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>}
      {kind === 'info' && <svg {...common}><circle cx="12" cy="12" r="9"/><polyline points="8 12 11 15 16 9"/></svg>}
    </span>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="cal-toggle" title={label}>
      <input type="checkbox" checked={checked} aria-label={label} onChange={e => onChange(e.target.checked)} />
      <span />
    </label>
  );
}

function dayLabel(at: number): string {
  const d = new Date(at), t = new Date();
  const same = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  if (same(d, t)) return 'Today';
  const y = new Date(t); y.setDate(t.getDate() - 1);
  if (same(d, y)) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
}

function Inbox({ onDone }: { onDone: () => void }) {
  const { notifications, openNotification, markAllNotifsRead, clearNotifications } = useAppStore();
  const [, tick] = useState(0);
  useEffect(() => { const i = setInterval(() => tick(n => n + 1), 60_000); return () => clearInterval(i); }, []);

  if (notifications.length === 0) {
    return (
      <div className="notif-empty">
        <div style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--text)', marginBottom: 4 }}>You&rsquo;re all caught up</div>
        Task alerts, meeting and calendar reminders and your morning summary will collect here.
      </div>
    );
  }

  const groups: { label: string; items: NotifItem[] }[] = [];
  notifications.forEach(n => {
    const label = dayLabel(n.at);
    const g = groups[groups.length - 1];
    if (g && g.label === label) g.items.push(n); else groups.push({ label, items: [n] });
  });
  const unread = notifications.filter(n => !n.read).length;

  return (
    <>
      <div className="notif-list">
        {groups.map(g => (
          <div key={g.label}>
            <div className="notif-day">{g.label}</div>
            {g.items.map(n => (
              <button key={n.id} className={`notif-row${n.read ? '' : ' unread'}`} onClick={() => { openNotification(n.id); if (n.target) onDone(); }}>
                <NotifIcon kind={n.kind} />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="notif-row-title">{n.title}</span>
                  <span className="notif-row-msg">{n.message}</span>
                  <span className="notif-row-time">{timeAgo(n.at)}</span>
                </span>
                {!n.read && <span className="notif-dot" aria-label="Unread" />}
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="notif-foot">
        <button className="btn btn-ghost btn-sm" disabled={!unread} onClick={markAllNotifsRead}>Mark all read</button>
        <button className="btn btn-ghost btn-sm" onClick={clearNotifications}>Clear all</button>
      </div>
    </>
  );
}

function Settings() {
  const { notifPrefs: p, setNotifPrefs } = useAppStore();
  const [perm, setPerm] = useState<NotificationPermission | 'unsupported'>('default');
  useEffect(() => { setPerm('Notification' in window ? Notification.permission : 'unsupported'); }, []);

  function test() {
    unlockAudio();
    useAppStore.getState().notify({ kind: 'info', title: 'Test notification', message: inQuietHours(p) ? 'Quiet hours are on, so this one is silent.' : 'This is how reminders will look and sound.' });
  }

  return (
    <div className="notif-settings">
      <div className="notif-set-head">Remind me about</div>
      <div className="notif-set-row"><span>Task alerts<small>The alerts you set on tasks</small></span><Toggle label="Task alerts" checked={p.taskAlerts} onChange={v => setNotifPrefs({ taskAlerts: v })} /></div>
      <div className="notif-set-row"><span>Planner meetings<small>Meetings with an alert set</small></span><Toggle label="Planner meetings" checked={p.meetingAlerts} onChange={v => setNotifPrefs({ meetingAlerts: v })} /></div>
      <div className="notif-set-row">
        <span>Calendar events<small>From your connected calendars</small></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <select className="notif-select" value={p.calendarLead} disabled={!p.calendarAlerts} aria-label="Calendar reminder time" onChange={e => setNotifPrefs({ calendarLead: Number(e.target.value) })}>
            {CAL_LEAD_OPTIONS.map(m => <option key={m} value={m}>{m === 0 ? 'At start' : m < 60 ? `${m} min before` : '1 hr before'}</option>)}
          </select>
          <Toggle label="Calendar events" checked={p.calendarAlerts} onChange={v => setNotifPrefs({ calendarAlerts: v })} />
        </span>
      </div>
      <div className="notif-set-row">
        <span>Morning summary<small>What&rsquo;s due, overdue and on the calendar</small></span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <input type="time" className="notif-select" value={p.digestTime} disabled={!p.digest} aria-label="Summary time" onChange={e => e.target.value && setNotifPrefs({ digestTime: e.target.value })} />
          <Toggle label="Morning summary" checked={p.digest} onChange={v => setNotifPrefs({ digest: v })} />
        </span>
      </div>

      <div className="notif-set-head">Sound</div>
      <div className="notif-set-row"><span>Play a sound</span><Toggle label="Play a sound" checked={p.sound} onChange={v => setNotifPrefs({ sound: v })} /></div>
      <div className={`notif-sounds${p.sound ? '' : ' off'}`}>
        {SOUND_IDS.map((id: SoundId) => (
          <button
            key={id}
            type="button"
            className={`notif-sound${p.soundId === id ? ' on' : ''}`}
            disabled={!p.sound}
            onClick={() => { unlockAudio(); setNotifPrefs({ soundId: id }); playSound(id, p.volume); }}
          >
            {SOUND_LABELS[id]}
          </button>
        ))}
      </div>
      <div className="notif-set-row">
        <span>Volume</span>
        <input
          type="range" min={0.1} max={1} step={0.1} value={p.volume} disabled={!p.sound} aria-label="Volume"
          className="notif-volume"
          onChange={e => setNotifPrefs({ volume: Number(e.target.value) })}
          onPointerUp={() => playSound(p.soundId, useAppStore.getState().notifPrefs.volume)}
        />
      </div>

      <div className="notif-set-head">Quiet hours</div>
      <div className="notif-set-row">
        <span>Silence sound and pop-ups<small>Reminders still collect here</small></span>
        <Toggle label="Quiet hours" checked={p.quiet} onChange={v => setNotifPrefs({ quiet: v })} />
      </div>
      {p.quiet && (
        <div className="notif-set-row">
          <span>From</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <input type="time" className="notif-select" value={p.quietFrom} aria-label="Quiet from" onChange={e => e.target.value && setNotifPrefs({ quietFrom: e.target.value })} />
            to
            <input type="time" className="notif-select" value={p.quietTo} aria-label="Quiet until" onChange={e => e.target.value && setNotifPrefs({ quietTo: e.target.value })} />
          </span>
        </div>
      )}

      <div className="notif-set-head">Pop-ups</div>
      <div className="notif-set-row">
        <span>
          System pop-ups when the tab is in the background
          <small>
            {perm === 'granted' ? 'Allowed in this browser' : perm === 'denied' ? 'Blocked: allow notifications for this site in your browser settings' : perm === 'unsupported' ? 'Not supported in this browser' : 'Needs your browser’s permission'}
          </small>
        </span>
        {perm === 'default'
          ? <button className="btn btn-primary btn-sm" onClick={() => Notification.requestPermission().then(setPerm)}>Allow</button>
          : <Toggle label="System pop-ups" checked={p.desktop} onChange={v => setNotifPrefs({ desktop: v })} />}
      </div>

      <div className="notif-foot" style={{ justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Settings sync across devices.</span>
        <button className="btn btn-outline btn-sm" onClick={test}>Send a test</button>
      </div>
    </div>
  );
}

export default function NotificationCenter() {
  const notifications = useAppStore(s => s.notifications);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'inbox' | 'settings'>('inbox');
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="bell-btn"
        title="Notifications"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => { setOpen(o => !o); setTab('inbox'); }}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unread > 0 && <span className="bell-badge">{unread > 9 ? '9+' : unread}</span>}
      </button>

      {open && (
        <div className="notif-popover" role="dialog" aria-label="Notifications">
          <div className="notif-head">
            <div className="notif-tabs" role="tablist">
              <button role="tab" aria-selected={tab === 'inbox'} className={tab === 'inbox' ? 'on' : ''} onClick={() => setTab('inbox')}>
                Notifications{unread ? ` · ${unread}` : ''}
              </button>
              <button role="tab" aria-selected={tab === 'settings'} className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>Settings</button>
            </div>
          </div>
          {tab === 'inbox' ? <Inbox onDone={() => setOpen(false)} /> : <Settings />}
        </div>
      )}
    </div>
  );
}
