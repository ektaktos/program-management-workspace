'use client';

import { useState } from 'react';
import { Note } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';

interface NoteModalProps {
  note?: Note;
  defaultProjectId?: string;
  onClose: () => void;
}

export default function NoteModal({ note, defaultProjectId, onClose }: NoteModalProps) {
  const { projects, addNote, updateNote } = useAppStore();
  const [form, setForm] = useState({
    title: note?.title ?? '',
    body: note?.body ?? '',
    projectId: note?.projectId ?? defaultProjectId ?? (projects[0]?.id ?? ''),
    tags: note?.tags?.join(', ') ?? '',
  });

  function setF(k: string, v: string) { setForm(f => ({ ...f, [k]: v })); }

  function save() {
    if (!form.title.trim()) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    const data = { title: form.title.trim(), body: form.body, projectId: form.projectId, tags };
    if (note) updateNote(note.id, data);
    else addNote(data);
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title">{note ? 'Edit Note' : 'New Note'}</div>

        <div className="form-group">
          <label>Title</label>
          <input value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Note title" autoFocus />
        </div>

        <div className="form-group">
          <label>Body</label>
          <textarea value={form.body} onChange={e => setF('body', e.target.value)} rows={5} placeholder="Write your note here..." />
        </div>

        <div className="form-group">
          <label>Project</label>
          <select value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label>Tags (comma-separated)</label>
          <input value={form.tags} onChange={e => setF('tags', e.target.value)} placeholder="research, design, notes" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{note ? 'Save Changes' : 'Create Note'}</button>
        </div>
      </div>
    </div>
  );
}
