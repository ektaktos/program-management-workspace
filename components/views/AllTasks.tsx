'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { TaskStatus, Priority } from '@/lib/types';
import { sortTasks } from '@/lib/utils';
import TaskCard from '../project/TaskCard';

export default function AllTasks() {
  const { tasks, searchQuery, setSearch } = useAppStore();
  const [statusFilter, setStatusFilter]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const filtered = sortTasks(
    tasks.filter(t => {
      const q   = searchQuery.toLowerCase();
      const mQ  = !q || t.title.toLowerCase().includes(q) || (t.description ?? '').toLowerCase().includes(q);
      const mS  = !statusFilter   || t.status   === statusFilter;
      const mP  = !priorityFilter || t.priority === priorityFilter;
      return mQ && mS && mP;
    })
  );

  return (
    <div>
      {/* Toolbar */}
      <div className="alltasks-toolbar" style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          className="toolbar-input"
          placeholder="Search tasks..."
          value={searchQuery}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: 160 }}
        />
        <select
          className="toolbar-input"
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 140 }}
        >
          <option value="">All Statuses</option>
          <option value="todo">To Do</option>
          <option value="inprogress">In Progress</option>
          <option value="inreview">In Review</option>
          <option value="done">Done</option>
          <option value="overdue">Overdue</option>
        </select>
        <select
          className="toolbar-input"
          value={priorityFilter}
          onChange={e => setPriorityFilter(e.target.value)}
          style={{ width: 'auto', minWidth: 130 }}
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <h3>{searchQuery || statusFilter || priorityFilter ? 'No matching tasks' : 'No tasks yet'}</h3>
          <p>{searchQuery ? `No tasks matching "${searchQuery}"` : 'Tasks you create will appear here.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map(t => <TaskCard key={t.id} task={t} showProject />)}
        </div>
      )}
    </div>
  );
}
