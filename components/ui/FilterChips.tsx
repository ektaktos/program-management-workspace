import { TaskStatus } from '@/lib/types';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';

interface FilterChipsProps {
  active: TaskStatus | 'all';
  counts: Partial<Record<TaskStatus | 'all', number>>;
  onChange: (s: TaskStatus | 'all') => void;
}

export default function FilterChips({ active, counts, onChange }: FilterChipsProps) {
  const allValues: Array<TaskStatus | 'all'> = ['all', ...STATUS_ORDER];

  return (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
      {allValues.map(s => {
        const isActive = active === s;
        const meta     = s === 'all' ? null : STATUS_META[s];
        const count    = counts[s] ?? 0;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={`filter-chip${isActive ? ' active' : ''}`}
          >
            {meta && (
              <span className="status-dot" style={{ width: 7, height: 7, borderRadius: '50%', background: meta.dot, display: 'inline-block', flexShrink: 0 }} />
            )}
            {s === 'all' ? 'All' : meta!.label}
            <span className="chip-count">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
