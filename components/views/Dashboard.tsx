'use client';

import { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { calcProjectProgress, fmtDate } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';

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
  const { projects: allProjects, tasks: allTasks, notes, todos, addTodo, updateTodo, toggleTodo, deleteTodo, setView, navigateToTask, archivedProjectIds, archivedTaskIds } = useAppStore();
  const projects = allProjects.filter(p => !archivedProjectIds.includes(p.id));
  const tasks    = allTasks.filter(t => !archivedTaskIds.includes(t.id));
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

  const recentNotes = [...notes].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  const statCards = [
    { label: 'Projects',   value: projects.length, sub: `${activeProjects.length} active`,   onClick: () => setView('projects') },
    { label: 'Tasks',      value: totalTasks,        sub: `${doneTasks} completed`,           onClick: () => setView('tasks') },
    { label: 'Completion', value: completionPct,     pct: true, sub: 'across all projects',   onClick: undefined },
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
      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {statCards.map(c => (
          <div
            key={c.label}
            onClick={c.onClick}
            style={{
              background: 'var(--surface)',
              borderRadius: 'var(--radius-lg)',
              padding: '20px 22px',
              border: '1px solid var(--border)',
              cursor: c.onClick ? 'pointer' : 'default',
              transition: 'all 0.18s ease',
              position: 'relative',
              overflow: 'hidden',
            }}
            onMouseOver={e => { if (c.onClick) { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--primary)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'; } }}
            onMouseOut={e => { (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.transform = 'none'; }}
          >
            <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.7px' }}>
              {c.label}
            </div>
            <div className="stat-value" style={{
              fontSize: 44, fontWeight: 700,
              fontFamily: 'Georgia, "Times New Roman", serif',
              letterSpacing: '-0.025em', lineHeight: 1,
              color: c.danger ? 'var(--danger)' : 'var(--text)',
            }}>
              {c.value}{c.pct && <span style={{ fontSize: 24, color: 'var(--text-muted)', fontWeight: 600 }}>%</span>}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Bottom grid */}
      <div className="dashboard-bottom" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Left column: Active Projects + To-Do List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                To-Do List
                {todos.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {openCount} open &middot; {todos.length} total
                  </span>
                )}
              </div>
              <span
                style={{ fontSize: 12, color: 'var(--primary-dark)', cursor: 'pointer', fontWeight: 500 }}
                onClick={() => setView('planner')}
              >
                Open weekly planner →
              </span>
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

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

          {/* Recent notes */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 14, color: 'var(--text)' }}>Recent Notes</div>
            {recentNotes.length === 0 ? (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>No notes yet.</div>
            ) : (
              recentNotes.map(n => {
                const proj = projects.find(p => p.id === n.projectId);
                return (
                  <div key={n.id} style={{ padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{n.title}</div>
                    <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 3 }}>
                      {proj?.name} &middot; {new Date(n.createdAt).toLocaleDateString('en-US')}
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
