'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calendarEventsOn, localTimeOf, parseLocation, todayIso } from '@/lib/utils';

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

export interface TodayMeeting {
  id: string;
  apptId?: string;       // planner meeting id (calendar events are read-only)
  title: string;
  time: string;          // HH:MM, '' for all-day
  endTime?: string;
  allDay: boolean;
  source: string;
  color: string;
  location?: string;
  past: boolean;
  done: boolean;
}

// Today's planner meetings + events from enabled subscribed calendars, in time order.
// Shared by the Dashboard count and the Today page list so the two always agree.
export function useTodayMeetings() {
  const { plannerAppointments, calendarSources, calendarEvents, ensureCalendarRange } = useAppStore();
  const today = todayIso();
  useEffect(() => { ensureCalendarRange(today, today); }, [today, calendarSources, ensureCalendarRange]);

  const now = new Date();
  const nowHm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const sourceById = new Map(calendarSources.map(c => [c.id, c]));

  const meetings: TodayMeeting[] = [
    ...plannerAppointments.filter(a => a.date === today).map(a => ({
      id: `appt-${a.id}`, apptId: a.id, title: a.title, time: a.time, allDay: false,
      source: 'Planner', color: 'var(--meeting)', past: a.done || a.time < nowHm, done: a.done,
    })),
    ...calendarEventsOn(calendarEvents.filter(e => sourceById.get(e.sourceId)?.enabled), today).map(e => {
      const src = sourceById.get(e.sourceId);
      const ended = !e.allDay && Date.parse(e.end) < now.getTime();
      return {
        id: e.id, title: e.title, time: e.allDay ? '' : localTimeOf(e.start), endTime: e.allDay ? undefined : localTimeOf(e.end),
        allDay: e.allDay, source: src?.name ?? 'Calendar', color: src?.color ?? 'var(--border-strong)',
        location: e.location, past: ended, done: ended,
      };
    }),
  ].sort((a, b) => (a.allDay === b.allDay ? a.time.localeCompare(b.time) : a.allDay ? -1 : 1));

  const left = meetings.filter(m => !m.past).length;
  const nextId = meetings.find(m => !m.past && !m.allDay)?.id;
  return { meetings, left, nextId, total: meetings.length };
}

export default function TodayMeetingsCard() {
  const { setView, setCalendarsOpen, calendarSources, updatePlannerAppointment } = useAppStore();
  const { meetings, left, nextId, total } = useTodayMeetings();

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Today&rsquo;s meetings</div>
          <span className="meet-count" aria-label={`${total} meetings today`}>{total}</span>
        </div>
        <div style={{ display: 'flex', gap: 2 }}>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setCalendarsOpen(true)}>
            {calendarSources.length ? `Calendars · ${calendarSources.filter(c => c.enabled).length}` : 'Connect calendars'}
          </button>
          <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setView('planner')}>Planner</button>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2, marginBottom: total ? 10 : 0 }}>
        {total === 0
          ? 'No meetings today.'
          : left === 0 ? 'All done for today.' : `${left} still to come${total - left ? ` · ${total - left} done` : ''}`}
      </div>
      <div className="mt-tickets">
        {meetings.map(m => {
          const [hm, ap] = m.allDay ? ['All', 'day'] : fmt12(m.time).split(' ');
          return (
            <div key={m.id} className={`mt-ticket${m.past ? ' past' : ''}${m.id === nextId ? ' next' : ''}`}>
              <div className="mt-stub" style={{ background: `color-mix(in srgb, ${m.color} 26%, var(--surface))` }}>
                <span className="mt-stub-time">{hm}</span>
                <span className="mt-stub-ap">{ap}</span>
                {m.endTime && <span className="mt-stub-end">to {fmt12(m.endTime)}</span>}
              </div>
              <div className="mt-body">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="meet-title" title={m.location ? `${m.title}\n${m.location}` : m.title}>{m.title}</div>
                  <div className="meet-src">
                    <span className="today-dot" style={{ background: m.color, marginRight: 5, verticalAlign: 1 }} />
                    {m.source}
                    {(() => {
                      const loc = parseLocation(m.location);
                      if (!loc) return null;
                      return loc.url
                        ? <> · <a className="rail-join" href={loc.url} target="_blank" rel="noopener noreferrer" title={m.location}>{loc.label}</a></>
                        : <span title={m.location}> · {loc.label}</span>;
                    })()}
                  </div>
                </div>
                {m.id === nextId && <span className="badge badge-primary" style={{ fontSize: 10.5 }}>Next</span>}
                {m.apptId ? (
                  <span
                    className={`todo-check${m.done ? ' checked' : ''}`}
                    title={m.done ? 'Mark as not done' : 'Mark as done'}
                    onClick={() => updatePlannerAppointment(m.apptId!, { done: !m.done })}
                  >
                    {m.done && (
                      <svg viewBox="0 0 12 12" fill="none" style={{ width: 9, height: 9 }}>
                        <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                ) : (
                  <span className="today-cal-icon" title={`From your ${m.source} calendar (read-only)`} style={{ color: m.color }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
