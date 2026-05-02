'use client';

import { useState } from 'react';
import { Task } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_META } from '@/lib/constants';
import { fmtDate } from '@/lib/utils';
import StatusPill from '../ui/StatusPill';
import PriorityIcon from '../ui/PriorityIcon';
import TaskModal from '../modals/TaskModal';
import ConfirmModal from '../modals/ConfirmModal';

interface TaskCardProps {
  task: Task;
  showProject?: boolean;
  isHighlighted?: boolean;
}

export default function TaskCard({ task, showProject, isHighlighted }: TaskCardProps) {
  const { projects, toggleTaskDone, updateTask, deleteTask, setView } = useAppStore();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const project = projects.find(p => p.id === task.projectId);
  const isDone = task.status === 'done';

  const priorityDot: Record<string, string> = {
    high: '#d68a8a', medium: '#d49a5d', low: '#6fa885',
  };

  return (
    <>
      <div
        id={`task-${task.id}`}
        className={isHighlighted ? 'task-highlight' : ''}
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          marginBottom: 8,
          transition: 'box-shadow 0.15s',
          boxShadow: 'var(--shadow)',
        }}
      >
        {/* Priority dot */}
        <span style={{
          width: 8, height: 8, borderRadius: '50%',
          background: priorityDot[task.priority],
          flexShrink: 0, marginTop: 6,
        }} />

        {/* Checkbox */}
        <button
          onClick={() => toggleTaskDone(task.id)}
          style={{
            width: 18, height: 18, borderRadius: 5,
            border: `2px solid ${isDone ? 'var(--success)' : 'var(--border-strong)'}`,
            background: isDone ? 'var(--success)' : 'transparent',
            flexShrink: 0, marginTop: 2,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.15s',
          }}
        >
          {isDone && (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
          )}
        </button>

        {/* Body */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 500, fontSize: 14,
            color: isDone ? 'var(--text-muted)' : 'var(--text)',
            textDecoration: isDone ? 'line-through' : 'none',
            marginBottom: 2,
          }}>{task.title}</div>

          {task.description && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 400 }}>
              {task.description.slice(0, 80)}
            </div>
          )}

          {/* Tags row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, alignItems: 'center' }}>
            <StatusPill
              status={task.status}
              onChange={s => updateTask(task.id, { status: s })}
            />
            <PriorityIcon priority={task.priority} />

            {task.due && (
              <span className={`badge ${task.status === 'overdue' ? 'badge-danger' : 'badge-gray'}`}>
                {fmtDate(task.due)}{task.dueTime ? ` ${task.dueTime}` : ''}
              </span>
            )}

            {task.assignee && (
              <span className="badge" style={{ background: '#f3ede4', color: 'var(--text-muted)' }}>
                {task.assignee}
              </span>
            )}

            {task.alerts && task.alerts.length > 0 && (
              <span className="badge badge-gray" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {task.alerts.length}
              </span>
            )}

            {showProject && project && (
              <span
                className="badge badge-gray"
                style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                onClick={() => setView('project', project.id)}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: project.color, display: 'inline-block' }} />
                {project.name}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          <button className="btn-icon" title="Filter by status" onClick={() => updateTask(task.id, { status: STATUS_META[task.status] ? task.status : 'todo' })}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
            </svg>
          </button>
          <button className="btn-icon" title="Edit task" onClick={() => setEditing(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="btn-icon" title="Delete task" onClick={() => setConfirming(true)} style={{ color: 'var(--danger)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
          </button>
        </div>
      </div>

      {editing && <TaskModal task={task} onClose={() => setEditing(false)} />}
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
