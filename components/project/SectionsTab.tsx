'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, sortTasks } from '@/lib/utils';
import { STATUS_ORDER } from '@/lib/constants';
import { Phase, Task, TaskStatus } from '@/lib/types';
import ProgressBar from '../ui/ProgressBar';
import { InlineAssigneeBadge, InlineRecurringBadge } from './TaskCard';
import { DueEdit, ExtrasToggle, PrioritySelect, StatusSelect, useLedgerExtras } from '../ui/InlineQualifiers';
import FilterChips from '../ui/FilterChips';
import PhaseModal from '../modals/PhaseModal';
import TaskModal from '../modals/TaskModal';
import ConfirmModal from '../modals/ConfirmModal';

// Sections are stored as Phases. Tasks with no (or a deleted) section land in this virtual bucket.
const UNSORTED = '__unsorted__';
const PREVIEW_LIMIT = 5;

const PRIORITY_DOT: Record<string, string> = {
  high: 'var(--danger)', medium: 'var(--warning)', low: 'var(--success)',
};

interface SectionView {
  id: string;
  name: string;
  phase: Phase | null; // null for the Unsorted bucket
  tasks: Task[];
}

function progressOf(tasks: Task[]) {
  const done = tasks.filter(t => t.status === 'done').length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}

function dateRange(phase: Phase | null) {
  if (!phase || (!phase.start && !phase.end)) return null;
  return `${phase.start ? fmtDate(phase.start) : ''}${phase.start && phase.end ? ' — ' : ''}${phase.end ? fmtDate(phase.end) : ''}`;
}

interface SectionsTabProps {
  projectId: string;
  highlightedTaskId: string | null;
}

export default function SectionsTab({ projectId, highlightedTaskId }: SectionsTabProps) {
  const { phases, tasks, projects, deletePhase, deleteTask, toggleTaskDone, updateTask, archivedTaskIds } = useAppStore();
  const [showAddSection, setShowAddSection] = useState(false);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [extras, toggleExtras] = useLedgerExtras();
  const [addingTask, setAddingTask] = useState<{ phaseId?: string } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [openSubtasks, setOpenSubtasks] = useState<Set<string>>(new Set());
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  function toggleSubtaskList(taskId: string) {
    setOpenSubtasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      return next;
    });
  }

  function toggleSubtask(task: Task, subId: string) {
    updateTask(task.id, { subtasks: (task.subtasks ?? []).map(st => st.id === subId ? { ...st, done: !st.done } : st) });
  }

  const projectPhases = phases.filter(p => p.projectId === projectId);
  const phaseIds = new Set(projectPhases.map(p => p.id));
  const projectTasks = tasks.filter(t => t.projectId === projectId && !archivedTaskIds.includes(t.id));

  const sections: SectionView[] = projectPhases.map(p => ({
    id: p.id, name: p.name, phase: p,
    tasks: sortTasks(projectTasks.filter(t => t.phaseId === p.id)),
  }));
  const unsortedTasks = sortTasks(projectTasks.filter(t => !t.phaseId || !phaseIds.has(t.phaseId)));
  if (unsortedTasks.length > 0) {
    sections.push({ id: UNSORTED, name: 'Unsorted', phase: null, tasks: unsortedTasks });
  }

  const expanded = expandedId ? sections.find(s => s.id === expandedId) ?? null : null;

  // Jumping to a task from elsewhere (e.g. Upcoming Deadlines) opens the section that holds it
  useEffect(() => {
    if (!highlightedTaskId) return;
    const t = projectTasks.find(x => x.id === highlightedTaskId);
    if (!t) return;
    setFilter('all');
    setExpandedId(t.phaseId && phaseIds.has(t.phaseId) ? t.phaseId : UNSORTED);
    setTimeout(() => document.getElementById(`oc-task-${t.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightedTaskId]);

  function openSection(id: string) {
    setFilter('all');
    setExpandedId(id);
  }

  const addTaskButton = (phaseId: string | undefined, label: string) => (
    <button
      className="btn btn-ghost btn-sm"
      style={{ fontSize: 12, color: 'var(--primary-dark)' }}
      onClick={e => { e.stopPropagation(); setAddingTask({ phaseId }); }}
    >
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      {label}
    </button>
  );

  const editIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  );
  const deleteIcon = (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
    </svg>
  );

  // ── Expanded: the section pulled out of the file as one large open card, tasks in a ruled ledger ──
  function renderExpanded(sec: SectionView) {
    const prog = progressOf(sec.tasks);
    const counts: Partial<Record<TaskStatus | 'all', number>> = { all: sec.tasks.length };
    STATUS_ORDER.forEach(s => { counts[s] = sec.tasks.filter(t => t.status === s).length; });
    const shown = filter === 'all' ? sec.tasks : sec.tasks.filter(t => t.status === filter);
    const range = dateRange(sec.phase);
    const color = projects.find(p => p.id === projectId)?.color ?? 'var(--primary-dark)';
    const complete = prog.total > 0 && prog.done === prog.total;

    return (
      <div className={`oc-file${complete ? ' is-complete' : ''}`}>
        <span className="oc-layer" aria-hidden />
        <div className="oc-card">
          <div className="oc-head">
            <div style={{ minWidth: 0 }}>
              <div className="oc-name">{sec.name}</div>
              {range && <div className="oc-sub">{range}</div>}
              {!sec.phase && <div className="oc-sub">Tasks not yet placed in a section. Edit a task to move it.</div>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <span className="oc-sub" style={{ marginTop: 0 }}>{prog.done}/{prog.total} done · {prog.pct}%</span>
              {sec.phase && (
                <span style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" title="Edit section" onClick={() => setEditing(sec.phase)}>{editIcon}</button>
                  <button className="btn-icon" title="Delete section" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(sec.id)}>{deleteIcon}</button>
                </span>
              )}
            </div>
          </div>
          <div className="oc-bar"><i style={{ width: `${prog.pct}%`, background: color }} /></div>

          {sec.phase?.notes && <p className="oc-notes">{sec.phase.notes}</p>}

          {sec.tasks.length > 0 && (
            <div className="filter-chips-wrap" style={{ margin: '14px 0 0' }}>
              <FilterChips active={filter} counts={counts} onChange={s => setFilter(prev => prev === s ? 'all' : s)} />
            </div>
          )}

          <div className={`oc-ledger${extras ? ' extras' : ''}`} role="table" aria-label={`Tasks in ${sec.name}`}>
            <div className="oc-row oc-row-head" role="row">
              <span role="columnheader" aria-label="Done" />
              <span role="columnheader">Task</span>
              <span role="columnheader" className="oc-col-status">Status</span>
              <span role="columnheader">Due</span>
              <span role="columnheader" className="oc-col-pri">Priority</span>
              {extras && <span role="columnheader" className="oc-col-x">Assignee</span>}
              {extras && <span role="columnheader" className="oc-col-x">Repeat</span>}
              <span role="columnheader" className="oc-corner"><ExtrasToggle open={extras} onToggle={toggleExtras} /></span>
            </div>
            {shown.length === 0 && (
              <div className="oc-row oc-row-empty">
                <span />
                <span>{sec.tasks.length === 0 ? 'No tasks in this section yet.' : 'No tasks match this filter.'}</span>
              </div>
            )}
            {shown.map(t => {
              const done = t.status === 'done';
              const subs = t.subtasks ?? [];
              const subsDone = subs.filter(st => st.done).length;
              const subsOpen = openSubtasks.has(t.id);
              return (
                <div key={t.id} role="rowgroup">
                  <div
                    id={`oc-task-${t.id}`}
                    role="row"
                    className={`oc-row${done ? ' done' : ''}${highlightedTaskId === t.id ? ' task-highlight' : ''}`}
                    title="Edit task"
                    onClick={() => setEditingTask(t)}
                  >
                    <span role="cell">
                      <button
                        type="button"
                        className={`section-task-check${done ? ' checked' : ''}`}
                        title={done ? 'Mark as not done' : 'Mark as done'}
                        aria-label={done ? `Mark "${t.title}" as not done` : `Mark "${t.title}" as done`}
                        onClick={e => { e.stopPropagation(); toggleTaskDone(t.id); }}
                      >
                        {done && (
                          <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                            <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                    </span>
                    <span role="cell" className="oc-title">
                      <span className="oc-title-line">
                      <span className="oc-title-text">{t.title}</span>
                      {subs.length > 0 && (
                        <button
                          type="button"
                          className={`section-subtask-chip${subsOpen ? ' open' : ''}`}
                          title={subsOpen ? 'Hide subtasks' : 'Show subtasks'}
                          onClick={e => { e.stopPropagation(); toggleSubtaskList(t.id); }}
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 9, height: 9, transform: subsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                            <polyline points="9 18 15 12 9 6"/>
                          </svg>
                          {subsDone}/{subs.length}
                        </button>
                      )}
                      <StatusSelect task={t} className="oc-status-inline" />
                      </span>
                    </span>
                    <span role="cell" className="oc-col-status"><StatusSelect task={t} /></span>
                    <span role="cell" className="oc-due"><DueEdit task={t} /></span>
                    <span role="cell" className="oc-col-pri"><PrioritySelect task={t} /></span>
                    {extras && (
                      <span role="cell" className="oc-col-x" onClick={e => e.stopPropagation()}>
                        {t.assignee ? <InlineAssigneeBadge assignee={t.assignee} onSave={val => updateTask(t.id, { assignee: val })} /> : <span className="x-empty">—</span>}
                      </span>
                    )}
                    {extras && (
                      <span role="cell" className="oc-col-x" onClick={e => e.stopPropagation()}>
                        {t.recurring ? <InlineRecurringBadge recurring={t.recurring} onSave={val => updateTask(t.id, { recurring: val })} /> : <span className="x-empty">—</span>}
                      </span>
                    )}
                    <span role="cell">
                      <button type="button" className="row-delete" title="Delete task" aria-label={`Delete "${t.title}"`}
                        onClick={e => { e.stopPropagation(); setDeletingTask(t); }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                      </button>
                    </span>
                  </div>
                  {subsOpen && subs.length > 0 && (
                    <div className="oc-subs">
                      {subs.map(st => (
                        <div key={st.id} className="oc-sub-row">
                          <button
                            type="button"
                            className={`section-task-check small${st.done ? ' checked' : ''}`}
                            title={st.done ? 'Mark subtask as not done' : 'Mark subtask as done'}
                            onClick={() => toggleSubtask(t, st.id)}
                          >
                            {st.done && (
                              <svg viewBox="0 0 12 12" fill="none" style={{ width: 7, height: 7 }}>
                                <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            )}
                          </button>
                          <span className="section-task-title" style={{ fontSize: 12.5, ...(st.done ? { textDecoration: 'line-through', opacity: 0.55 } : {}) }}>{st.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <button type="button" className="oc-row oc-row-add" onClick={() => setAddingTask({ phaseId: sec.phase?.id })}>
              <span aria-hidden>+</span>
              <span>Add a task to {sec.name}…</span>
            </button>
          </div>
          {complete && <span className="ic-stamp oc-stamp" aria-label="Section complete">Complete</span>}
        </div>
      </div>
    );
  }

  // ── Collapsed: section card with its task list embedded ──
  function renderCard(sec: SectionView) {
    const prog = progressOf(sec.tasks);
    const range = dateRange(sec.phase);
    const preview = sec.tasks.slice(0, PREVIEW_LIMIT);
    const hidden = sec.tasks.length - preview.length;

    // Index card: folder tab with the dates, a stack behind it when more tasks are filed than shown,
    // and a COMPLETE stamp once every task in the section is done
    const complete = prog.total > 0 && prog.done === prog.total;
    const layers = hidden > 5 ? 2 : hidden > 0 ? 1 : 0;

    return (
      <div key={sec.id} className={`ic-file${complete ? ' is-complete' : ''}`} onClick={() => openSection(sec.id)}>
        {layers >= 2 && <span className="ic-layer ic-layer-2" aria-hidden />}
        {layers >= 1 && <span className="ic-layer ic-layer-1" aria-hidden />}
      <div className={`section-card ic-paper${sec.phase ? '' : ' ic-unsorted'}`}>
        {sec.phase && (
          <div className="section-card-actions" style={{ position: 'absolute', top: 10, right: 10, display: 'flex', gap: 4 }}>
            <button className="btn-icon" title="Edit section" onClick={e => { e.stopPropagation(); setEditing(sec.phase); }}>{editIcon}</button>
            <button className="btn-icon" title="Delete section" style={{ color: 'var(--danger)' }} onClick={e => { e.stopPropagation(); setConfirming(sec.id); }}>{deleteIcon}</button>
          </div>
        )}

        <div className="ic-title" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 56 }}>
          <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, fontWeight: 400, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {sec.name}
          </div>
          <span className="badge badge-gray" style={{ flexShrink: 0 }}>{sec.tasks.length}</span>
        </div>
        {range && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6 }}>{range}</div>}

        <div style={{ margin: '10px 0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{prog.done}/{prog.total} done</span>
            <span>{prog.pct}%</span>
          </div>
          <ProgressBar value={prog.pct} height={5} />
        </div>

        {/* Embedded task list — ruled like an index card, one row per line */}
        <div className="ic-lines">
          {preview.length === 0 && (
            <div className="ic-line-text" style={{ fontSize: 12.5, color: 'var(--text-faint)', fontStyle: 'italic' }}>No tasks yet.</div>
          )}
          {preview.map(t => {
            const done = t.status === 'done';
            const subs = t.subtasks ?? [];
            const subsDone = subs.filter(st => st.done).length;
            const subsOpen = openSubtasks.has(t.id);
            return (
              <div key={t.id}>
              <div
                className="section-task-row clickable"
                title="Edit task"
                onClick={e => { e.stopPropagation(); setEditingTask(t); }}
              >
                <button
                  type="button"
                  className={`section-task-check${done ? ' checked' : ''}`}
                  title={done ? 'Mark as not done' : 'Mark as done'}
                  onClick={e => { e.stopPropagation(); toggleTaskDone(t.id); }}
                >
                  {done && (
                    <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[t.priority], flexShrink: 0 }} />
                <span className="section-task-title" style={done ? { textDecoration: 'line-through', opacity: 0.55 } : undefined}>{t.title}</span>
                {subs.length > 0 && (
                  <button
                    type="button"
                    className={`section-subtask-chip${subsOpen ? ' open' : ''}`}
                    title={subsOpen ? 'Hide subtasks' : 'Show subtasks'}
                    onClick={e => { e.stopPropagation(); toggleSubtaskList(t.id); }}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{ width: 9, height: 9, transform: subsOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s' }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                    {subsDone}/{subs.length}
                  </button>
                )}
                {t.due && !done && (
                  <span style={{ fontSize: 10.5, flexShrink: 0, color: t.status === 'overdue' ? 'var(--danger)' : 'var(--text-faint)' }}>
                    {fmtDate(t.due).replace(/ \d{4}$/, '')}
                  </span>
                )}
              </div>
              {subsOpen && subs.length > 0 && (
                <div className="section-subtask-list" onClick={e => e.stopPropagation()}>
                  {subs.map(st => (
                    <div key={st.id} className="section-subtask-row">
                      <button
                        type="button"
                        className={`section-task-check small${st.done ? ' checked' : ''}`}
                        title={st.done ? 'Mark subtask as not done' : 'Mark subtask as done'}
                        onClick={e => { e.stopPropagation(); toggleSubtask(t, st.id); }}
                      >
                        {st.done && (
                          <svg viewBox="0 0 12 12" fill="none" style={{ width: 7, height: 7 }}>
                            <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        )}
                      </button>
                      <span className="section-task-title" style={{ fontSize: 12, ...(st.done ? { textDecoration: 'line-through', opacity: 0.55 } : {}) }}>{st.title}</span>
                    </div>
                  ))}
                </div>
              )}
              </div>
            );
          })}
          {hidden > 0 && (
            <div className="ic-line-text" style={{ fontSize: 12, color: 'var(--primary-dark)', fontWeight: 500 }}>+{hidden} more</div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
          {addTaskButton(sec.phase?.id, 'Add task')}
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            Open
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 12, height: 12 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </span>
        </div>
      </div>
        {complete && <span className="ic-stamp" aria-label="Section complete">Complete</span>}
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8 }}>
        <div>
          {expanded && (
            <button className="btn btn-outline btn-sm" onClick={() => setExpandedId(null)}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
              </svg>
              All sections
            </button>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!expanded && (
            <button className="btn btn-outline btn-sm" onClick={() => setAddingTask({})}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add Task
            </button>
          )}
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddSection(true)}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add Section
          </button>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="empty-state">
          <h3>No sections yet</h3>
          <p>Group this project&rsquo;s work into sections — each one holds its own task list.</p>
        </div>
      ) : expanded ? (
        renderExpanded(expanded)
      ) : (
        <div className="ic-grid">
          {sections.map(renderCard)}
        </div>
      )}

      {showAddSection && <PhaseModal defaultProjectId={projectId} onClose={() => setShowAddSection(false)} />}
      {editing && <PhaseModal phase={editing} onClose={() => setEditing(null)} />}
      {editingTask && <TaskModal task={editingTask} onClose={() => setEditingTask(null)} />}
      {addingTask && (
        <TaskModal
          defaultProjectId={projectId}
          defaultPhaseId={addingTask.phaseId}
          onClose={() => setAddingTask(null)}
        />
      )}
      {deletingTask && (
        <ConfirmModal
          message={`Delete "${deletingTask.title}"? This can't be undone.`}
          onConfirm={() => { deleteTask(deletingTask.id); setDeletingTask(null); }}
          onCancel={() => setDeletingTask(null)}
        />
      )}
      {confirming && (
        <ConfirmModal
          message="Delete this section? Its tasks are kept and move to Unsorted."
          onConfirm={() => {
            deletePhase(confirming);
            if (expandedId === confirming) setExpandedId(null);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
