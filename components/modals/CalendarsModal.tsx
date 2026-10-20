'use client';

import { useState, useId } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CalendarSource } from '@/lib/types';
import { useEscape } from '../ui/useEscape';

const CAL_COLORS = ['#7f9cb5', '#c9886f', '#8fae86', '#b18fb5', '#d4ad5f', '#6fa3a0', '#c97f8f', '#8c7b6b'];

function maskUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname.length > 18 ? u.pathname.slice(0, 18) + '…' : u.pathname}`;
  } catch { return url.slice(0, 32) + '…'; }
}

function ColorDots({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {CAL_COLORS.map(c => (
        <button
          key={c}
          type="button"
          aria-label={`Colour ${c}`}
          onClick={() => onChange(c)}
          style={{
            width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', padding: 0,
            border: value === c ? '2px solid var(--text)' : '2px solid transparent',
            boxShadow: value === c ? '0 0 0 2px var(--surface) inset' : 'none',
          }}
        />
      ))}
    </div>
  );
}

function SourceRow({ src }: { src: CalendarSource }) {
  const { updateCalendarSource, deleteCalendarSource, calendarErrors } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(src.name);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadError = calendarErrors[src.id];

  async function patch(p: Partial<Omit<CalendarSource, 'id'>>) {
    setBusy(true); setError(null);
    const err = await updateCalendarSource(src.id, p);
    setBusy(false);
    if (err) setError(err);
    return !err;
  }

  return (
    <div className="cal-row">
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: src.color, flexShrink: 0, opacity: src.enabled ? 1 : 0.35 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              value={name}
              autoFocus
              onChange={e => setName(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter' && name.trim()) { if (await patch({ name: name.trim() })) setEditing(false); }
                if (e.key === 'Escape') { e.preventDefault(); setName(src.name); setEditing(false); }
              }}
              style={{ padding: '4px 8px', fontSize: 13 }}
            />
          ) : (
            <div style={{ fontSize: 13.5, fontWeight: 500, color: src.enabled ? 'var(--text)' : 'var(--text-faint)' }}>{src.name}</div>
          )}
          <div style={{ fontSize: 11.5, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{maskUrl(src.url)}</div>
        </div>
        <label className="cal-toggle" title={src.enabled ? 'Showing — click to hide' : 'Hidden — click to show'}>
          <input type="checkbox" checked={src.enabled} disabled={busy} onChange={e => patch({ enabled: e.target.checked })} />
          <span />
        </label>
        <button className="btn-icon" title="Rename" onClick={() => { setEditing(v => !v); setName(src.name); }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        {confirming ? (
          <span style={{ display: 'inline-flex', gap: 4 }}>
            <button className="btn btn-danger btn-sm" onClick={() => deleteCalendarSource(src.id)}>Remove</button>
            <button className="btn btn-outline btn-sm" onClick={() => setConfirming(false)}>Keep</button>
          </span>
        ) : (
          <button className="btn-icon" title="Remove calendar" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
          </button>
        )}
      </div>
      <div style={{ marginTop: 8, paddingLeft: 22 }}>
        <ColorDots value={src.color} onChange={c => patch({ color: c })} />
      </div>
      {(error || loadError) && (
        <div style={{ fontSize: 12, color: 'var(--danger-text)', marginTop: 6, paddingLeft: 22 }}>{error ?? `Last refresh failed: ${loadError}`}</div>
      )}
    </div>
  );
}

export default function CalendarsModal() {
  const fid = useId(); // links each label to its field
  const { calendarsOpen, setCalendarsOpen, calendarSources, addCalendarSource, refreshCalendars } = useAppStore();
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState(CAL_COLORS[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(calendarSources.length === 0);

  useEscape(() => setCalendarsOpen(false), calendarsOpen);

  if (!calendarsOpen) return null;
  const close = () => setCalendarsOpen(false);

  async function add() {
    setError(null);
    if (!name.trim()) { setError('Give the calendar a name.'); return; }
    if (!url.trim()) { setError('Paste the calendar’s iCal / ICS link.'); return; }
    setBusy(true);
    const err = await addCalendarSource({ name: name.trim(), url: url.trim(), color });
    setBusy(false);
    if (err) { setError(err); return; }
    setName(''); setUrl('');
    setColor(CAL_COLORS[(calendarSources.length + 1) % CAL_COLORS.length]);
  }

  return (
    <div className="modal-overlay" onClick={close}>
      <div className="modal-panel" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-title">Calendars</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginTop: -6, marginBottom: 16, lineHeight: 1.55 }}>
          Events from these calendars show in Today and in the planner&rsquo;s Meetings. They&rsquo;re read-only here and refresh about every 10 minutes.
        </div>

        {calendarSources.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            {calendarSources.map(src => <SourceRow key={src.id} src={src} />)}
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, marginTop: 6 }} onClick={() => refreshCalendars()}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/></svg>
              Refresh now
            </button>
          </div>
        )}

        <div style={{ borderTop: calendarSources.length ? '1px solid var(--border)' : 'none', paddingTop: calendarSources.length ? 16 : 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Add a calendar</div>
          <div className="form-group">
            <label htmlFor={`${fid}-1`}>Name</label>
            <input id={`${fid}-1`} value={name} onChange={e => setName(e.target.value)} placeholder="Work, Family, Church…" />
          </div>
          <div className="form-group">
            <label htmlFor={`${fid}-2`}>iCal / ICS link</label>
            <input id={`${fid}-2`} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" />
          </div>
          <div className="form-group">
            <label>Colour</label>
            <ColorDots value={color} onChange={setColor} />
          </div>
          {error && <div style={{ fontSize: 12.5, color: 'var(--danger-text)', marginBottom: 10 }}>{error}</div>}

          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12, padding: 0, marginBottom: 6 }} onClick={() => setShowHelp(v => !v)}>
            {showHelp ? 'Hide' : 'Where do I find the link?'}
          </button>
          {showHelp && (
            <div className="cal-help">
              <p><b>Google Calendar:</b> Settings → pick the calendar under “Settings for my calendars” → Integrate calendar → copy <i>Secret address in iCal format</i>.</p>
              <p><b>Outlook / Microsoft 365:</b> Settings → Calendar → Shared calendars → Publish a calendar → choose the calendar and “Can view all details” → Publish → copy the <i>ICS</i> link.</p>
              <p><b>Apple iCloud:</b> Calendar app → right-click the calendar → Share Calendar → tick Public Calendar → copy the link (starts with webcal://).</p>
              <p style={{ marginBottom: 0 }}>Treat these links like passwords: anyone with one can see that calendar. Remove a calendar here to stop syncing it; to revoke access entirely, reset the link in that calendar’s settings.</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={close}>Done</button>
          <button className="btn btn-primary" onClick={add} disabled={busy}>{busy ? 'Checking link…' : 'Add calendar'}</button>
        </div>
      </div>
    </div>
  );
}
