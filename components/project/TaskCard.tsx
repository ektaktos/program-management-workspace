'use client';

import { useState } from 'react';
import { Task, Subtask } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import StatusPill from '../ui/StatusPill';
import TaskModal from '../modals/TaskModal';
import ConfirmModal from '../modals/ConfirmModal';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  isHighlighted?: boolean;
}

const PRIORITY_DOT: Record<string, string> = {
  high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)',
};

const PRIORITY_CFG: Record<string, { cls: string; color: string; bars: [number, number, number]; label: string }> = {
  high:   { cls: 'badge-danger',  color: '#d68a8a', bars: [1, 1, 1],          label: 'High priority' },
  medium: { cls: 'badge-warning', color: '#d49a5d', bars: [1, 1, 0.18],       label: 'Medium priority' },
  low:    { cls: 'badge-success', color: '#6fa885', bars: [1, 0.18, 0.18],    label: 'Low priority' },
};

function PriorityIcon({ priority }: { priority: string }) {
  const cfg = PRIORITY_CFG[priority] ?? PRIORITY_CFG.medium;
  return (
    <span className={`badge ${cfg.cls}`} title={cfg.label} style={{ padding: '3px 6px', display: 'inline-flex', alignItems: 'center', lineHeight: 1 }}>
      <svg width="14" height="12" viewBox="0 0 14 12" fill={cfg.color}>
        <rect x="0"    y="6"  width="3.2" height="6"  rx="0.8" opacity={cfg.bars[0]} />
        <rect x="5.4"  y="3"  width="3.2" height="9"  rx="0.8" opacity={cfg.bars[1]} />
        <rect x="10.8" y="0"  width="3.2" height="12" rx="0.8" opacity={cfg.bars[2]} />
      </svg>
    </span>
  );
}

export default function TaskCard({ task, showProject, isHighlighted }: TaskCardProps) {
  const { projects, toggleTaskDone, updateTask, deleteTask, setView } = useAppStore();
  const [editing, setEditing]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [subtasksOpen, setSubtasksOpen] = useState(false);
  const project = projects.find(p => p.id === task.projectId);
  const isDone  = task.status === 'done';

  function toggleSubtask(subtaskId: string) {
    const updated = (task.subtasks ?? []).map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    updateTask(task.id, { subtasks: updated });
  }

  return (
    <>
      <div
        id={`task-${task.id}`}
        className={isHighlighted ? 'task-highlight' : ''}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 14,
          transition: 'background 0.18s, border-color 0.18s, box-shadow 0.18s',
          opacity: isDone ? 0.55 : 1,
        }}
        onMouseOver={e => { if (!isDone) { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--border-strong)'; el.style.boxShadow = 'var(--shadow)'; } }}
        onMouseOut={e => { const el = e.currentTarget as HTMLDivElement; el.style.borderColor = 'var(--border)'; el.style.boxShadow = 'none'; }}
      >
        {/* Priority dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: PRIORITY_DOT[task.priority],
          flexShrink: 0, marginTop: 6,
        }} />

        {/* Checkbox */}
        <div
          onClick={() => toggleTaskDone(task.id)}
          style={{
            width: 18, height: 18, borderRadius: 6,
            border: `1.5px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`,
            background: isDone ? 'var(--success)' : 'var(--surface)',
            flexShrink: 0, marginTop: 1, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {isDone && (
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </div>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13.5, fontWeight: 500,
            marginBottom: 6, color: 'var(--text)',
            textDecoration: isDone ? 'line-through' : 'none',
          }}>{task.title}</div>

          {task.description && (
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)', margin: '4px 0 6px', lineHeight: 1.5 }}>
              {task.description.slice(0, 80)}
            </div>
          )}

          {/* Tags */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
            <StatusPill status={task.status} onChange={s => updateTask(task.id, { status: s })} />

            <PriorityIcon priority={task.priority} />

            {task.due && (
              <span className={`badge ${task.status === 'overdue' ? 'badge-danger' : 'badge-gray'}`}>
                Due {fmtDate(task.due)}{task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}

            {task.assignee && (
              <span className="badge badge-purple">{task.assignee}</span>
            )}

            {task.alerts && task.alerts.length > 0 && (
              <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                  <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 01-3.46 0"/>
                </svg>
                {task.alerts.length}
              </span>
            )}

            {task.recurring && (
              <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 10, height: 10 }}>
                  <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                  <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                </svg>
                {task.recurring}
              </span>
            )}

            {showProject && project && (
              <span
                className="badge badge-gray"
                style={{ cursor: 'pointer' }}
                onClick={() => setView('project', project.id)}
              >
                {project.name}
              </span>
            )}
          </div>

          {task.subtasks && task.subtasks.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => setSubtasksOpen(v => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ width: 12, height: 12, transform: subtasksOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
                <span>{task.subtasks.filter(s => s.done).length}/{task.subtasks.length} subtasks</span>
                {/* mini progress bar */}
                <div style={{ flex: 1, maxWidth: 60, height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--success)', borderRadius: 999, width: `${Math.round((task.subtasks.filter(s => s.done).length / task.subtasks.length) * 100)}%`, transition: 'width 0.3s ease' }} />
                </div>
              </button>
              {subtasksOpen && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {task.subtasks.map(sub => (
                    <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        onClick={() => toggleSubtask(sub.id)}
                        style={{
                          width: 14, height: 14, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                          border: `1.5px solid ${sub.done ? 'var(--success)' : 'var(--border-strong)'}`,
                          background: sub.done ? 'var(--success)' : 'var(--surface)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.15s',
                        }}
                      >
                        {sub.done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" style={{ width: 8, height: 8 }}><polyline points="20 6 9 17 4 12"/></svg>}
                      </div>
                      <span style={{ fontSize: 12.5, color: 'var(--text)', textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.55 : 1 }}>{sub.title}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn-icon" title="Filter by status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
          <button className="btn-icon" title="Edit task" onClick={() => setEditing(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="btn-icon" title="Delete task" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {editing    && <TaskModal task={task} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmModal
          message={`Delete task "${task.title}"?`}
          onConfirm={() => { deleteTask(task.id); setConfirming(false); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}
