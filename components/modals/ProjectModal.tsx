'use client';

import { useState } from 'react';
import { Project } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { COLORS, PROJECT_TYPES } from '@/lib/constants';
import ColorPicker from '../ui/ColorPicker';

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
}

const STATUSES = ['Active', 'Planning', 'On Hold', 'Completed'] as const;

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  const { addProject, updateProject } = useAppStore();
  const [form, setForm] = useState({
    name: project?.name ?? '',
    type: project?.type ?? PROJECT_TYPES[0],
    description: project?.description ?? '',
    status: project?.status ?? 'Active',
    color: project?.color ?? COLORS[0],
    start: project?.start ?? '',
    end: project?.end ?? '',
  });

  function save() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      type: form.type,
      description: form.description,
      status: form.status as Project['status'],
      color: form.color,
      start: form.start || undefined,
      end: form.end || undefined,
    };
    if (project) updateProject(project.id, data);
    else addProject(data);
    onClose();
  }

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{project ? 'Edit Project' : 'New Project'}</div>

        <div className="form-group">
          <label>Project Name</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter project name" autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Type</label>
            <select value={form.type} onChange={e => set('type', e.target.value)}>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="What is this project about?" />
        </div>

        <div className="form-group">
          <label>Color</label>
          <ColorPicker value={form.color} onChange={c => set('color', c)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start} onChange={e => set('start', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Deadline</label>
            <input type="date" value={form.end} onChange={e => set('end', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{project ? 'Save Changes' : 'Create Project'}</button>
        </div>
      </div>
    </div>
  );
}
