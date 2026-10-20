'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Note } from '@/lib/types';
import NoteModal from '../modals/NoteModal';
import ConfirmModal from '../modals/ConfirmModal';

export default function NotesTab({ projectId }: { projectId: string }) {
  const { notes, deleteNote } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Note | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const projectNotes = notes.filter(n => n.projectId === projectId).sort((a, b) => b.createdAt - a.createdAt);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Note
        </button>
      </div>

      {projectNotes.length === 0 ? (
        <div className="empty-state"><h3>No notes yet</h3><p>Capture thoughts, decisions, and context here.</p></div>
      ) : (
        <div className="note-cards">
          {projectNotes.map(n => (
            <div key={n.id} className="note-card" onClick={() => setEditing(n)} title="Edit note">
              <span className="note-tape" aria-hidden />
              <div className="note-card-actions">
                <button className="btn-icon" title="Edit note" onClick={e => { e.stopPropagation(); setEditing(n); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-icon" title="Delete note" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setConfirming(n.id); }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                  </svg>
                </button>
              </div>
              <div className="note-card-title">{n.title}</div>
              {n.body && <div className="note-card-body">{n.body}</div>}
              <div className="note-card-foot">
                <span>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                {n.tags.length > 0 && (
                  <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {n.tags.map(tag => <span key={tag} className="badge badge-gray" style={{ fontSize: 10 }}>{tag}</span>)}
                  </span>
                )}
              </div>
            </div>
          ))}
          <button className="note-card note-card-new" onClick={() => setShowAdd(true)}>+ New note</button>
        </div>
      )}

      {showAdd && <NoteModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
      {editing && <NoteModal note={editing} onClose={() => setEditing(null)} />}
      {confirming && (
        <ConfirmModal
          message="Delete this note?"
          onConfirm={() => { deleteNote(confirming); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
