'use client';

import { useAppStore } from '@/store/useAppStore';
import { TaskStatus } from '@/lib/types';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';
import { sortTasks } from '@/lib/utils';
import TaskCard from '../project/TaskCard';

export default function AllTasks() {
  const { tasks, searchQuery, setSearch } = useAppStore();

  // Read filter state from URL-like store — use local state with query string support
  // We'll use searchQuery for text, and simple local state for filters
  // (Using Zustand directly would require adding filter state; keep simple here with derived state)

  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;

  const allTasks = sortTasks(tasks);

  const q = searchQuery.toLowerCase();

  const filtered = allTasks.filter(t => {
    const matchesSearch = !q || t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q);
    return matchesSearch;
  });

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 34 }}
          />
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {['all', ...STATUS_ORDER].map(s => {
          const count = s === 'all' ? tasks.length : tasks.filter(t => t.status === s).length;
          const meta = s !== 'all' ? STATUS_META[s as TaskStatus] : null;
          return (
            <span key={s} className="badge badge-gray" style={{ cursor: 'default', fontSize: 12 }}>
              {meta && <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block', marginRight: 4 }} />}
              {s === 'all' ? 'All' : meta!.label}: {count}
            </span>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 20px', color: 'var(--text-muted)' }}>
          {searchQuery ? `No tasks matching "${searchQuery}"` : 'No tasks yet.'}
        </div>
      ) : (
        filtered.map(t => <TaskCard key={t.id} task={t} showProject />)
      )}
    </div>
  );
}
