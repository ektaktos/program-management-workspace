'use client';

import { useState } from 'react';
import { Task, Alert, Subtask } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { STATUS_ORDER, STATUS_META } from '@/lib/constants';

interface TaskModalProps {
  task?: Task;
  defaultProjectId?: string;
  defaultPhaseId?: string;
  onClose: () => void;
}

export default function TaskModal({ task, defaultProjectId, defaultPhaseId, onClose }: TaskModalProps) {
  const { projects, phases, addTask, updateTask } = useAppStore();
  const [form, setForm] = useState({
    title: task?.title ?? '',
    description: task?.description ?? '',
    projectId: task?.projectId ?? defaultProjectId ?? (projects[0]?.id ?? ''),
    phaseId: task?.phaseId ?? defaultPhaseId ?? '',
    status: task?.status ?? 'todo',
    priority: task?.priority ?? 'medium',
    due: task?.due ?? '',
    dueTime: task?.dueTime ?? '',
    assignee: task?.assignee ?? '',
    alerts: task?.alerts ?? [] as Alert[],
    recurring: task?.recurring ?? '',
    subtasks: task?.subtasks ?? [] as Subtask[],
    newSubtask: '',
  });

  const projectPhases = phases.filter(p => p.projectId === form.projectId);

  function setF(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })); }

  function addSubtask() {
    if (!form.newSubtask.trim()) return;
    const sub: Subtask = { id: Date.now().toString(36), title: form.newSubtask.trim(), done: false };
    setForm(f => ({ ...f, subtasks: [...f.subtasks, sub], newSubtask: '' }));
  }
  function removeSubtask(id: string) {
    setForm(f => ({ ...f, subtasks: f.subtasks.filter(s => s.id !== id) }));
  }
  function toggleSubtaskModal(id: string) {
    setForm(f => ({ ...f, subtasks: f.subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s) }));
  }

  function addAlert() { setF('alerts', [...form.alerts, { value: 1, unit: 'hours' }]); }
  function removeAlert(i: number) { setF('alerts', form.alerts.filter((_, idx) => idx !== i)); }
  function updateAlert(i: number, k: string, v: unknown) {
    setF('alerts', form.alerts.map((a, idx) => idx === i ? { ...a, [k]: v } : a));
  }

  function save() {
    if (!form.title.trim() || !form.projectId) return;
    const data = {
      title: form.title.trim(),
      description: form.description,
      projectId: form.projectId,
      phaseId: form.phaseId || undefined,
      status: form.status as Task['status'],
      priority: form.priority as Task['priority'],
      due: form.due || undefined,
      dueTime: form.dueTime || undefined,
      assignee: form.assignee || undefined,
      alerts: form.alerts,
      recurring: form.recurring || undefined,
      subtasks: form.subtasks,
    };
    if (task) updateTask(task.id, data);
    else addTask(data);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{task ? 'Edit Task' : 'New Task'}</div>

        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Task title" autoFocus />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => setF('description', e.target.value)} rows={2} placeholder="Optional details..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Project</label>
            <select value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Phase (optional)</label>
            <select value={form.phaseId} onChange={e => setF('phaseId', e.target.value)}>
              <option value="">No phase</option>
              {projectPhases.map(ph => <option key={ph.id} value={ph.id}>{ph.name}</option>)}
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => setF('status', e.target.value)}>
              {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Priority</label>
            <select value={form.priority} onChange={e => setF('priority', e.target.value)}>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Due Date</label>
            <input type="date" value={form.due} onChange={e => setF('due', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Due Time</label>
            <input type="time" value={form.dueTime} onChange={e => setF('dueTime', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Recurring</label>
          <select value={form.recurring} onChange={e => setF('recurring', e.target.value)}>
            <option value="">None</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>

        <div className="form-group">
          <label>Assignee</label>
          <input value={form.assignee} onChange={e => setF('assignee', e.target.value)} placeholder="Name" />
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Alerts</label>
            <button type="button" className="btn btn-outline" style={{ padding: '4px 10px', fontSize: 12 }} onClick={addAlert}>+ Add alert</button>
          </div>
          {form.alerts.map((a, i) => (
            <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
              <input type="number" min={1} value={a.value} onChange={e => updateAlert(i, 'value', Number(e.target.value))} style={{ width: 70 }} />
              <select value={a.unit} onChange={e => updateAlert(i, 'unit', e.target.value)} style={{ flex: 1 }}>
                <option value="minutes">minutes before</option>
                <option value="hours">hours before</option>
                <option value="days">days before</option>
              </select>
              <button type="button" className="btn-icon" onClick={() => removeAlert(i)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="form-group">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <label style={{ margin: 0 }}>Subtasks</label>
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={form.newSubtask}
              onChange={e => setF('newSubtask', e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSubtask(); } }}
              placeholder="Add a subtask..."
              style={{ flex: 1 }}
            />
            <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: 12, flexShrink: 0 }} onClick={addSubtask}>Add</button>
          </div>
          {form.subtasks.map((sub, i) => (
            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
              <div
                onClick={() => toggleSubtaskModal(sub.id)}
                style={{
                  width: 15, height: 15, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
                  border: `1.5px solid ${sub.done ? 'var(--success)' : 'var(--border-strong)'}`,
                  background: sub.done ? 'var(--success)' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                {sub.done && <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" style={{ width: 9, height: 9 }}><polyline points="20 6 9 17 4 12"/></svg>}
              </div>
              <span style={{ flex: 1, fontSize: 13, textDecoration: sub.done ? 'line-through' : 'none', opacity: sub.done ? 0.6 : 1 }}>{sub.title}</span>
              <button type="button" className="btn-icon" onClick={() => removeSubtask(sub.id)}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{task ? 'Save Changes' : 'Create Task'}</button>
        </div>
      </div>
    </div>
  );
}
