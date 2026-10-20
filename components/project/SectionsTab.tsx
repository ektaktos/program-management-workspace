'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate, sortTasks } from '@/lib/utils';
import { STATUS_ORDER } from '@/lib/constants';
import { Phase, Task, TaskStatus } from '@/lib/types';
import ProgressBar from '../ui/ProgressBar';
import FilterChips from '../ui/FilterChips';
import TaskCard from './TaskCard';
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
  const { phases, tasks, deletePhase, toggleTaskDone, updateTask, archivedTaskIds } = useAppStore();
  const [showAddSection, setShowAddSection] = useState(false);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
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

  // ── Expanded: one section, full task list ──
  function renderExpanded(sec: SectionView) {
    const prog = progressOf(sec.tasks);
    const counts: Partial<Record<TaskStatus | 'all', number>> = { all: sec.tasks.length };
    STATUS_ORDER.forEach(s => { counts[s] = sec.tasks.filter(t => t.status === s).length; });
    const shown = filter === 'all' ? sec.tasks : sec.tasks.filter(t => t.status === filter);
    const range = dateRange(sec.phase);

    return (
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '20px 22px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 21, fontWeight: 400, color: 'var(--text)' }}>{sec.name}</div>
            {range && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{range}</div>}
            {!sec.phase && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Tasks not yet placed in a section. Edit a task to move it.</div>}
          </div>
          {sec.phase && (
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" title="Edit section" onClick={() => setEditing(sec.phase)}>{editIcon}</button>
              <button className="btn-icon" title="Delete section" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(sec.id)}>{deleteIcon}</button>
            </div>
          )}
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
            <span>{prog.done}/{prog.total} done</span>
            <span>{prog.pct}%</span>
          </div>
          <ProgressBar value={prog.pct} />
        </div>

        {sec.phase?.notes && <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 14 }}>{sec.phase.notes}</p>}

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          {sec.tasks.length > 0 && (
            <div className="filter-chips-wrap" style={{ marginBottom: 14 }}>
              <FilterChips active={filter} counts={counts} onChange={s => setFilter(prev => prev === s ? 'all' : s)} />
            </div>
          )}
          {shown.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 10 }}>
              {sec.tasks.length === 0 ? 'No tasks in this section yet.' : 'No tasks match this filter.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
              {shown.map(t => <TaskCard key={t.id} task={t} isHighlighted={highlightedTaskId === t.id} />)}
            </div>
          )}
          {addTaskButton(sec.phase?.id, 'Add task to section')}
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
        <span className={`ic-tab${sec.phase ? '' : ' muted'}`}>{range ?? (sec.phase ? 'No dates' : 'Not in a section')}</span>
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
        <div style={{ margin: '10px 0 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
            <span>{prog.done}/{prog.total} done</span>
            <span>{prog.pct}%</span>
          </div>
          <ProgressBar value={prog.pct} height={5} />
        </div>

        {/* Embedded task list */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 8, flex: 1 }}>
          {preview.length === 0 && (
            <div style={{ fontSize: 12.5, color: 'var(--text-faint)', fontStyle: 'italic', padding: '6px 2px' }}>No tasks yet.</div>
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
            <div style={{ fontSize: 12, color: 'var(--primary-dark)', padding: '6px 2px 0', fontWeight: 500 }}>+{hidden} more</div>
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
