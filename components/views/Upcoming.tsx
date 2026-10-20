'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtMins, fmt12hr, projectInArea, todayIso } from '@/lib/utils';
import { Task } from '@/lib/types';
import TaskModal from '../modals/TaskModal';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dayDiff(iso: string, today: string) {
  return Math.round((new Date(iso + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / 864e5);
}
function relLabel(n: number) {
  if (n < -1) return `${-n} days overdue`;
  if (n === -1) return 'Yesterday';
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  if (n < 7) return `In ${n} days`;
  if (n < 14) return 'Next week';
  return `In ${Math.round(n / 7)} weeks`;
}
function dayLabel(iso: string) {
  const d = new Date(iso + 'T00:00:00');
  return `${WEEKDAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}${d.getFullYear() !== new Date().getFullYear() ? `, ${d.getFullYear()}` : ''}`;
}

// Upcoming as one timeline rail: overdue above the Today marker, what's next below, grouped by day
export default function Upcoming() {
  const { tasks, projects, archivedTaskIds, archivedProjectIds, areaFilter, toggleTaskDone, setView } = useAppStore();
  const [editTask, setEditTask] = useState<Task | null>(null);
  const today = todayIso();

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done' && !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId) && projectInArea(projects.find(p => p.id === t.projectId), areaFilter))
    .sort((a, b) => a.due!.localeCompare(b.due!) || (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99'));

  if (!upcomingTasks.length) {
    return (
      <div className="empty-state">
        <h3>Nothing upcoming</h3>
        <p>You are all caught up</p>
      </div>
    );
  }

  const groups: { date: string; tasks: Task[] }[] = [];
  for (const t of upcomingTasks) {
    const g = groups[groups.length - 1];
    if (g && g.date === t.due) g.tasks.push(t);
    else groups.push({ date: t.due!, tasks: [t] });
  }
  const overdueCount = upcomingTasks.filter(t => t.due! < today || t.status === 'overdue').length;
  const todayIdx = groups.findIndex(g => g.date >= today);   // where the Today marker sits (-1 = after everything)
  const projectOf = (id: string) => projects.find(p => p.id === id);

  const todayMarker = (
    <div className="rail-today" key="today-marker"><span>Today · {dayLabel(today)}</span></div>
  );

  return (
    <div>
      <div className="section-title" style={{ marginBottom: 6 }}>
        <span>Upcoming</span>
        <span className="badge badge-gray">{upcomingTasks.length}</span>
      </div>
      <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
        {overdueCount > 0 && <span style={{ color: 'var(--danger-text)' }}>{overdueCount} overdue · </span>}
        {upcomingTasks.length - overdueCount} coming up · tick a task to complete it, click its title to edit
      </div>

      <div className="rail-up">
        {groups.map((g, gi) => {
          const n = dayDiff(g.date, today);
          return [
            gi === todayIdx ? todayMarker : null,
            <div key={g.date} className={`rail-day${n < 0 ? ' late' : ''}${n === 0 ? ' is-today' : ''}`}>
              <span className="rail-node" aria-hidden />
              <div className="rail-date">
                <div className="rail-date-main">{dayLabel(g.date)}</div>
                <div className="rail-date-rel">{relLabel(n)}</div>
              </div>
              <div className="rail-items">
                {g.tasks.map(t => {
                  const p = projectOf(t.projectId);
                  return (
                    <div key={t.id} className="rail-item" style={{ borderLeftColor: p?.color ?? 'var(--border-strong)' }}>
                      <button
                        type="button"
                        className="section-task-check"
                        title="Mark as done"
                        aria-label={`Mark "${t.title}" as done`}
                        onClick={() => toggleTaskDone(t.id)}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="rail-item-title" onClick={() => setEditTask(t)} title="Edit task">{t.title}</div>
                        <div className="rail-item-meta">
                          {p && (
                            <button type="button" className="rail-item-proj" onClick={() => setView('project', p.id)} title={`Open ${p.name}`}>
                              <span className="today-dot" style={{ background: p.color }} />{p.name}
                            </button>
                          )}
                          {t.dueTime && <span>· {fmt12hr(t.dueTime)}</span>}
                          {t.estimate ? <span>· {fmtMins(t.estimate)}</span> : null}
                          {t.priority === 'high' && <span style={{ color: 'var(--danger-text)' }}>· High priority</span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>,
          ];
        })}
        {todayIdx === -1 && todayMarker}
      </div>

      {editTask && <TaskModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
