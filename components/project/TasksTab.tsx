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
  const filtered = filter === 'all' ? projectTasks : projectTasks.filter(t => t.status === filter);
  const sorted = sortTasks(filtered);

  const counts: Partial<Record<TaskStatus | 'all', number>> = { all: projectTasks.length };
  STATUS_ORDER.forEach(s => {
    counts[s] = projectTasks.filter(t => t.status === s).length;
  });

  function handleFilterChange(s: TaskStatus | 'all') {
    setFilter(prev => prev === s ? 'all' : s);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <FilterChips active={filter} counts={counts} onChange={handleFilterChange} />
        <button className="btn btn-primary" style={{ height: 34, fontSize: 13 }} onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Task
        </button>
      </div>

      {sorted.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>
          No tasks{filter !== 'all' ? ` with status "${filter}"` : ''} yet.
        </div>
      ) : (
        sorted.map(t => (
          <TaskCard key={t.id} task={t} isHighlighted={highlightedTaskId === t.id} />
        ))
      )}

      {showAdd && <TaskModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
    </div>
  );
}
