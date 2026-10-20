'use client';

import { Project, Task } from '@/lib/types';

// Readable label colour for a spine painted in an arbitrary project colour
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
  onOpen: (id: string) => void;
}

// Bookshelf overview: one spine per project — height = how many tasks, inner fill = how much is done
export default function ProjectShelf({ projects, tasks, onOpen }: Props) {
  const stats = projects.map(p => {
    const pt = tasks.filter(t => t.projectId === p.id);
    const done = pt.filter(t => t.status === 'done').length;
    return { p, total: pt.length, done, pct: pt.length ? Math.round((done / pt.length) * 100) : 0 };
  });
  const max = Math.max(1, ...stats.map(s => s.total));

  return (
    <div className="shelf-card">
      <div className="shelf-head">
        <span>Shelf</span>
        <span className="shelf-hint">Taller spine = more tasks · fill = done · click to open</span>
      </div>
      <div className="shelf" role="list">
        {stats.map(({ p, total, done, pct }) => (
          <button
            key={p.id}
            role="listitem"
            type="button"
            className="shelf-spine"
            onClick={() => onOpen(p.id)}
            title={`${p.name} — ${done}/${total} tasks done (${pct}%)`}
            style={{ height: 78 + 74 * (total / max), background: p.color, color: inkFor(p.color) }}
          >
            <span className="shelf-fill" style={{ height: `${pct}%` }} aria-hidden />
            <span className="shelf-band" aria-hidden />
            <span className="shelf-label">{p.name}</span>
            <span className="shelf-pct">{pct}%</span>
          </button>
        ))}
      </div>
    </div>
  );
}
