'use client';

import { useState, useId } from 'react';
import { Project } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { COLORS, PROJECT_TYPES, DEFAULT_AREAS } from '@/lib/constants';
import ColorPicker from '../ui/ColorPicker';
import { useEscape } from '../ui/useEscape';

interface ProjectModalProps {
  project?: Project;
  onClose: () => void;
}

const STATUSES = ['Active', 'Planning', 'On Hold', 'Completed'] as const;

export default function ProjectModal({ project, onClose }: ProjectModalProps) {
  useEscape(onClose);
  const fid = useId(); // links each label to its field
  const { addProject, updateProject, projects } = useAppStore();
  const areaSuggestions = Array.from(new Set([...DEFAULT_AREAS, ...projects.map(p => p.area).filter((a): a is string => !!a)]));
  const [form, setForm] = useState({
    name: project?.name ?? '',
    type: project?.type ?? PROJECT_TYPES[0],
    description: project?.description ?? '',
    status: project?.status ?? 'Active',
    color: project?.color ?? COLORS[0],
    start: project?.start ?? '',
    end: project?.end ?? '',
    area: project?.area ?? '',
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
      area: form.area.trim() || undefined,
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
          <label htmlFor={`${fid}-1`}>Project Name</label>
          <input id={`${fid}-1`} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Enter project name" autoFocus />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`${fid}-2`}>Type</label>
            <select id={`${fid}-2`} value={form.type} onChange={e => set('type', e.target.value)}>
              {PROJECT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor={`${fid}-3`}>Status</label>
            <select id={`${fid}-3`} value={form.status} onChange={e => set('status', e.target.value)}>
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="form-group">
          <label htmlFor={`${fid}-4`}>Life area</label>
          <input id={`${fid}-4`}
            list="project-area-options"
            value={form.area}
            onChange={e => set('area', e.target.value)}
            placeholder="e.g. Work, Business, Health, Family…"
          />
          <datalist id="project-area-options">
            {areaSuggestions.map(a => <option key={a} value={a} />)}
          </datalist>
        </div>

        <div className="form-group">
          <label htmlFor={`${fid}-5`}>Description</label>
          <textarea id={`${fid}-5`} value={form.description} onChange={e => set('description', e.target.value)} rows={3} placeholder="What is this project about?" />
        </div>

        <div className="form-group">
          <label>Color</label>
          <ColorPicker value={form.color} onChange={c => set('color', c)} />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor={`${fid}-6`}>Start Date</label>
            <input id={`${fid}-6`} type="date" value={form.start} onChange={e => set('start', e.target.value)} />
          </div>
          <div className="form-group">
            <label htmlFor={`${fid}-7`}>Deadline</label>
            <input id={`${fid}-7`} type="date" value={form.end} onChange={e => set('end', e.target.value)} />
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
