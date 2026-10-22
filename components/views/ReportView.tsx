'use client';

import { useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CalendarEvent } from '@/lib/types';
import { addDaysIso, todayIso } from '@/lib/utils';
import { buildWeeklyReport, mondayOf, weekLabel, Insight } from '@/lib/report';

type Tip = { x: number; y: number; value: string; label: string } | null;

const TONE: Record<Insight['tone'], { tag: string; cls: string }> = {
  good:  { tag: 'Win',   cls: 'good' },
  watch: { tag: 'Watch', cls: 'watch' },
  info:  { tag: 'Note',  cls: 'info' },
};

function fmtHours(mins: number) {
  if (!mins) return '0 h';
  const h = mins / 60;
  return h < 10 ? `${Math.round(h * 10) / 10} h` : `${Math.round(h)} h`;
}

function Delta({ now, before, unit = '', goodWhenUp = true }: { now: number | null; before: number | null; unit?: string; goodWhenUp?: boolean }) {
  if (now === null || before === null) return null;
  const d = now - before;
  if (d === 0) return <span className="rp-delta flat">same as last week</span>;
  const good = goodWhenUp ? d > 0 : d < 0;
  return (
    <span className={`rp-delta ${good ? 'up' : 'down'}`}>
      <span aria-hidden>{d > 0 ? '▲' : '▼'}</span> {Math.abs(d)}{unit} vs last week
    </span>
  );
}

// Weekly report: the chosen week's numbers, an 8-week trend, and what stood out
export default function ReportView() {
  const { tasks, projects, plannerEvents, plannerAppointments, plannerWeekly, calendarSources, archivedProjectIds, archivedTaskIds, setView } = useAppStore();
  const today = todayIso();
  const thisWeek = mondayOf(today);
  // Default to the last full week; this week is one step forward
  const [start, setStart] = useState(addDaysIso(thisWeek, -7));
  const [cal, setCal] = useState<CalendarEvent[]>([]);
  const [tip, setTip] = useState<Tip>(null);

  // Calendar meetings for the week and the 7 before it (one load; the server allows 70 days)
  useEffect(() => {
    if (!calendarSources.some(c => c.enabled)) { setCal([]); return; }
    let cancelled = false;
    fetch(`/api/calendars/events?from=${addDaysIso(start, -49)}&to=${addDaysIso(start, 6)}`)
      .then(r => (r.ok ? r.json() : { events: [] }))
      .then((res: { events?: CalendarEvent[] }) => { if (!cancelled) setCal(res.events ?? []); })
      .catch(() => { if (!cancelled) setCal([]); });
    return () => { cancelled = true; };
  }, [start, calendarSources]);

  const report = useMemo(() => {
    const enabled = new Set(calendarSources.filter(c => c.enabled).map(c => c.id));
    const live = projects.filter(p => !archivedProjectIds.includes(p.id));
    const liveIds = new Set(live.map(p => p.id));
    return buildWeeklyReport({
      tasks: tasks.filter(t => !archivedTaskIds.includes(t.id) && liveIds.has(t.projectId)),
      projects: live,
      plannerEvents, plannerAppointments, plannerWeekly,
      calendarEvents: cal.filter(e => enabled.has(e.sourceId)),
      today,
    }, start);
  }, [tasks, projects, plannerEvents, plannerAppointments, plannerWeekly, cal, calendarSources, archivedProjectIds, archivedTaskIds, today, start]);

  const r = report;
  const showTip = (e: React.MouseEvent | React.FocusEvent, value: string, label: string) => {
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTip({ x: box.left + box.width / 2, y: box.top, value, label });
  };
  const hideTip = () => setTip(null);
  const tipProps = (value: string, label: string) => ({
    tabIndex: 0,
    'aria-label': `${label}: ${value}`,
    onMouseEnter: (e: React.MouseEvent) => showTip(e, value, label),
    onMouseLeave: hideTip,
    onFocus: (e: React.FocusEvent) => showTip(e, value, label),
    onBlur: hideTip,
  });

  const dayMax = Math.max(1, ...r.days.map(d => Math.max(d.planned, d.done)));
  const trendMax = Math.max(1, ...r.trend.map(w => w.done));
  const hourMax = Math.max(1, ...r.hours.map(h => h.count));
  const bestDay = [...r.days].sort((a, b) => b.done - a.done)[0];
  const prioMax = Math.max(1, ...r.byPriority.map(p => Math.max(p.done, p.open)));
  const catMax = Math.max(1, ...r.byCategory.map(c => c.done));
  const projMax = Math.max(1, ...r.projects.map(p => p.done));
  const isThisWeek = start === thisWeek;

  return (
    <div className="rp">
      {/* Week picker */}
      <div className="rp-head">
        <div className="rp-week">
          <button className="pweek-btn" onClick={() => setStart(addDaysIso(start, -7))} aria-label="Previous week">&#8249;</button>
          <div>
            <div className="rp-week-label">{isThisWeek ? 'This week so far' : start === addDaysIso(thisWeek, -7) ? 'Last week' : `Week of ${weekLabel(start)}`}</div>
            <div className="rp-week-sub">{weekLabel(start)}{r.partial ? ' · in progress' : ''}</div>
          </div>
          <button className="pweek-btn" onClick={() => setStart(addDaysIso(start, 7))} disabled={isThisWeek} aria-label="Next week">&#8250;</button>
        </div>
        <button className="btn btn-outline btn-sm rp-print" onClick={() => window.print()}>Print or save as PDF</button>
      </div>

      {/* What stood out */}
      <div className="card rp-insights">
        <div className="rp-title">What stood out</div>
        <ul>
          {r.insights.map((i, k) => (
            <li key={k} className={`rp-insight ${TONE[i.tone].cls}`}>
              <span className="rp-tag">{TONE[i.tone].tag}</span>
              <span>{i.text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Headline numbers */}
      <div className="rp-tiles">
        <div className="rp-tile">
          <div className="rp-tile-label">Finished</div>
          <div className="rp-tile-value">{r.done}</div>
          <div className="rp-tile-sub">{r.extraDone ? `${r.donePlanned} planned + ${r.extraDone} unplanned` : 'tasks done'}</div>
          <Delta now={r.done} before={r.prevDone} />
        </div>
        <div className="rp-tile">
          <div className="rp-tile-label">Plan completed</div>
          <div className="rp-tile-value">{r.rate ?? '—'}{r.rate !== null && <small>%</small>}</div>
          <div className="rp-tile-sub">{r.planned ? `${r.donePlanned} of ${r.planned} planned` : 'nothing planned'}</div>
          <Delta now={r.rate} before={r.prevRate} unit=" pts" />
        </div>
        <div className="rp-tile">
          <div className="rp-tile-label">Deadlines on time</div>
          <div className="rp-tile-value">{r.onTimeRate ?? '—'}{r.onTimeRate !== null && <small>%</small>}</div>
          <div className="rp-tile-sub">{r.dueInWeek ? `${r.onTime} on time · ${r.late} late · ${r.missed} missed` : 'no deadlines this week'}</div>
        </div>
        <div className="rp-tile">
          <div className="rp-tile-label">Meetings</div>
          <div className="rp-tile-value">{r.meetings}</div>
          <div className="rp-tile-sub">{r.meetingMins ? `${fmtHours(r.meetingMins)} in calendar meetings` : 'meetings this week'}</div>
          <Delta now={r.meetings} before={r.prevMeetings} goodWhenUp={false} />
        </div>
        <div className="rp-tile">
          <div className="rp-tile-label">Overdue now</div>
          <div className={`rp-tile-value${r.overdueNow ? ' warn' : ''}`}>{r.overdueNow}</div>
          <div className="rp-tile-sub">{r.overdueNow ? `${r.highOverdue} high priority${r.oldestOverdueDays ? ` · oldest ${r.oldestOverdueDays} days` : ''}` : 'all on track'}</div>
        </div>
        <div className="rp-tile">
          <div className="rp-tile-label">Weekly priorities</div>
          <div className="rp-tile-value">{r.goalsTotal ? `${r.goalsDone}/${r.goalsTotal}` : '—'}</div>
          <div className="rp-tile-sub">{r.goalsTotal ? 'set in the planner' : 'none set in the planner'}</div>
        </div>
      </div>

      <div className="rp-grid">
        {/* Day by day: done against the day's plan */}
        <div className="card">
          <div className="rp-title">Day by day</div>
          <div className="rp-legend">
            <span><i className="rp-key fill" /> Done</span>
            <span><i className="rp-key track" /> Planned</span>
          </div>
          <div className="rp-cols" role="group" aria-label={`Tasks done each day, ${r.label}`}>
            {r.days.map(d => (
              <div key={d.iso} className="rp-col" {...tipProps(`${d.done} done of ${d.planned} planned · ${d.meetings} meeting${d.meetings !== 1 ? 's' : ''}`, d.label)}>
                <div className="rp-bar-area">
                  <span className="rp-bar track" style={{ height: `${(d.planned / dayMax) * 100}%` }} />
                  <span className="rp-bar fill" style={{ height: `${(d.done / dayMax) * 100}%` }} />
                  {d === bestDay && d.done > 0 && <span className="rp-cap" style={{ bottom: `${(Math.max(d.done, d.planned) / dayMax) * 100}%` }}>{d.done}</span>}
                </div>
                <div className={`rp-col-label${d.iso === today ? ' today' : ''}`}>{d.label.split(' ')[0]}</div>
                <div className="rp-col-sub">{d.meetings ? `${d.meetings} mtg` : ' '}</div>
              </div>
            ))}
          </div>
          <details className="rp-table-toggle">
            <summary>View as table</summary>
            <table className="rp-table">
              <thead><tr><th>Day</th><th>Planned</th><th>Done</th><th>Meetings</th></tr></thead>
              <tbody>{r.days.map(d => <tr key={d.iso}><td>{d.label}</td><td>{d.planned}</td><td>{d.done}</td><td>{d.meetings}{d.meetingMins ? ` (${fmtHours(d.meetingMins)})` : ''}</td></tr>)}</tbody>
            </table>
          </details>
        </div>

        {/* 8-week trend */}
        <div className="card">
          <div className="rp-title">Last 8 weeks</div>
          <div className="rp-subtitle">Tasks finished per week{r.avgDone ? ` · your recent average is ${r.avgDone}` : ''}</div>
          <div className="rp-cols" role="group" aria-label="Tasks finished per week, last 8 weeks">
            {r.trend.map((w, k) => {
              const current = k === r.trend.length - 1;
              return (
                <div key={w.start} className="rp-col" {...tipProps(`${w.done} finished${w.rate !== null ? ` · ${w.rate}% of plan` : ''}`, `Week of ${w.label}`)}>
                  <div className="rp-bar-area">
                    <span className={`rp-bar ${current ? 'fill' : 'muted'}`} style={{ height: `${(w.done / trendMax) * 100}%` }} />
                    {current && <span className="rp-cap" style={{ bottom: `${(w.done / trendMax) * 100}%` }}>{w.done}</span>}
                  </div>
                  <div className={`rp-col-label${current ? ' today' : ''}`}>{w.label.split(/[–\s]/)[0]} {w.label.split(/[–\s]/)[1]}</div>
                  <div className="rp-col-sub">{w.rate !== null ? `${w.rate}%` : ' '}</div>
                </div>
              );
            })}
          </div>
          <details className="rp-table-toggle">
            <summary>View as table</summary>
            <table className="rp-table">
              <thead><tr><th>Week</th><th>Finished</th><th>Planned</th><th>Plan done</th></tr></thead>
              <tbody>{r.trend.map(w => <tr key={w.start}><td>{w.label}</td><td>{w.done}</td><td>{w.planned}</td><td>{w.rate !== null ? `${w.rate}%` : '—'}</td></tr>)}</tbody>
            </table>
          </details>
        </div>
      </div>

      {/* Projects */}
      <div className="card">
        <div className="rp-title">Projects</div>
        <div className="rp-subtitle">What moved this week, and what has gone quiet</div>
        <div className="rp-proj-wrap">
          <table className="rp-proj">
            <thead><tr><th>Project</th><th>Done this week</th><th>Open</th><th>Overdue</th><th>Last activity</th></tr></thead>
            <tbody>
              {r.projects.map(p => (
                <tr key={p.id} onClick={() => setView('project', p.id)} title={`Open ${p.name}`}>
                  <td><span className="rp-proj-name"><span className="today-dot" style={{ background: p.color, margin: 0 }} />{p.name}</span></td>
                  <td>
                    <span className="rp-inline-bar"><i style={{ width: `${(p.done / projMax) * 100}%` }} /></span>
                    <span className="rp-num">{p.done}</span>
                  </td>
                  <td className="rp-num">{p.open}</td>
                  <td className={`rp-num${p.overdue ? ' warn' : ''}`}>{p.overdue}</td>
                  <td>
                    {p.daysSince === null ? <span className="rp-muted">no completions yet</span>
                      : p.daysSince === 0 ? 'today'
                      : `${p.daysSince} day${p.daysSince !== 1 ? 's' : ''} ago`}
                    {p.stalled && <span className="rp-flag">Stalled</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rp-grid three">
        {/* Priority */}
        <div className="card">
          <div className="rp-title">By priority</div>
          <div className="rp-subtitle">Project tasks finished this week, and still open</div>
          {r.byPriority.map(p => (
            <div key={p.priority} className="rp-hrow" {...tipProps(`${p.done} finished · ${p.open} open`, `${p.priority} priority`)}>
              <span className="rp-hlabel">{p.priority[0].toUpperCase() + p.priority.slice(1)}</span>
              <span className="rp-hbars">
                <span className="rp-hbar fill" style={{ width: `${(p.done / prioMax) * 100}%` }} />
                <span className="rp-hbar track" style={{ width: `${(p.open / prioMax) * 100}%` }} />
              </span>
              <span className="rp-num">{p.done} / {p.open}</span>
            </div>
          ))}
          <div className="rp-legend" style={{ marginTop: 8 }}>
            <span><i className="rp-key fill" /> Finished</span>
            <span><i className="rp-key track" /> Open</span>
          </div>
        </div>

        {/* Where the effort went */}
        <div className="card">
          <div className="rp-title">Where your effort went</div>
          <div className="rp-subtitle">Finished this week, by planner category</div>
          {r.byCategory.length === 0 ? <div className="rp-muted">Nothing finished yet.</div> : r.byCategory.map(c => (
            <div key={c.name} className="rp-hrow" {...tipProps(`${c.done} finished`, c.name)}>
              <span className="rp-hlabel" style={{ textTransform: 'capitalize' }}>{c.name}</span>
              <span className="rp-hbars"><span className="rp-hbar fill" style={{ width: `${(c.done / catMax) * 100}%` }} /></span>
              <span className="rp-num">{c.done}</span>
            </div>
          ))}
        </div>

        {/* Time of day */}
        <div className="card">
          <div className="rp-title">When you get things done</div>
          <div className="rp-subtitle">Tasks ticked off by time of day, last 8 weeks</div>
          {r.hoursSample < 10 ? (
            <div className="rp-muted">Not enough history yet ({r.hoursSample} timed completions). This fills in as you tick things off.</div>
          ) : (
            <>
              <div className="rp-cols small" role="group" aria-label="Completions by time of day">
                {r.hours.map(h => (
                  <div key={h.label} className="rp-col" {...tipProps(`${h.count} completed`, h.label)}>
                    <div className="rp-bar-area"><span className="rp-bar fill" style={{ height: `${(h.count / hourMax) * 100}%` }} /></div>
                    <div className="rp-col-label">{h.label.split('–')[0]}</div>
                  </div>
                ))}
              </div>
              <div className="rp-muted" style={{ marginTop: 6 }}>{r.hoursSample} timed completions</div>
            </>
          )}
        </div>
      </div>

      {/* Carried over */}
      {r.carryOver.length > 0 && (
        <div className="card">
          <div className="rp-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10 }}>
            <span>{r.partial ? 'Still open this week' : 'Carried over'} · {r.carryOver.length}</span>
            <button className="btn btn-ghost btn-sm" style={{ fontSize: 12 }} onClick={() => setView('planner')}>Open planner</button>
          </div>
          <ul className="rp-carry">
            {r.carryOver.slice(0, 10).map((c, k) => (
              <li key={k}>
                <span className="rp-carry-date">{new Date(c.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' })}</span>
                <span className="rp-carry-title">{c.title}</span>
                {c.project && <span className="rp-muted">{c.project}</span>}
              </li>
            ))}
          </ul>
          {r.carryOver.length > 10 && <div className="rp-muted" style={{ marginTop: 6 }}>and {r.carryOver.length - 10} more</div>}
        </div>
      )}

      <div className="rp-foot">
        How this is counted: finished = planner tasks ticked off plus project tasks completed that week. Plan completed = the share of the week&rsquo;s planned tasks that got done. Project tasks finished before completion times were recorded count on their planned day.
      </div>

      {tip && (
        <div className="rp-tip" style={{ left: tip.x, top: tip.y }} role="tooltip">
          <strong>{tip.value}</strong>
          <span>{tip.label}</span>
        </div>
      )}
    </div>
  );
}
