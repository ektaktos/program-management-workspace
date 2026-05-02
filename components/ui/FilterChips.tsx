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
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {allValues.map(s => {
        const isActive = active === s;
        const meta = s === 'all' ? null : STATUS_META[s];
        const count = counts[s] ?? 0;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              background: isActive ? '#f3ede4' : 'transparent',
              color: isActive ? 'var(--text)' : 'var(--text-muted)',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            {meta && (
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
            )}
            {s === 'all' ? 'All' : meta!.label}
            <span style={{
              fontSize: 10,
              background: isActive ? 'var(--primary-dark)' : 'var(--border)',
              color: isActive ? '#fff' : 'var(--text-muted)',
              padding: '1px 6px',
              borderRadius: 999,
            }}>{count}</span>
          </button>
        );
      })}
    </div>
  );
}
