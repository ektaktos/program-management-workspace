'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TaskStatus } from '@/lib/types';
import { STATUS_ORDER } from '@/lib/constants';
import { sortTasks } from '@/lib/utils';
import FilterChips from '../ui/FilterChips';
import TaskCard from './TaskCard';
import TaskModal from '../modals/TaskModal';

interface TasksTabProps {
  projectId: string;
  highlightedTaskId: string | null;
}

export default function TasksTab({ projectId, highlightedTaskId }: TasksTabProps) {
  const { tasks } = useAppStore();
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [showAdd, setShowAdd] = useState(false);

  const projectTasks = tasks.filter(t => t.projectId === projectId);
  const filtered     = filter === 'all' ? projectTasks : projectTasks.filter(t => t.status === filter);
  const sorted       = sortTasks(filtered);

  const counts: Partial<Record<TaskStatus | 'all', number>> = { all: projectTasks.length };
  STATUS_ORDER.forEach(s => { counts[s] = projectTasks.filter(t => t.status === s).length; });

  function handleFilterChange(s: TaskStatus | 'all') {
    setFilter(prev => prev === s ? 'all' : s);
  }

  return (
    <div>
      {/* Toolbar — Add Task button THEN chips (matching HTML layout) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <FilterChips active={filter} counts={counts} onChange={handleFilterChange} />
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 13, height: 13 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Task
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="empty-state">
          <h3>{filter !== 'all' ? `No ${filter} tasks` : 'No tasks yet'}</h3>
          <p>{filter !== 'all' ? 'Try a different filter.' : 'Add your first task to get started.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map(t => (
            <TaskCard key={t.id} task={t} isHighlighted={highlightedTaskId === t.id} />
          ))}
        </div>
      )}

      {showAdd && <TaskModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
