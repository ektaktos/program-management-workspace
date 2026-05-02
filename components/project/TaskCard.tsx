'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
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
const PRIORITY_BADGE: Record<string, string> = {
  high: 'badge-danger', medium: 'badge-warning', low: 'badge-success',
};

export default function TaskCard({ task, showProject, isHighlighted }: TaskCardProps) {
  const { projects, toggleTaskDone, updateTask, deleteTask, setView } = useAppStore();
  const [editing, setEditing]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const project = projects.find(p => p.id === task.projectId);
  const isDone  = task.status === 'done';

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

            {/* Priority as text badge */}
            <span className={`badge ${PRIORITY_BADGE[task.priority]}`}>{task.priority}</span>

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
