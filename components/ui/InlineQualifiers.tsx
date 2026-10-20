'use client';

import { useState } from 'react';
import { Task, TaskStatus } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, todayIso } from '@/lib/utils';
import { PRIORITY_META, STATUS_META, STATUS_ORDER } from '@/lib/constants';

// Small editors for a task's status, due date and priority, used inside ledger rows.
// Every control stops its click so the row underneath doesn't open the edit modal.

const stop = (e: React.SyntheticEvent) => e.stopPropagation();
const PRIORITY_DOT: Record<string, string> = { high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)' };

const caret = (
  <svg className="q-caret" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <polyline points="6 9 12 15 18 9"/>
  </svg>
);

export function StatusSelect({ task, className = '' }: { task: Task; className?: string }) {
  const { updateTask, toggleTaskDone } = useAppStore();
  const meta = STATUS_META[task.status];

  function change(next: TaskStatus) {
    if (next === task.status) return;
    // Completing goes through the done toggle so recurring tasks spawn their next copy
    if (next === 'done') toggleTaskDone(task.id);
    else updateTask(task.id, { status: next });
  }

  return (
    <span className={`q-wrap badge ${meta.badgeClass} ${className}`} onClick={stop}>
      <select
        className="q-select"
        value={task.status}
        aria-label={`Status of "${task.title}"`}
        title="Change status"
        onChange={e => change(e.target.value as TaskStatus)}
      >
        {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </select>
      {meta.label}
      {caret}
    </span>
  );
}

export function PrioritySelect({ task, className = '' }: { task: Task; className?: string }) {
  const updateTask = useAppStore(s => s.updateTask);
  const meta = PRIORITY_META[task.priority] ?? PRIORITY_META.medium;
  return (
    <span className={`q-wrap q-plain ${className}`} onClick={stop}>
      <select
        className="q-select"
        value={task.priority}
        aria-label={`Priority of "${task.title}"`}
        title="Change priority"
        onChange={e => updateTask(task.id, { priority: e.target.value as Task['priority'] })}
      >
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <span className="today-dot" style={{ background: PRIORITY_DOT[task.priority], margin: 0 }} />
      {meta.label}
      {caret}
    </span>
  );
}

export function DueEdit({ task, className = '' }: { task: Task; className?: string }) {
  const updateTask = useAppStore(s => s.updateTask);
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(task.due ?? '');
  const today = todayIso();
  const late = task.status === 'overdue' || (task.status !== 'done' && !!task.due && task.due < today);

  function save(next: string) {
    setEditing(false);
    if ((next || undefined) === task.due) return;
    if (next) updateTask(task.id, { due: next });
    // Clearing the date of an overdue task puts it back to To Do
    else updateTask(task.id, task.status === 'overdue' ? { due: undefined, status: 'todo' } : { due: undefined });
  }

  if (editing) {
    return (
      <span className={`q-due-edit ${className}`} onClick={stop}>
        <input
          type="date"
          value={val}
          autoFocus
          aria-label={`Due date of "${task.title}"`}
          onChange={e => setVal(e.target.value)}
          onBlur={() => save(val)}
          onKeyDown={e => {
            if (e.key === 'Enter') save(val);
            if (e.key === 'Escape') { setVal(task.due ?? ''); setEditing(false); }
          }}
        />
        {val && (
          <button type="button" className="q-clear" title="Remove due date" aria-label="Remove due date"
            onMouseDown={e => e.preventDefault()} onClick={() => save('')}>×</button>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`q-due${late ? ' late' : ''}${task.due ? '' : ' empty'} ${className}`}
      title={task.due ? 'Change due date' : 'Add a due date'}
      onClick={e => { stop(e); setVal(task.due ?? ''); setEditing(true); }}
    >
      {task.due ? fmtDate(task.due).replace(/ \d{4}$/, '') : '+ date'}
    </button>
  );
}
