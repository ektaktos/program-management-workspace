'use client';

import { useState, useId } from 'react';
import { Note } from '@/lib/types';
import { useAppStore } from '@/store/useAppStore';
import { useEscape } from '../ui/useEscape';

interface NoteModalProps {
  note?: Note;
  defaultProjectId?: string;
  onClose: () => void;
}

export default function NoteModal({ note, defaultProjectId, onClose }: NoteModalProps) {
  useEscape(onClose);
  const fid = useId(); // links each label to its field
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
          <label htmlFor={`${fid}-1`}>Title</label>
          <input id={`${fid}-1`} value={form.title} onChange={e => setF('title', e.target.value)} placeholder="Note title" autoFocus />
        </div>

        <div className="form-group">
          <label htmlFor={`${fid}-2`}>Body</label>
          <textarea id={`${fid}-2`} value={form.body} onChange={e => setF('body', e.target.value)} rows={5} placeholder="Write your note here..." />
        </div>

        <div className="form-group">
          <label htmlFor={`${fid}-3`}>Project</label>
          <select id={`${fid}-3`} value={form.projectId} onChange={e => setF('projectId', e.target.value)}>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label htmlFor={`${fid}-4`}>Tags (comma-separated)</label>
          <input id={`${fid}-4`} value={form.tags} onChange={e => setF('tags', e.target.value)} placeholder="research, design, notes" />
        </div>

        <div className="modal-footer">
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>{note ? 'Save Changes' : 'Create Note'}</button>
        </div>
      </div>
    </div>
  );
}
