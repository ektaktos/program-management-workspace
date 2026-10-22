'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Note } from '@/lib/types';
import { projectInArea } from '@/lib/utils';
import NoteModal from '../modals/NoteModal';
import ConfirmModal from '../modals/ConfirmModal';

const LOOSE = '__loose__';
const DRAWER_KEY = 'pm_oyint_notes_drawer';

const fmtDay = (ms: number) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

// Notes as a card catalog: one drawer per project plus Loose notes. Pull a drawer to open its
// rolodex, flip through the cards newest first, and file or move a card without opening it.
export default function NotesView() {
  const { notes, projects, archivedProjectIds, areaFilter, updateNote, deleteNote } = useAppStore();
  const [drawer, setDrawer] = useState<string>(LOOSE);
  const [index, setIndex] = useState(0);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Note | null>(null);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const liveProjects = projects.filter(p => !archivedProjectIds.includes(p.id) && projectInArea(p, areaFilter));
  const liveIds = new Set(liveProjects.map(p => p.id));
  const q = query.trim().toLowerCase();
  const matches = (n: Note) => !q || `${n.title} ${n.body} ${n.tags.join(' ')}`.toLowerCase().includes(q);
  // Notes whose project is archived or outside the area filter are left out, like elsewhere
  const visible = notes.filter(n => !n.projectId || liveIds.has(n.projectId));
  const inDrawer = (id: string) => visible
    .filter(n => (id === LOOSE ? !n.projectId : n.projectId === id) && matches(n))
    .sort((a, b) => b.createdAt - a.createdAt);

  const drawers = [{ id: LOOSE, name: 'Loose notes', color: 'var(--border-strong)' }]
    .concat(liveProjects.map(p => ({ id: p.id, name: p.name, color: p.color })));

  // Remember the open drawer on this device
  useEffect(() => {
    try { const d = localStorage.getItem(DRAWER_KEY); if (d) setDrawer(d); } catch {}
  }, []);
  function openDrawer(id: string, at = 0) {
    setDrawer(id);
    setIndex(at);
    try { localStorage.setItem(DRAWER_KEY, id); } catch {}
  }

  // A drawer that no longer exists (project archived/filtered) falls back to Loose notes;
  // while searching, jump to the first drawer that has matches
  const drawerIds = drawers.map(d => d.id);
  const current = drawerIds.includes(drawer) ? drawer : LOOSE;
  let cards = inDrawer(current);
  let shownDrawer = current;
  if (q && cards.length === 0) {
    const firstHit = drawers.find(d => inDrawer(d.id).length > 0);
    if (firstHit) { shownDrawer = firstHit.id; cards = inDrawer(firstHit.id); }
  }
  const i = Math.min(index, Math.max(0, cards.length - 1));
  const card = cards[i];
  const drawerInfo = drawers.find(d => d.id === shownDrawer)!;

  function step(d: number) {
    if (cards.length < 2) return;
    setIndex((i + d + cards.length) % cards.length);
  }

  function fileUnder(n: Note, projectId: string) {
    updateNote(n.id, { projectId: projectId || undefined });
    // Follow the card into its new drawer
    const target = projectId || LOOSE;
    const pos = visible
      .map(x => (x.id === n.id ? { ...x, projectId: projectId || undefined } : x))
      .filter(x => (target === LOOSE ? !x.projectId : x.projectId === target))
      .sort((a, b) => b.createdAt - a.createdAt)
      .findIndex(x => x.id === n.id);
    openDrawer(target, Math.max(0, pos));
  }

  const total = visible.length;
  const looseCount = visible.filter(n => !n.projectId).length;

  return (
    <div>
      <div className="nv-toolbar">
        <input
          className="toolbar-input"
          placeholder="Search all notes…"
          aria-label="Search all notes"
          value={query}
          onChange={e => { setQuery(e.target.value); setIndex(0); }}
          style={{ flex: 1, minWidth: 160 }}
        />
        <button className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>+ New note</button>
      </div>
      <div className="nv-sub">
        {total} note{total !== 1 ? 's' : ''} · {looseCount} loose
        {q && ` · ${drawers.reduce((s, d) => s + inDrawer(d.id).length, 0)} match “${query.trim()}”`}
      </div>

      {/* The cabinet: one drawer per project, Loose notes first */}
      <div className="nv-cabinet" role="tablist" aria-label="Note drawers">
        {drawers.map(d => {
          const count = inDrawer(d.id).length;
          const open = d.id === shownDrawer;
          return (
            <button
              key={d.id}
              type="button"
              role="tab"
              aria-selected={open}
              className={`nv-drawer${open ? ' open' : ''}${count === 0 ? ' empty' : ''}`}
              onClick={() => openDrawer(d.id)}
            >
              <span className="nv-plate">
                <span className="today-dot" style={{ background: d.color, margin: 0 }} />
                <span className="nv-plate-name">{d.name}</span>
              </span>
              <span className="nv-count">{count} card{count !== 1 ? 's' : ''}</span>
              <span className="nv-knob" aria-hidden />
            </button>
          );
        })}
      </div>

      {/* The open drawer, as a rolodex */}
      <div className="nv-rolo" role="tabpanel" aria-label={drawerInfo.name}>
        {!card ? (
          <div className="nv-empty">
            {q
              ? 'No notes match your search.'
              : shownDrawer === LOOSE
                ? 'No loose notes. Notes you add without a project land here.'
                : `No notes filed under ${drawerInfo.name} yet.`}
            {!q && <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setCreating(true)}>+ New note</button>}
          </div>
        ) : (
          <>
            <div className="nv-tabs" aria-label="Cards in this drawer">
              {cards.map((n, k) => (
                <button key={n.id} type="button" className={`nv-tab${k === i ? ' on' : ''}`} onClick={() => setIndex(k)} title={n.title}>
                  <span className="nv-tab-title">{n.title || 'Untitled note'}</span>
                  <span className="nv-tab-date">{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                </button>
              ))}
            </div>

            <div className="nv-reader">
              <div
                key={card.id}
                ref={cardRef}
                className="nv-card"
                tabIndex={0}
                aria-label={`${card.title}, card ${i + 1} of ${cards.length}. Use the arrow keys to flip.`}
                onKeyDown={e => {
                  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); step(1); }
                  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); step(-1); }
                }}
              >
                <div className="nv-card-head">
                  <div className="nv-card-title">{card.title || 'Untitled note'}</div>
                  <div className="nv-card-actions">
                    <button className="btn-icon" title="Edit note" aria-label="Edit note" onClick={() => setEditing(card)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button className="btn-icon" title="Delete note" aria-label="Delete note" style={{ color: 'var(--danger)' }} onClick={() => setDeleting(card)}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                    </button>
                  </div>
                </div>
                <div className="nv-card-meta">
                  {fmtDay(card.createdAt)}
                  {card.tags.length > 0 && <> · {card.tags.map(t => <span key={t} className="badge badge-gray" style={{ fontSize: 10.5, marginLeft: 4 }}>{t}</span>)}</>}
                </div>
                <div className="nv-card-body">{card.body || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>No text yet. Use edit to write this note.</span>}</div>
              </div>

              <div className="nv-controls">
                <button className="btn btn-ghost btn-sm" onClick={() => step(-1)} disabled={cards.length < 2} aria-label="Newer note">‹ Newer</button>
                <span className="nv-pos">{i + 1} of {cards.length}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => step(1)} disabled={cards.length < 2} aria-label="Older note">Older ›</button>
                <label className="nv-file">
                  <span>File under</span>
                  <select value={card.projectId ?? ''} onChange={e => fileUnder(card, e.target.value)} aria-label="Move this note to a project">
                    <option value="">No project (loose)</option>
                    {liveProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
              </div>
            </div>
          </>
        )}
      </div>

      {creating && <NoteModal defaultProjectId={shownDrawer === LOOSE ? undefined : shownDrawer} onClose={() => setCreating(false)} />}
      {editing && <NoteModal note={editing} onClose={() => setEditing(null)} />}
      {deleting && (
        <ConfirmModal
          message={`Delete "${deleting.title}"? This can't be undone.`}
          onConfirm={() => { deleteNote(deleting.id); setDeleting(null); }}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
