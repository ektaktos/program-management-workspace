'use client';

import { useState } from 'react';
import { Milestone } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

interface MilestoneModalProps {
  milestone?: Milestone;
  defaultProjectId?: string;
  onClose: () => void;
}

export default function MilestoneModal({ milestone, defaultProjectId, onClose }: MilestoneModalProps) {
  const { projects, addMilestone, updateMilestone } = useAppStore();
  const [form, setForm] = useState({
    title: milestone?.title ?? '',
    desc: milestone?.desc ?? '',
    projectId: milestone?.projectId ?? defaultProjectId ?? (projects[0]?.id ?? ''),
    date: milestone?.date ?? '',
    status: milestone?.status ?? 'upcoming',
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function save() {
    if (!form.title.trim()) return;
    const data = {
      title: form.title.trim(),
      desc: form.desc,
      projectId: form.projectId,
      date: form.date || undefined,
      status: form.status as Milestone['status'],
    };
    if (milestone) updateMilestone(milestone.id, data);
    else addMilestone(data);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{milestone ? 'Edit Milestone' : 'New Milestone'}</div>

        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Milestone title" autoFocus />
        </div>

        <div className="form-group">
          <label>Description</label>
          <textarea value={form.desc} onChange={e => setF('desc', e.target.value)} rows={2} placeholder="Optional details..." />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Project</label>
            <select value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={form.date} onChange={e => setF('date', e.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label>Status</label>
          <select value={form.status} onChange={e => setF('status', e.target.value)}>
            <option value="upcoming">Upcoming</option>
            <option value="done">Done</option>
            <option value="overdue">Overdue</option>
          </select>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{milestone ? 'Save Changes' : 'Create Milestone'}</button>
        </div>
      </div>
    </div>
  );
}
