'use client';

import { useEffect, useRef, useState } from 'react';
import { addDaysIso, todayIso } from '@/lib/utils';

const stop = (e: React.SyntheticEvent) => e.stopPropagation();

// The priority number of an open task in its day. Click it for a small picker: a grid of
// positions (current one highlighted) plus Move to top / bottom. Arrow keys, Enter and Escape work.
const COLS = 5;
export function RankSelect({ rank, total, title, onPick }: { rank: number; total: number; title: string; onPick: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const [focus, setFocus] = useState(rank);
  const [alignRight, setAlignRight] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  const btnRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, [open]);

  useEffect(() => { if (open) btnRefs.current[focus - 1]?.focus(); }, [open, focus]);

  function toggle() {
    if (!open && ref.current) {
      // Keep the picker on screen: open leftwards near the right edge, upwards near the bottom
      const r = ref.current.getBoundingClientRect();
      setAlignRight(r.left + 210 > window.innerWidth);
      setOpenUp(r.bottom + 240 > window.innerHeight && r.top > 240);
      setFocus(rank);
    }
    setOpen(o => !o);
  }

  function pick(n: number) {
    setOpen(false);
    if (n !== rank) onPick(n - 1);
  }

  function onKey(e: React.KeyboardEvent) {
    const step: Record<string, number> = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLS, ArrowUp: -COLS };
    if (e.key in step) {
      e.preventDefault();
      setFocus(f => Math.min(total, Math.max(1, f + step[e.key])));
    } else if (e.key === 'Home') { e.preventDefault(); setFocus(1); }
    else if (e.key === 'End') { e.preventDefault(); setFocus(total); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); }
  }

  return (
    <span ref={ref} className={`rank-badge${open ? ' open' : ''}`} onClick={stop} onMouseDown={stop}>
      <button
        type="button"
        className="rank-btn"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Priority ${rank} of ${total} for "${title}". Change position`}
        title="Priority order: click to move it"
        onClick={toggle}
      >
        {rank}
      </button>
      {open && (
        <span
          className={`rank-pop${alignRight ? ' right' : ''}${openUp ? ' up' : ''}`}
          role="listbox"
          aria-label={`Move "${title}" to position`}
          onKeyDown={onKey}
        >
          <span className="rank-pop-head">Move to position</span>
          <span className="rank-pop-grid" style={{ gridTemplateColumns: `repeat(${Math.min(COLS, total)}, 1fr)` }}>
            {Array.from({ length: total }, (_, i) => {
              const n = i + 1;
              return (
                <button
                  key={n}
                  ref={el => { btnRefs.current[i] = el; }}
                  type="button"
                  role="option"
                  aria-selected={n === rank}
                  tabIndex={n === focus ? 0 : -1}
                  className={`rank-chip${n === rank ? ' current' : ''}`}
                  onClick={() => pick(n)}
                  onFocus={() => setFocus(n)}
                >
                  {n}
                </button>
              );
            })}
          </span>
          {total > 2 && (
            <span className="rank-pop-actions">
              <button type="button" className="rank-quick" disabled={rank === 1} onClick={() => pick(1)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>
                Top
              </button>
              <button type="button" className="rank-quick" disabled={rank === total} onClick={() => pick(total)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><polyline points="7 13 12 18 17 13"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
                Bottom
              </button>
            </span>
          )}
        </span>
      )}
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
