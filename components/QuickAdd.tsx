'use client';

import { useEffect, useRef, useState, useId } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtMins, todayIso } from '@/lib/utils';
import { ESTIMATE_OPTIONS } from '@/lib/constants';

const LAST_DEST_KEY = 'pm_oyint_quickadd_dest';

// Destination values: 'todo' | 'planner' | 'p:<projectId>' | 'p:<projectId>:<sectionId>'
export default function QuickAdd() {
  const fid = useId(); // links each label to its field
  const {
    quickAddOpen, setQuickAddOpen,
    projects, phases, archivedProjectIds, currentView, activeProjectId,
    addTodo, addPlannerEvent, addTask, addToast,
  } = useAppStore();

  const [title, setTitle] = useState('');
  const [dest, setDest] = useState('todo');
  const [due, setDue] = useState('');
  const [estimate, setEstimate] = useState('');
  const [planToday, setPlanToday] = useState(false);
  const [keepOpen, setKeepOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // ⌘K / Ctrl+K toggles quick add from anywhere
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setQuickAddOpen(!useAppStore.getState().quickAddOpen);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setQuickAddOpen]);

  // On open: default to the project being viewed, otherwise the last destination used
  useEffect(() => {
    if (!quickAddOpen) return;
    let initial = 'todo';
    try { initial = localStorage.getItem(LAST_DEST_KEY) ?? 'todo'; } catch {}
    if (currentView === 'project' && activeProjectId) initial = `p:${activeProjectId}`;
    if (initial.startsWith('p:')) {
      const [, pid, sid] = initial.split(':');
      const projectOk = projects.some(p => p.id === pid) && !archivedProjectIds.includes(pid);
      const sectionOk = !sid || phases.some(ph => ph.id === sid && ph.projectId === pid);
      if (!projectOk) initial = 'todo';
      else if (!sectionOk) initial = `p:${pid}`;
    }
    setDest(initial);
    setTitle(''); setDue(''); setEstimate(''); setPlanToday(false);
    setTimeout(() => inputRef.current?.focus(), 0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quickAddOpen]);

  if (!quickAddOpen) return null;

  const liveProjects = projects.filter(p => !archivedProjectIds.includes(p.id));
  const isProjectDest = dest.startsWith('p:');
  const showEstimate = dest !== 'todo';

  function close() { setQuickAddOpen(false); }

  function save() {
    const text = title.trim();
    if (!text) return;
    const est = estimate ? Number(estimate) : undefined;

    if (dest === 'todo') {
      addTodo(text);
    } else if (dest === 'planner') {
      addPlannerEvent({ title: text, date: due || todayIso(), category: 'personal', notes: '', done: false, estimate: est });
    } else {
      const [, projectId, sectionId] = dest.split(':');
      addTask({
        title: text, description: '', projectId, phaseId: sectionId || undefined,
        status: 'todo', priority: 'medium', due: due || undefined,
        alerts: [], subtasks: [], estimate: est,
        plannedDate: planToday ? todayIso() : undefined,
      });
    }
    try { localStorage.setItem(LAST_DEST_KEY, dest); } catch {}

    const where = dest === 'todo' ? 'To-do list' : dest === 'planner' ? 'Weekly planner' : liveProjects.find(p => p.id === dest.split(':')[1])?.name ?? 'project';
    addToast({ title: 'Added', message: `"${text}" → ${where}`, type: 'info' });

    if (keepOpen) {
      setTitle(''); setDue(''); setEstimate(''); setPlanToday(false);
      inputRef.current?.focus();
    } else {
      close();
    }
  }

  return (
    <div className="modal-overlay quickadd-overlay" onClick={close}>
      <div className="modal-panel quickadd-panel" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="quickadd-input"
          value={title}
          onChange={e => setTitle(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); save(); }
            if (e.key === 'Escape') close();
          }}
          placeholder="Capture anything…"
        />

        <div className="form-row" style={{ marginTop: 12 }}>
          <div className="form-group">
            <label htmlFor={`${fid}-1`}>Add to</label>
            <select id={`${fid}-1`} value={dest} onChange={e => setDest(e.target.value)}>
              <option value="todo">To-do list</option>
              <option value="planner">Weekly planner task</option>
              {liveProjects.map(p => {
                const secs = phases.filter(ph => ph.projectId === p.id);
                return (
                  <optgroup key={p.id} label={p.area ? `${p.name} · ${p.area}` : p.name}>
                    <option value={`p:${p.id}`}>{p.name}{secs.length ? ' — no section' : ''}</option>
                    {secs.map(s => <option key={s.id} value={`p:${p.id}:${s.id}`}>{p.name} › {s.name}</option>)}
                  </optgroup>
                );
              })}
            </select>
          </div>
          {dest !== 'todo' && (
            <div className="form-group">
              <label htmlFor={`${fid}-2`}>{dest === 'planner' ? 'Day' : 'Due date'}</label>
              <input id={`${fid}-2`} type="date" value={due} onChange={e => setDue(e.target.value)} />
            </div>
          )}
        </div>

        {(showEstimate || isProjectDest) && (
          <div className="form-row">
            {showEstimate && (
              <div className="form-group">
                <label htmlFor={`${fid}-3`}>Time estimate</label>
                <select id={`${fid}-3`} value={estimate} onChange={e => setEstimate(e.target.value)}>
                  <option value="">None</option>
                  {ESTIMATE_OPTIONS.map(m => <option key={m} value={m}>{fmtMins(m)}</option>)}
                </select>
              </div>
            )}
            {isProjectDest && (
              <div className="form-group" style={{ justifyContent: 'flex-end' }}>
                <label className="quickadd-check">
                  <input type="checkbox" checked={planToday} onChange={e => setPlanToday(e.target.checked)} />
                  Plan it for today
                </label>
              </div>
            )}
          </div>
        )}

        <div className="modal-footer" style={{ alignItems: 'center' }}>
          <label className="quickadd-check" style={{ marginRight: 'auto' }}>
            <input type="checkbox" checked={keepOpen} onChange={e => setKeepOpen(e.target.checked)} />
            Add another
          </label>
          <span style={{ fontSize: 11.5, color: 'var(--text-faint)' }}>Enter to add · Esc to close</span>
          <button className="btn btn-primary btn-sm" onClick={save} disabled={!title.trim()}>Add</button>
        </div>
      </div>
    </div>
  );
}
