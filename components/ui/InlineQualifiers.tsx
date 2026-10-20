'use client';

import { useEffect, useState } from 'react';
import { Task, TaskStatus } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { fmt12hr, fmtDate, todayIso } from '@/lib/utils';
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

// Due date and time in one cell: "20 Oct · 3:00 PM". Click to edit both; leaving the editor saves.
export function DueEdit({ task, className = '' }: { task: Task; className?: string }) {
  const updateTask = useAppStore(s => s.updateTask);
  const [editing, setEditing] = useState(false);
  const [date, setDate] = useState(task.due ?? '');
  const [time, setTime] = useState(task.dueTime ?? '');
  const today = todayIso();
  const late = task.status === 'overdue' || (task.status !== 'done' && !!task.due && task.due < today);

  function open(e: React.MouseEvent) {
    stop(e);
    setDate(task.due ?? '');
    setTime(task.dueTime ?? '');
    setEditing(true);
  }

  function save(nextDate: string, nextTime: string) {
    setEditing(false);
    const due = nextDate || undefined;
    const dueTime = nextDate && nextTime ? nextTime : undefined;   // a time only makes sense with a date
    if (due === task.due && dueTime === task.dueTime) return;
    const patch: Partial<Task> = { due, dueTime };
    // Clearing the date of an overdue task puts it back to To Do
    if (!due && task.status === 'overdue') patch.status = 'todo';
    updateTask(task.id, patch);
  }

  if (editing) {
    return (
      <span
        className={`q-due-edit ${className}`}
        onClick={stop}
        onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) save(date, time); }}
        onKeyDown={e => {
          if (e.key === 'Enter') save(date, time);
          if (e.key === 'Escape') setEditing(false);
        }}
      >
        <input type="date" value={date} autoFocus aria-label={`Due date of "${task.title}"`} onChange={e => setDate(e.target.value)} />
        <input type="time" value={time} disabled={!date} aria-label={`Due time of "${task.title}"`} onChange={e => setTime(e.target.value)} />
        {(date || time) && (
          <button type="button" className="q-clear" title="Remove due date and time" aria-label="Remove due date and time"
            onMouseDown={e => e.preventDefault()} onClick={() => save('', '')}>×</button>
        )}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`q-due${late ? ' late' : ''}${task.due ? '' : ' empty'} ${className}`}
      title={task.due ? 'Change due date and time' : 'Add a due date'}
      onClick={open}
    >
      {task.due
        ? <>{fmtDate(task.due).replace(/ \d{4}$/, '')}{task.dueTime && <span className="q-due-time">{fmt12hr(task.dueTime)}</span>}</>
        : '+ date'}
    </button>
  );
}

// ── Assignee / Repeat columns, folded into the ledger's top-right corner ──
const EXTRAS_KEY = 'pm_oyint_ledger_extras';

export function useLedgerExtras(): [boolean, () => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try { setOpen(localStorage.getItem(EXTRAS_KEY) === '1'); } catch {}
  }, []);
  function toggle() {
    setOpen(o => {
      try { localStorage.setItem(EXTRAS_KEY, o ? '0' : '1'); } catch {}
      return !o;
    });
  }
  return [open, toggle];
}

export function ExtrasToggle({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`extras-toggle${open ? ' open' : ''}`}
      aria-expanded={open}
      aria-label={open ? 'Hide assignee and repeat columns' : 'Show assignee and repeat columns'}
      title={open ? 'Hide assignee and repeat' : 'Show assignee and repeat'}
      onClick={e => { e.stopPropagation(); onToggle(); }}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <polyline points={open ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
      </svg>
    </button>
  );
}
