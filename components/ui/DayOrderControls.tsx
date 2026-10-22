'use client';

import { useEffect, useRef, useState } from 'react';
import { addDaysIso, todayIso } from '@/lib/utils';

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

// The priority number of an open task in its day; pick another number to move it there
export function RankSelect({ rank, total, title, onPick }: { rank: number; total: number; title: string; onPick: (index: number) => void }) {
  return (
    <span className="rank-badge" onClick={stop} onMouseDown={stop} title="Priority order: pick a number to move it">
      <select
        value={rank}
        aria-label={`Priority number for "${title}"`}
        onChange={e => onPick(Number(e.target.value) - 1)}
      >
        {Array.from({ length: total }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
      </select>
      {rank}
    </span>
  );
}

const WEEKDAY = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });

// "Move to…" menu: tomorrow, the next few days, or any date
export function MoveDayButton({ date, title, onMove, align = 'right' }: { date: string; title: string; onMove: (iso: string) => void; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); setOpen(false); } };
    document.addEventListener('mousedown', down);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', down); document.removeEventListener('keydown', key); };
  }, [open]);

  const base = date || todayIso();
  const quick = Array.from({ length: 6 }, (_, i) => addDaysIso(base, i + 1));
  const pick = (iso: string) => { setOpen(false); if (iso && iso !== date) onMove(iso); };

  return (
    <span ref={ref} className="move-day" onClick={stop} onMouseDown={stop}>
      <button
        type="button"
        className="move-day-btn"
        aria-label={`Move "${title}" to another day`}
        aria-expanded={open}
        title="Move to another day"
        onClick={() => setOpen(o => !o)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
      {open && (
        <span className={`move-day-menu ${align}`} role="menu">
          <button type="button" role="menuitem" className="move-day-opt strong" onClick={() => pick(quick[0])}>{base === todayIso() ? 'Tomorrow' : 'Next day'} · {WEEKDAY(quick[0])}</button>
          {quick.slice(1).map(iso => (
            <button key={iso} type="button" role="menuitem" className="move-day-opt" onClick={() => pick(iso)}>{WEEKDAY(iso)}</button>
          ))}
          <label className="move-day-pick">
            <span>Pick a date</span>
            {/* Typing a year digit by digit briefly yields dates like 0002-…; only act on real ones */}
            <input type="date" defaultValue={base} onChange={e => { if (e.target.value >= '2000-01-01') pick(e.target.value); }} aria-label="Pick a date" />
          </label>
        </span>
      )}
    </span>
  );
}
