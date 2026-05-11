'use client';

import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlannerEvent, PlannerAppointment } from '@/lib/types';
import { uid } from '@/lib/utils';

// ── Week helpers ──────────────────────────────────────────────────────────────

function getWeekStart(offset: number): Date {
  const d = new Date(); d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  d.setDate(d.getDate() + monOffset + offset * 7);
  return d;
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmt12(time: string): string {
  const [h, m] = time.split(':').map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
}

const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CATEGORIES = ['personal', 'work', 'health', 'social', 'learning', 'errand', 'rest'];

// ── Sub-components ─────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" fill="none" style={{ width: 9, height: 9 }}>
      <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Event Modal ───────────────────────────────────────────────────────────────

interface EventModalProps {
  presetDate?: string;
  event?: PlannerEvent;
  onClose: () => void;
}

function EventModal({ presetDate, event, onClose }: EventModalProps) {
  const { addPlannerEvent, updatePlannerEvent, deletePlannerEvent } = useAppStore();
  const [title, setTitle] = useState(event?.title ?? '');
  const [date, setDate] = useState(event?.date ?? presetDate ?? '');
  const [category, setCategory] = useState(event?.category ?? 'personal');
  const [notes, setNotes] = useState(event?.notes ?? '');

  function handleSave() {
    if (!title.trim() || !date) return;
    if (event) {
      updatePlannerEvent(event.id, { title: title.trim(), date, category, notes });
    } else {
      addPlannerEvent({ title: title.trim(), date, category, notes, done: false });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-title">{event ? 'Edit Task' : 'New Task'}</div>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What's happening?" autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Category</label>
            <select value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Anything to remember..." />
        </div>
        <div className="modal-footer">
          {event && (
            <button className="btn btn-danger btn-sm" onClick={() => { deletePlannerEvent(event.id); onClose(); }} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!title.trim() || !date}>
            Save Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Appointment Modal ─────────────────────────────────────────────────────────

interface ApptModalProps {
  presetDate?: string;
  appt?: PlannerAppointment;
  onClose: () => void;
}

function ApptModal({ presetDate, appt, onClose }: ApptModalProps) {
  const { addPlannerAppointment, updatePlannerAppointment, deletePlannerAppointment } = useAppStore();
  const [title, setTitle] = useState(appt?.title ?? '');
  const [date, setDate] = useState(appt?.date ?? presetDate ?? '');
  const [time, setTime] = useState(appt?.time ?? '09:00');
  const [notes, setNotes] = useState(appt?.notes ?? '');

  function handleSave() {
    if (!title.trim() || !date || !time) return;
    if (appt) {
      updatePlannerAppointment(appt.id, { title: title.trim(), date, time, notes });
    } else {
      addPlannerAppointment({ title: title.trim(), date, time, notes, done: false });
    }
    onClose();
  }

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-panel">
        <div className="modal-title">{appt ? 'Edit Meeting' : 'New Meeting'}</div>
        <div className="form-group">
          <label>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title..." autoFocus />
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div className="form-group">
            <label>Time</label>
            <input type="time" value={time} onChange={e => setTime(e.target.value)} />
          </div>
        </div>
        <div className="form-group">
          <label>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional notes..." />
        </div>
        <div className="modal-footer">
          {appt && (
            <button className="btn btn-danger btn-sm" onClick={() => { deletePlannerAppointment(appt.id); onClose(); }} style={{ marginRight: 'auto' }}>
              Delete
            </button>
          )}
          <button className="btn btn-outline btn-sm" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={!title.trim() || !date || !time}>
            {appt ? 'Save' : 'Add Meeting'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function WeeklyPlanner() {
  const {
    todos, addTodo, toggleTodo, deleteTodo,
    plannerEvents, updatePlannerEvent,
    plannerAppointments,
    plannerWeekly, updatePlannerWeekly,
    plannerWeekOffset, setPlannerWeekOffset,
    plannerModalTrigger, setPlannerModalTrigger,
  } = useAppStore();

  const [layout, setLayout] = useState<'grid' | 'agenda'>('grid');

  // Modal state
  const [newEventModal, setNewEventModal] = useState<{ open: boolean; presetDate?: string }>({ open: false });
  const [editEventModal, setEditEventModal] = useState<{ open: boolean; event?: PlannerEvent }>({ open: false });
  const [newApptModal, setNewApptModal] = useState<{ open: boolean; presetDate?: string }>({ open: false });
  const [editApptModal, setEditApptModal] = useState<{ open: boolean; appt?: PlannerAppointment }>({ open: false });

  // Watch store trigger from Topbar buttons
  useEffect(() => {
    if (plannerModalTrigger === 'task') {
      setNewEventModal({ open: true });
      setPlannerModalTrigger(null);
    } else if (plannerModalTrigger === 'appt') {
      setNewApptModal({ open: true });
      setPlannerModalTrigger(null);
    }
  }, [plannerModalTrigger]);

  // Todo input
  const [todoInput, setTodoInput] = useState('');
  const todoRef = useRef<HTMLInputElement>(null);

  // Goal input
  const [goalInput, setGoalInput] = useState('');
  const [goalInputVisible, setGoalInputVisible] = useState(false);

  // Focus items input
  const [focusInput, setFocusInput] = useState('');

  // Week data
  const weekStart = getWeekStart(plannerWeekOffset);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });
  const weekKey = isoOf(weekStart);
  const weekData = plannerWeekly[weekKey] ?? { goals: [], notes: '', focus: '' };

  const todayIso = isoOf(new Date());

  const weekEndDate = days[6];
  const weekLabel = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} – ${weekStart.getMonth() !== weekEndDate.getMonth() ? MONTH_NAMES[weekEndDate.getMonth()] + ' ' : ''}${weekEndDate.getDate()}, ${weekEndDate.getFullYear()}`;

  function handleAddTodo() {
    if (!todoInput.trim()) return;
    addTodo(todoInput.trim());
    setTodoInput('');
  }

  function handleAddGoal() {
    if (!goalInput.trim()) return;
    const newGoal = { id: uid(), text: goalInput.trim(), done: false };
    updatePlannerWeekly(weekKey, { goals: [...weekData.goals, newGoal] });
    setGoalInput('');
    setGoalInputVisible(false);
  }

  function deleteGoal(id: string) {
    updatePlannerWeekly(weekKey, { goals: weekData.goals.filter(g => g.id !== id) });
  }

  function handleAddFocusItem() {
    if (!focusInput.trim()) return;
    const existing = weekData.focusItems ?? [];
    updatePlannerWeekly(weekKey, {
      focusItems: [...existing, { id: uid(), text: focusInput.trim() }],
    });
    setFocusInput('');
  }

  function toggleGoal(id: string) {
    updatePlannerWeekly(weekKey, {
      goals: weekData.goals.map(g => g.id === id ? { ...g, done: !g.done } : g),
    });
  }

  const sortedTodos = [...todos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return b.createdAt - a.createdAt;
  });

  const openTodos = todos.filter(t => !t.done).length;

  return (
    <div>
      {/* Toolbar — 3-column grid: empty | centered nav | seg control */}
      <div className="planner-toolbar" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center' }}>
        {/* Left: empty spacer */}
        <div />

        {/* Center: week navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifySelf: 'center' }}>
          <button className="pweek-btn" onClick={() => setPlannerWeekOffset(plannerWeekOffset - 1)} title="Previous week">&#8249;</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 15, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>
              {plannerWeekOffset === 0 ? 'This week' : plannerWeekOffset === 1 ? 'Next week' : plannerWeekOffset === -1 ? 'Last week' : weekLabel}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>{weekLabel}</div>
          </div>
          <button className="pweek-btn" onClick={() => setPlannerWeekOffset(plannerWeekOffset + 1)} title="Next week">&#8250;</button>
          {plannerWeekOffset !== 0 && (
            <button className="btn btn-ghost btn-sm" onClick={() => setPlannerWeekOffset(0)} style={{ fontSize: 12 }}>Today</button>
          )}
        </div>

        {/* Right: segmented view control */}
        <div style={{ display: 'flex', alignItems: 'center', justifySelf: 'end' }}>
          <div className="seg">
            <button className={`seg-btn${layout === 'grid' ? ' active' : ''}`} onClick={() => setLayout('grid')}>Week grid</button>
            <button className={`seg-btn${layout === 'agenda' ? ' active' : ''}`} onClick={() => setLayout('agenda')}>Agenda</button>
          </div>
        </div>
      </div>

      {/* Shell */}
      <div className="planner-shell">
        {/* Sidebar */}
        <div className="planner-side">

          {/* To-Do List */}
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                To-Do List
                {todos.length > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-muted)', marginLeft: 8 }}>
                    {openTodos} open &middot; {todos.length} total
                  </span>
                )}
              </div>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>Quick captures — check off as you go.</div>
            <div className="todo-list">
              {sortedTodos.length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '8px 4px' }}>No to-dos yet.</div>
              )}
              {sortedTodos.map(t => (
                <div key={t.id} className={`todo-item${t.done ? ' done' : ''}`}>
                  <span className={`todo-check${t.done ? ' checked' : ''}`} onClick={() => toggleTodo(t.id)}>
                    {t.done && <CheckIcon />}
                  </span>
                  <span className="todo-text" onClick={() => toggleTodo(t.id)}>{t.text}</span>
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

          {/* Due this week */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Due this week</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Where will most of your energy go this week?</div>
            <div className="todo-list">
              {(weekData.focusItems ?? []).length === 0 && (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 4px 8px' }}>Nothing added yet.</div>
              )}
              {(weekData.focusItems ?? []).map(item => (
                <div key={item.id} className="todo-item">
                  <span className="todo-text" style={{ cursor: 'default' }}>{item.text}</span>
                  <button
                    className="todo-del"
                    title="Remove"
                    onClick={() => updatePlannerWeekly(weekKey, {
                      focusItems: (weekData.focusItems ?? []).filter(f => f.id !== item.id),
                    })}
                  >&#215;</button>
                </div>
              ))}
            </div>
            <div className="todo-input-row">
              <input
                value={focusInput}
                onChange={e => setFocusInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleAddFocusItem(); }}
                placeholder="e.g. brand launch, deep work…"
              />
              <button onClick={handleAddFocusItem}>Add</button>
            </div>
          </div>

          {/* Reflection */}
          <div className="card">
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Reflection</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>Notes, wins, or lessons from this week.</div>
            <textarea
              value={weekData.notes}
              onChange={e => updatePlannerWeekly(weekKey, { notes: e.target.value })}
              placeholder="How did the week go?..."
              style={{ minHeight: 100 }}
            />
          </div>
        </div>

        {/* Main */}
        <div className="planner-main">

          {/* Priorities card */}
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 12, display: 'flex', alignItems: 'baseline', gap: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Priorities</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>Top tasks for this week</span>
            </div>
            {weekData.goals.length === 0 && !goalInputVisible && (
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', padding: '12px 6px', textAlign: 'center', fontStyle: 'italic' }}>
                Set 1–3 intentions for the week.
              </div>
            )}
            {weekData.goals.map(g => (
              <div key={g.id} className={`pgoal${g.done ? ' done' : ''}`}>
                <span className={`pgoal-check${g.done ? ' checked' : ''}`} onClick={() => toggleGoal(g.id)}>
                  {g.done && <CheckIcon />}
                </span>
                <span className="pgoal-text">{g.text}</span>
                <button className="pgoal-del" onClick={() => deleteGoal(g.id)} title="Remove">×</button>
              </div>
            ))}
            {goalInputVisible && (
              <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                <input
                  autoFocus
                  value={goalInput}
                  onChange={e => setGoalInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') { handleAddGoal(); }
                    if (e.key === 'Escape') { setGoalInputVisible(false); setGoalInput(''); }
                  }}
                  placeholder="e.g. finish brand deck, ship v2…"
                  style={{ flex: 1 }}
                />
                <button className="btn btn-primary btn-sm" onClick={handleAddGoal}>Add</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setGoalInputVisible(false); setGoalInput(''); }}>✕</button>
              </div>
            )}
            {!goalInputVisible && (
              <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={() => setGoalInputVisible(true)}>
                + Add priority
              </button>
            )}
          </div>

          {/* Week grid */}
          {layout === 'grid' && (
            <div className="card planner-week-grid-wrap" style={{ padding: 16 }}>
              <div className="planner-week-grid">
                {days.map((day, i) => {
                  const iso = isoOf(day);
                  const isToday = iso === todayIso;
                  const isWeekend = i >= 5;
                  const dayAppts = plannerAppointments
                    .filter(a => a.date === iso)
                    .sort((a, b) => a.time.localeCompare(b.time));
                  const dayEvents = plannerEvents
                    .filter(e => e.date === iso)
                    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));

                  return (
                    <div key={iso} className={`pday${isToday ? ' today' : ''}${isWeekend ? ' weekend' : ''}`}>
                      <div className="pday-head">
                        <span className="pday-name">{DAY_NAMES[i]}</span>
                        <span className="pday-num">{day.getDate()}</span>
                      </div>

                      {/* Appointments */}
                      <div className="pday-appts">
                        <div className="pday-appts-label">
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ width: 10, height: 10 }}><rect x="1" y="2" width="14" height="13" rx="2"/><line x1="1" y1="6" x2="15" y2="6"/><line x1="5" y1="1" x2="5" y2="4"/><line x1="11" y1="1" x2="11" y2="4"/></svg>
                          Meetings
                        </div>
                        {dayAppts.length === 0 && (
                          <div className="pday-empty">No meetings</div>
                        )}
                        {dayAppts.map(a => (
                          <div key={a.id} className="pappt" onClick={() => setEditApptModal({ open: true, appt: a })}>
                            <span className="pappt-time">{fmt12(a.time)}</span>
                            <span className="pappt-title">{a.title}</span>
                          </div>
                        ))}
                        <div className="pday-add-appt" onClick={() => setNewApptModal({ open: true, presetDate: iso })}>
                          + meeting
                        </div>
                      </div>

                      {/* Tasks */}
                      <div className="pday-events">
                        {dayEvents.length === 0 && (
                          <div className="pday-empty">No tasks</div>
                        )}
                        {dayEvents.map(ev => (
                          <div
                            key={ev.id}
                            className={`pevent cat-${ev.category}${ev.done ? ' done' : ''}`}
                            onClick={() => setEditEventModal({ open: true, event: ev })}
                          >
                            <span
                              className={`pevent-check${ev.done ? ' checked' : ''}`}
                              onClick={e => { e.stopPropagation(); updatePlannerEvent(ev.id, { done: !ev.done }); }}
                            >
                              {ev.done && (
                                <svg viewBox="0 0 12 12" fill="none" style={{ width: 8, height: 8 }}>
                                  <polyline points="2,6 5,9 10,3" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <div className="pevent-title">{ev.title}</div>
                          </div>
                        ))}
                      </div>

                      <div className="pday-add" onClick={() => setNewEventModal({ open: true, presetDate: iso })}>
                        + Add task
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Agenda */}
          {layout === 'agenda' && (
            <div className="card">
              {days.map((day, i) => {
                const iso = isoOf(day);
                const isToday = iso === todayIso;
                const dayAppts = plannerAppointments
                  .filter(a => a.date === iso)
                  .sort((a, b) => a.time.localeCompare(b.time));
                const dayEvents = plannerEvents
                  .filter(e => e.date === iso)
                  .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''));
                const allItems = [
                  ...dayAppts.map(a => ({ type: 'appt' as const, item: a, sortKey: a.time })),
                  ...dayEvents.map(e => ({ type: 'event' as const, item: e, sortKey: e.time ?? '23:59' })),
                ].sort((a, b) => a.sortKey.localeCompare(b.sortKey));

                return (
                  <div key={iso} className={`pagenda-day${isToday ? ' today' : ''}`}>
                    <div className="pagenda-day-head">
                      <span>
                        {DAY_NAMES[i]}, {MONTH_NAMES[day.getMonth()]} {day.getDate()}
                        {isToday && <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 600, background: '#f4e8d2', color: '#5f441c', padding: '2px 8px', borderRadius: 999 }}>Today</span>}
                      </span>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setNewEventModal({ open: true, presetDate: iso })}>+ Task</button>
                        <button className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setNewApptModal({ open: true, presetDate: iso })}>+ Meeting</button>
                      </div>
                    </div>
                    {allItems.length === 0 && (
                      <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', padding: '4px 0' }}>Nothing scheduled</div>
                    )}
                    {allItems.map(({ type, item }) => {
                      if (type === 'appt') {
                        const a = item as PlannerAppointment;
                        return (
                          <div key={a.id} className="pagenda-event cat-social" onClick={() => setEditApptModal({ open: true, appt: a })}>
                            <div className="pagenda-time">{fmt12(a.time)}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title">{a.title}</div>
                              {a.notes && <div className="pagenda-meta">{a.notes}</div>}
                            </div>
                            <span className="pagenda-cat">Meeting</span>
                          </div>
                        );
                      } else {
                        const e = item as PlannerEvent;
                        return (
                          <div
                            key={e.id}
                            className={`pagenda-event cat-${e.category}`}
                            onClick={() => setEditEventModal({ open: true, event: e })}
                          >
                            <div className="pagenda-time">{e.time ? fmt12(e.time) : '—'}</div>
                            <div className="pagenda-body">
                              <div className="pagenda-title" style={e.done ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>{e.title}</div>
                              {e.notes && <div className="pagenda-meta">{e.notes}</div>}
                            </div>
                            <span className="pagenda-cat">{e.category}</span>
                          </div>
                        );
                      }
                    })}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {newEventModal.open && (
        <EventModal presetDate={newEventModal.presetDate} onClose={() => setNewEventModal({ open: false })} />
      )}
      {editEventModal.open && editEventModal.event && (
        <EventModal event={editEventModal.event} onClose={() => setEditEventModal({ open: false })} />
      )}
      {newApptModal.open && (
        <ApptModal presetDate={newApptModal.presetDate} onClose={() => setNewApptModal({ open: false })} />
      )}
      {editApptModal.open && editApptModal.appt && (
        <ApptModal appt={editApptModal.appt} onClose={() => setEditApptModal({ open: false })} />
      )}
    </div>
  );
}
