'use client';

import { useState } from 'react';
import { Phase } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

interface PhaseModalProps {
  phase?: Phase;
  defaultProjectId?: string;
  onClose: () => void;
}

export default function PhaseModal({ phase, defaultProjectId, onClose }: PhaseModalProps) {
  const { projects, addPhase, updatePhase } = useAppStore();
  const [form, setForm] = useState({
    name: phase?.name ?? '',
    notes: phase?.notes ?? '',
    projectId: phase?.projectId ?? defaultProjectId ?? (projects[0]?.id ?? ''),
    start: phase?.start ?? '',
    end: phase?.end ?? '',
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function save() {
    if (!form.name.trim()) return;
    const data = {
      name: form.name.trim(),
      notes: form.notes,
      projectId: form.projectId,
      start: form.start || undefined,
      end: form.end || undefined,
      progress: phase?.progress ?? 0, // section progress is now derived from its tasks
    };
    if (phase) updatePhase(phase.id, data);
    else addPhase(data);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{phase ? 'Edit Section' : 'New Section'}</div>

        <div className="form-group">
          <label>Section Name</label>
          <input value={form.name} onChange={e => setF('name', e.target.value)} placeholder="e.g. Research, Design, Admin…" autoFocus />
        </div>

        <div className="form-group">
          <label>Notes</label>
          <textarea value={form.notes} onChange={e => setF('notes', e.target.value)} rows={2} placeholder="Optional notes..." />
        </div>

        <div className="form-group">
          <label>Project</label>
          <select value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Start Date</label>
            <input type="date" value={form.start} onChange={e => setF('start', e.target.value)} />
          </div>
          <div className="form-group">
            <label>End Date</label>
            <input type="date" value={form.end} onChange={e => setF('end', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{phase ? 'Save Changes' : 'Create Section'}</button>
        </div>
      </div>
    </div>
  );
}
