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
        <button className="btn btn-primary" style={{ height: 34, fontSize: 13 }} onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Note
        </button>
      </div>

      {projectNotes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No notes yet.</div>
      ) : (
        projectNotes.map(n => (
          <div key={n.id} className="card" style={{ marginBottom: 12, padding: '16px 18px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{n.title}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>
                  {new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => setEditing(n)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(n.id)}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </div>

            {n.body && <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: n.tags.length ? 10 : 0 }}>{n.body}</p>}

            {n.tags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {n.tags.map(tag => (
                  <span key={tag} className="badge badge-gray" style={{ fontSize: 10 }}>{tag}</span>
                ))}
              </div>
            )}
          </div>
        ))
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
