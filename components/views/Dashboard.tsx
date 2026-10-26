'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, projectInArea } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';
import NoteModal from '../modals/NoteModal';
import { Note } from '@/lib/types';
import { useTodayMeetings } from '../ui/TodayMeetings';

function daysLeft(iso: string): string {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due   = new Date(iso + 'T00:00:00'); due.setHours(0, 0, 0, 0);
  const diff  = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return 'overdue';
  if (diff === 0) return 'today';
  return `${diff}d left`;
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" style={{ width: 9, height: 9 }}>
      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function Dashboard() {
  const { projects: allProjects, tasks: allTasks, notes, todos, addTodo, updateTodo, toggleTodo, deleteTodo, updateNote, setView, navigateToTask, archivedProjectIds, archivedTaskIds, areaFilter } = useAppStore();
  const meetingsToday = useTodayMeetings();
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNoteOpen, setNewNoteOpen] = useState(false);
  const projects = allProjects.filter(p => !archivedProjectIds.includes(p.id) && projectInArea(p, areaFilter));
  const visibleProjectIds = new Set(projects.map(p => p.id));
  const tasks    = allTasks.filter(t => !archivedTaskIds.includes(t.id) && visibleProjectIds.has(t.projectId));
  const [todoInput, setTodoInput] = useState('');
  const todoRef = useRef<HTMLInputElement>(null);
  const [editingTodoId, setEditingTodoId] = useState<string | null>(null);
  const [editingTodoText, setEditingTodoText] = useState('');

  function startEditTodo(id: string, text: string) {
    setEditingTodoId(id);
    setEditingTodoText(text);
  }
  function saveEditTodo() {
    if (editingTodoId && editingTodoText.trim()) updateTodo(editingTodoId, editingTodoText.trim());
    setEditingTodoId(null);
    setEditingTodoText('');
  }
  function cancelEditTodo() { setEditingTodoId(null); setEditingTodoText(''); }

  function handleAddTodo() {
    if (!todoInput.trim()) return;
    addTodo(todoInput.trim());
    setTodoInput('');
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });
  const openCount = todos.filter(t => !t.done).length;

  const totalTasks      = tasks.length;
  const doneTasks       = tasks.filter(t => t.status === 'done').length;
  const overdueTasks    = tasks.filter(t => t.status === 'overdue').length;
  const activeProjects  = projects.filter(p => p.status === 'Active');
  const completionPct   = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done')
    .sort((a, b) => new Date(a.due!).getTime() - new Date(b.due!).getTime())
    .slice(0, 6);

  // Latest notes: independent ones plus those from projects in view (respects the area filter and archive)
  // Pinned notes always show first; the newest of the rest fill up to four cards
  const shownNotes = notes.filter(n => !n.projectId || visibleProjectIds.has(n.projectId)).sort((a, b) => b.createdAt - a.createdAt);
  const pinnedNotes = shownNotes.filter(n => n.pinned);
  const recentNotes = [...pinnedNotes, ...shownNotes.filter(n => !n.pinned).slice(0, Math.max(0, 4 - pinnedNotes.length))];

  const statCards = [
    { label: 'Completion', value: completionPct,     pct: true, sub: 'across all projects',   onClick: undefined },
    { label: 'Tasks',      value: totalTasks,        sub: `${doneTasks} completed`,           onClick: () => setView('tasks'), meetings: true },
    { label: 'Projects',   value: projects.length, sub: `${activeProjects.length} active`,   onClick: () => setView('projects') },
    {
      label: 'Overdue', value: overdueTasks,
      sub: overdueTasks > 0 ? 'needs attention' : 'all on track',
      danger: overdueTasks > 0,
      onClick: overdueTasks > 0 ? () => setView('tasks') : undefined,
    },
  ];

  return (
    <div>
      {/* Stat cards */}
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 16 }}>
        {statCards.map(c => (
          <div
            key={c.label}
            onClick={c.onClick}
            className="stat-card"
            style={{
              background: 'var(--card-bg)',
              borderRadius: 'var(--card-radius)',
              padding: '20px 22px',
              border: 'var(--card-border-w) solid var(--card-border-c)',
              boxShadow: 'var(--card-shadow)',
              cursor: c.onClick ? 'pointer' : 'default',
              transition: 'all 0.18s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => { if (c.onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; } }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--card-border-c)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--card-shadow)'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
          >
            {c.pct && (
              // Completion steeps like tea: the liquid rises to the completion level with a slow wave on top
              <div className="tea-liquid" style={{ height: `${Math.max(c.value, 3)}%` }} aria-hidden>
                <svg viewBox="0 0 400 20" preserveAspectRatio="none">
                  <path d="M0 10 Q25 0 50 10 T100 10 T150 10 T200 10 T250 10 T300 10 T350 10 T400 10 V20 H0Z" style={{ fill: 'var(--tea-fill)' }} />
                </svg>
              </div>
            )}
            <div style={{ position: 'relative', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              {c.label}
            </div>
            <div className="stat-value" style={{
              position: 'relative',
              fontSize: 44, fontWeight: 700,
              fontFamily: 'var(--font-display)',
              letterSpacing: '-0.025em', lineHeight: 1,
              color: c.danger ? 'var(--danger)' : 'var(--text)',
            }}>
              {c.value}{c.pct && <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 600 }}>%</span>}
            </div>
            <div style={{ position: 'relative', fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{c.sub}</div>
            {c.meetings && (
              <button
                type="button"
                className="stat-meetings"
                onClick={e => { e.stopPropagation(); setView('today'); }}
                title={meetingsToday.total === 0
                  ? 'No meetings today'
                  : `${meetingsToday.total} meeting${meetingsToday.total !== 1 ? 's' : ''} today · ${meetingsToday.left} still to come — open Today`}
                aria-label={`${meetingsToday.total} meetings today`}
              >
                <span className="stat-meetings-num">{meetingsToday.total}</span>
                <span className="stat-meetings-lbl">meeting{meetingsToday.total !== 1 ? 's' : ''}</span>
                <span className="stat-meetings-lbl stat-meetings-when">today</span>
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Left column: Active Projects + To-Do List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Active Projects */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}>
              Active Projects
              <span style={{ fontSize: 12, color: 'var(--primary-dark)', cursor: 'pointer', fontWeight: 500 }} onClick={() => setView('projects')}>View all</span>
            </div>
            {activeProjects.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No active projects.</div>
            ) : (
              activeProjects.map(p => {
                const pct = calcProjectProgress(p.id, tasks);
                return (
                  <div
                    key={p.id}
                    onClick={() => setView('project', p.id)}
                    style={{ cursor: 'pointer', padding: '12px 0', borderBottom: '1px solid var(--border)' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: p.color }} />
                        <span style={{ fontSize: 13.5, fontWeight: 500 }}>{p.name}</span>
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{pct}%</span>
                    </div>
                    <ProgressBar value={pct} color={p.color} height={6} />
                  </div>
                );
              })
            )}
          </div>

          {/* To-Do List */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                To-Do List
                {todos.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {openCount} open &middot; {todos.length} total
                  </span>
                )}
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                style={{ fontSize: 12, color: 'var(--primary-dark)', fontWeight: 500, whiteSpace: 'nowrap', padding: '2px 4px' }}
                onClick={() => setView('planner')}
              >
                Weekly planner →
              </button>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Quick captures for this week. Open the planner to schedule meetings and tasks by day.
            </div>
            <div className="todo-list">
              {sortedTodos.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 4px' }}>No to-dos yet.</div>
              )}
              {sortedTodos.map(t => (
                <div key={t.id} className={`todo-item${t.done ? ' done' : ''}`}>
                  <span className={`todo-check${t.done ? ' checked' : ''}`} onClick={() => toggleTodo(t.id)}>
                    {t.done && <CheckIcon />}
                  </span>
                  {editingTodoId === t.id ? (
                    <input
                      className="todo-edit-input"
                      autoFocus
                      value={editingTodoText}
                      onChange={e => setEditingTodoText(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEditTodo(); if (e.key === 'Escape') cancelEditTodo(); }}
                      onBlur={saveEditTodo}
                    />
                  ) : (
                    <span className="todo-text" onClick={() => startEditTodo(t.id, t.text)}>{t.text}</span>
                  )}
                  <button className="todo-del" onClick={() => deleteTodo(t.id)} title="Delete">&#215;</button>
                </div>
              ))}
            </div>
            <div className="todo-input-row">
              <input
                ref={todoRef}
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddTodo(); }}
                placeholder="Add a to-do..."
              />
              <button onClick={handleAddTodo}>Add</button>
            </div>
          </div>

        </div>

        {/* Right column: Upcoming Deadlines + Recent Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Upcoming deadlines */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 0, color: 'var(--text)' }}>Upcoming Deadlines</div>
            {upcomingTasks.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 14 }}>No upcoming deadlines.</div>
            ) : (
              <div>
                {upcomingTasks.map(t => {
                  const proj = projects.find(p => p.id === t.projectId);
                  const dl = t.status === 'overdue' ? 'overdue' : daysLeft(t.due!);
                  return (
                    <div
                      key={t.id}
                      onClick={() => navigateToTask(t.id, t.projectId)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background 0.12s' }}
                      onMouseOver={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--bg)'}
                      onMouseOut={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      {proj && <div style={{ width: 8, height: 8, borderRadius: '50%', background: proj.color, flexShrink: 0 }} />}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13.5, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</div>
                        {proj && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 2 }}>{proj.name}</div>}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: dl === 'overdue' ? 'var(--danger)' : 'var(--text-muted)', whiteSpace: 'nowrap' }}>{dl}</div>
                      <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" style={{ width: 13, height: 13, flexShrink: 0 }}>
                        <polyline points="9 18 15 12 9 6"/>
                      </svg>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent notes, as taped index cards */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--text)' }}>
              Recent Notes
              <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: 'var(--primary-dark)', fontWeight: 500, padding: '2px 4px' }} onClick={() => setNewNoteOpen(true)}>
                + New note
              </button>
            </div>
            {recentNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet. Jot one down here, or from a project&rsquo;s Notes tab.</div>
            ) : (
              <div className="dash-notes">
                {recentNotes.map(n => {
                  const proj = projects.find(p => p.id === n.projectId);
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      className={`dash-note${n.pinned ? ' pinned' : ''}`}
                      onClick={() => setEditingNote(n)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditingNote(n); } }}
                      title="Open note"
                    >
                      <span className="note-tape" aria-hidden />
                      <button
                        type="button"
                        className={`dash-note-pin${n.pinned ? ' on' : ''}`}
                        aria-pressed={!!n.pinned}
                        aria-label={n.pinned ? `Unpin "${n.title}"` : `Pin "${n.title}" to Recent Notes`}
                        title={n.pinned ? 'Unpin' : 'Pin to Recent Notes'}
                        onClick={e => { e.stopPropagation(); updateNote(n.id, { pinned: !n.pinned }); }}
                        onKeyDown={e => e.stopPropagation()}
                      >
                        <svg viewBox="0 0 24 24" fill={n.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M9 4h6l-1 6 4 3v2H6v-2l4-3-1-6z"/><line x1="12" y1="15" x2="12" y2="21"/></svg>
                      </button>
                      <span className="dash-note-title">{n.title || 'Untitled note'}</span>
                      {n.body && <span className="dash-note-body">{n.body}</span>}
                      <span className="dash-note-foot">
                        {proj
                          ? <span className="dash-note-proj"><span className="today-dot" style={{ background: proj.color, margin: 0 }} /><span className="dash-note-proj-name">{proj.name}</span></span>
                          : <span className="dash-note-proj dash-note-free">No project</span>}
                        <span style={{ flexShrink: 0 }}>{new Date(n.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </div>
      {editingNote && <NoteModal note={editingNote} onClose={() => setEditingNote(null)} />}
      {newNoteOpen && <NoteModal onClose={() => setNewNoteOpen(false)} />}
    </div>
  );
}
