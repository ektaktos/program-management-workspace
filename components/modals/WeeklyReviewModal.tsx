'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { addDaysIso, fmtDate, fmtMins, uid } from '@/lib/utils';
import { PlannerWeekData } from '@/lib/types';

interface WeeklyReviewModalProps {
  weekKey: string;   // ISO date of the week's Monday
  weekLabel: string;
  onClose: () => void;
}

const EMPTY_WEEK: PlannerWeekData = { goals: [], notes: '', focus: '', focusItems: [] };

export default function WeeklyReviewModal({ weekKey, weekLabel, onClose }: WeeklyReviewModalProps) {
  const {
    tasks, projects, plannerEvents, plannerWeekly,
    archivedTaskIds, archivedProjectIds,
    updateTask, updatePlannerEvent, updatePlannerWeekly, addToast,
  } = useAppStore();
  const [nextGoal, setNextGoal] = useState('');

  const weekIsos = Array.from({ length: 7 }, (_, i) => addDaysIso(weekKey, i));
  const inWeek = (iso?: string) => !!iso && weekIsos.includes(iso);
  const startMs = new Date(weekKey + 'T00:00:00').getTime();
  const endMs   = new Date(addDaysIso(weekKey, 7) + 'T00:00:00').getTime();
  const nextWeekKey = addDaysIso(weekKey, 7);

  const weekData = plannerWeekly[weekKey] ?? EMPTY_WEEK;
  const nextWeekData = plannerWeekly[nextWeekKey] ?? EMPTY_WEEK;

  const projectOf = (id?: string) => (id ? projects.find(p => p.id === id) : undefined);
  const liveTasks = tasks.filter(t => !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId));

  // ── What got done ──
  const completedTasks = liveTasks.filter(t => t.status === 'done' && (t.completedAt ?? 0) >= startMs && (t.completedAt ?? 0) < endMs);
  const donePlanner = plannerEvents.filter(e => inWeek(e.date) && e.done);
  const goalsDone = weekData.goals.filter(g => g.done).length;
  const doneMins = completedTasks.reduce((n, t) => n + (t.estimate ?? 0), 0) + donePlanner.reduce((n, e) => n + (e.estimate ?? 0), 0);

  // ── What slipped ──
  const unfinishedPlanner = plannerEvents.filter(e => inWeek(e.date) && !e.done);
  const unfinishedPlanned = liveTasks.filter(t => inWeek(t.plannedDate) && t.status !== 'done');
  const missedDeadlines = liveTasks.filter(t => inWeek(t.due) && t.status !== 'done');
  const carryCount = unfinishedPlanner.length + unfinishedPlanned.length;

  function moveAllToNextWeek() {
    unfinishedPlanner.forEach(e => updatePlannerEvent(e.id, { date: addDaysIso(e.date, 7) }));
    unfinishedPlanned.forEach(t => updateTask(t.id, { plannedDate: addDaysIso(t.plannedDate!, 7) }));
    addToast({ title: 'Carried over', message: `${carryCount} unfinished item${carryCount !== 1 ? 's' : ''} moved to next week`, type: 'info' });
  }

  function addNextGoal() {
    if (!nextGoal.trim()) return;
    updatePlannerWeekly(nextWeekKey, { goals: [...nextWeekData.goals, { id: uid(), text: nextGoal.trim(), done: false }] });
    setNextGoal('');
  }

  const Row = ({ title, meta, color, onNext }: { title: string; meta?: string; color?: string; onNext?: () => void }) => (
    <div className="review-row">
      <span className="today-dot" style={{ background: color ?? 'var(--border-strong)' }} />
      <span className="review-row-title">{title}</span>
      {meta && <span className="review-row-meta">{meta}</span>}
      {onNext && <button className="todo-del" style={{ opacity: 1, fontSize: 11 }} title="Move to next week" onClick={onNext}>→ next wk</button>}
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel review-panel" onClick={e => e.stopPropagation()}>
        <div className="modal-title" style={{ marginBottom: 2 }}>Weekly review</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>{weekLabel}</div>

        {/* Stats */}
        <div className="review-stats">
          <div><b>{completedTasks.length + donePlanner.length}</b><span>completed</span></div>
          <div><b>{goalsDone}/{weekData.goals.length}</b><span>priorities met</span></div>
          <div><b>{fmtMins(doneMins) || '—'}</b><span>estimated work done</span></div>
          <div><b style={{ color: carryCount + missedDeadlines.length ? 'var(--danger)' : undefined }}>{carryCount + missedDeadlines.length}</b><span>slipped</span></div>
        </div>

        {/* Done */}
        <div className="review-section">
          <div className="review-head">Done this week</div>
          {completedTasks.length + donePlanner.length === 0 && <div className="review-empty">Nothing ticked off yet this week.</div>}
          {completedTasks.map(t => <Row key={t.id} title={t.title} meta={projectOf(t.projectId)?.name} color={projectOf(t.projectId)?.color} />)}
          {donePlanner.map(e => <Row key={e.id} title={e.title} meta={projectOf(e.projectId)?.name ?? e.category} color={projectOf(e.projectId)?.color} />)}
        </div>

        {/* Slipped */}
        <div className="review-section">
          <div className="review-head" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span>Unfinished</span>
            {carryCount > 0 && (
              <button className="btn btn-primary btn-sm" style={{ fontSize: 12 }} onClick={moveAllToNextWeek}>
                Move {carryCount} to next week
              </button>
            )}
          </div>
          {carryCount === 0 && <div className="review-empty">Everything you planned got done.</div>}
          {unfinishedPlanned.map(t => (
            <Row key={t.id} title={t.title} meta={`${projectOf(t.projectId)?.name ?? ''} · planned ${fmtDate(t.plannedDate!).replace(/ \d{4}$/, '')}`}
              color={projectOf(t.projectId)?.color}
              onNext={() => updateTask(t.id, { plannedDate: addDaysIso(t.plannedDate!, 7) })} />
          ))}
          {unfinishedPlanner.map(e => (
            <Row key={e.id} title={e.title} meta={`${projectOf(e.projectId)?.name ?? e.category} · ${fmtDate(e.date).replace(/ \d{4}$/, '')}`}
              color={projectOf(e.projectId)?.color}
              onNext={() => updatePlannerEvent(e.id, { date: addDaysIso(e.date, 7) })} />
          ))}
          {missedDeadlines.length > 0 && (
            <>
              <div className="review-subhead">Deadlines this week not yet done</div>
              {missedDeadlines.map(t => (
                <Row key={t.id} title={t.title} meta={`due ${fmtDate(t.due!).replace(/ \d{4}$/, '')}`} color={projectOf(t.projectId)?.color} />
              ))}
            </>
          )}
        </div>

        {/* Reflection */}
        <div className="review-section">
          <div className="review-head">Reflection</div>
          <textarea
            value={weekData.notes}
            onChange={e => updatePlannerWeekly(weekKey, { notes: e.target.value })}
            placeholder="What went well? What drained you? What will you change?"
            style={{ minHeight: 80 }}
          />
        </div>

        {/* Next week */}
        <div className="review-section">
          <div className="review-head">Priorities for next week</div>
          {nextWeekData.goals.map(g => <Row key={g.id} title={g.text} />)}
          <div className="todo-input-row" style={{ marginTop: 6 }}>
            <input value={nextGoal} onChange={e => setNextGoal(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') addNextGoal(); }} placeholder="Add a priority for next week…" />
            <button onClick={addNextGoal}>Add</button>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Done</button>
        </div>
      </div>
    </div>
  );
}
