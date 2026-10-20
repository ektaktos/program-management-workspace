'use client';

import { useRef, useState } from 'react';
import { Phase, Project, Task } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import { PROJECT_STATUS_META } from '@/lib/constants';

// Readable label colour for a book painted in an arbitrary project colour
function inkFor(hex: string): string {
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return '#2b2622';
  const n = parseInt(m[1], 16);
  const lin = (c: number) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const L = 0.2126 * lin((n >> 16) & 255) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255);
  return L > 0.32 ? '#2b2622' : '#fdfcf9';
}

interface Props {
  projects: Project[];
  tasks: Task[];
  phases: Phase[];
  onOpen: (id: string) => void;
  onNew: () => void;
}

interface Book {
  p: Project;
  total: number;
  done: number;
  overdue: number;
  sections: number;
  pct: number;
}

const POP_W = 280;

// All Projects as a bookcase, one shelf per stage of progress. Book height = number of tasks,
// lighter fill = share done, a lean = overdue work. Hover or focus a book for its catalogue card.
export default function ProjectBookcase({ projects, tasks, phases, onOpen, onNew }: Props) {
  const books: Book[] = projects.map(p => {
    const pt = tasks.filter(t => t.projectId === p.id);
    const done = pt.filter(t => t.status === 'done').length;
    return {
      p, total: pt.length, done,
      overdue: pt.filter(t => t.status === 'overdue').length,
      sections: phases.filter(ph => ph.projectId === p.id).length,
      pct: pt.length ? Math.round((done / pt.length) * 100) : 0,
    };
  });
  const maxTasks = Math.max(1, ...books.map(b => b.total));
  const shelves: { name: string; books: Book[] }[] = [
    { name: 'In progress', books: books.filter(b => b.pct > 0 && b.pct < 100) },
    { name: 'Not started', books: books.filter(b => b.pct === 0) },
    { name: 'Finished', books: books.filter(b => b.total > 0 && b.pct === 100) },
  ].filter(s => s.books.length > 0);

  const [hover, setHover] = useState<{ id: string; shelf: number; left: number; bottom: number } | null>(null);
  const shelfRefs = useRef<(HTMLDivElement | null)[]>([]);

  function show(e: React.MouseEvent | React.FocusEvent, id: string, shelf: number) {
    const shelfEl = shelfRefs.current[shelf];
    if (!shelfEl) return;
    const sr = shelfEl.getBoundingClientRect();
    const br = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const left = Math.max(0, Math.min(br.left - sr.left + br.width / 2 - POP_W / 2, sr.width - POP_W));
    const bottom = sr.bottom - br.top + 10;
    setHover({ id, shelf, left, bottom });
  }

  const hovered = hover ? books.find(b => b.p.id === hover.id) : undefined;

  return (
    <div className="bookcase">
      {shelves.map((s, si) => (
        <div key={s.name} className="bc-shelf" ref={el => { shelfRefs.current[si] = el; }}>
          <div className="bc-shelf-label">{s.name} · {s.books.length}</div>

          {hovered && hover?.shelf === si && (
            <div className="bc-pop" style={{ left: hover.left, bottom: hover.bottom, width: POP_W }} role="tooltip">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div className="bc-pop-title">{hovered.p.name}</div>
                  <div className="bc-pop-type">{hovered.p.area ? `${hovered.p.area} · ${hovered.p.type}` : hovered.p.type}</div>
                </div>
                <span className={`badge ${(PROJECT_STATUS_META[hovered.p.status] ?? { badgeClass: 'badge-gray' }).badgeClass}`}>{hovered.p.status}</span>
              </div>
              {hovered.p.description && (
                <div className="bc-pop-desc">{hovered.p.description.slice(0, 140)}{hovered.p.description.length > 140 ? '…' : ''}</div>
              )}
              <div className="bc-pop-bar"><i style={{ width: `${hovered.pct}%`, background: hovered.p.color }} /></div>
              <div className="bc-pop-row"><span>{hovered.done}/{hovered.total} tasks</span><b>{hovered.pct}%</b></div>
              <div className="bc-pop-meta">
                {hovered.p.end && <span>Deadline · {fmtDate(hovered.p.end)}</span>}
                {hovered.overdue > 0 && <span style={{ color: 'var(--danger-text)' }}>{hovered.overdue} overdue</span>}
                <span>{hovered.sections} section{hovered.sections !== 1 ? 's' : ''}</span>
              </div>
            </div>
          )}

          <div className="bc-books">
            {s.books.map(b => (
              <button
                key={b.p.id}
                type="button"
                className={`bc-book${b.overdue > 0 ? ' lean' : ''}${hover?.id === b.p.id ? ' out' : ''}`}
                style={{ height: 130 + 120 * (b.total / maxTasks), background: b.p.color, color: inkFor(b.p.color) }}
                onMouseEnter={e => show(e, b.p.id, si)}
                onMouseLeave={() => setHover(h => (h?.id === b.p.id ? null : h))}
                onFocus={e => show(e, b.p.id, si)}
                onBlur={() => setHover(h => (h?.id === b.p.id ? null : h))}
                onClick={() => onOpen(b.p.id)}
                aria-label={`${b.p.name}: ${b.done} of ${b.total} tasks done${b.overdue ? `, ${b.overdue} overdue` : ''}. Open project`}
              >
                <span className="bc-fill" style={{ height: `${b.pct}%` }} aria-hidden />
                <span className="bc-band" aria-hidden />
                <span className="bc-band thin" aria-hidden />
                <span className="bc-title">{b.p.name}</span>
                <span className="bc-pct">{b.pct}%</span>
              </button>
            ))}
            {si === shelves.length - 1 && (
              <button type="button" className="bc-book bc-new" onClick={onNew} aria-label="New project">
                <span>+ New project</span>
              </button>
            )}
          </div>
          <div className="bc-plank" aria-hidden />
        </div>
      ))}
    </div>
  );
}
