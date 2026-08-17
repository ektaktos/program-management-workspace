'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';
import TaskCard from './TaskCard';
import PhaseModal from '../modals/PhaseModal';
import TaskModal from '../modals/TaskModal';
import ConfirmModal from '../modals/ConfirmModal';
import { Phase } from '@/lib/types';

export default function PhasesTab({ projectId }: { projectId: string }) {
  const { phases, tasks, deletePhase, archivedTaskIds } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [addingTaskToPhase, setAddingTaskToPhase] = useState<string | null>(null);
  const [expandedPhaseId, setExpandedPhaseId] = useState<string | null>(null);

  const projectPhases = phases.filter(p => p.projectId === projectId);

  function tasksForPhase(phaseId: string) {
    return tasks.filter(t => t.projectId === projectId && t.phaseId === phaseId && !archivedTaskIds.includes(t.id));
  }

  const expandedPhase = expandedPhaseId ? projectPhases.find(p => p.id === expandedPhaseId) ?? null : null;

  return (
    <div>
      {/* Toolbar — hidden while a phase is expanded, replaced by a Back button */}
      <div style={{ display: 'flex', justifyContent: expandedPhase ? 'space-between' : 'flex-end', alignItems: 'center', marginBottom: 16 }}>
        {expandedPhase && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setExpandedPhaseId(null)}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>
            </svg>
            All phases
          </button>
        )}
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Phase
        </button>
      </div>

      {projectPhases.length === 0 ? (
        <div className="empty-state"><h3>No phases yet</h3><p>Break your project into structured phases here.</p></div>

      ) : expandedPhase ? (
        /* ── Expanded: single-phase focused view ── */
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', padding: '20px 22px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
            <div>
              <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 19, fontWeight: 400, color: 'var(--text)' }}>{expandedPhase.name}</div>
              {(expandedPhase.start || expandedPhase.end) && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {expandedPhase.start && fmtDate(expandedPhase.start)}{expandedPhase.start && expandedPhase.end && ' — '}{expandedPhase.end && fmtDate(expandedPhase.end)}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => setEditing(expandedPhase)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button
                className="btn-icon"
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirming(expandedPhase.id)}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>
              <span>Progress</span>
              <span>{expandedPhase.progress}%</span>
            </div>
            <ProgressBar value={expandedPhase.progress} />
          </div>

          {expandedPhase.notes && <p style={{ fontSize: 13, color: '#5a5048', lineHeight: 1.6, marginBottom: 14 }}>{expandedPhase.notes}</p>}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
            {(() => {
              const phaseTasks = tasksForPhase(expandedPhase.id);
              return phaseTasks.length === 0 ? (
                <div style={{ fontSize: 13, color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: 10 }}>
                  No tasks in this phase yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
                  {phaseTasks.map(t => (
                    <div key={t.id} style={{ background: 'var(--bg)', borderRadius: 10, padding: '8px 12px' }}>
                      <TaskCard task={t} />
                    </div>
                  ))}
                </div>
              );
            })()}
            <button
              className="btn btn-ghost btn-sm"
              style={{ fontSize: 12, color: 'var(--primary-dark)' }}
              onClick={() => setAddingTaskToPhase(expandedPhase.id)}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Add task to phase
            </button>
          </div>
        </div>

      ) : (
        /* ── Collapsed: horizontal row of phase cards ── */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
          {projectPhases.map(phase => {
            const count = tasksForPhase(phase.id).length;
            return (
              <div
                key={phase.id}
                onClick={() => setExpandedPhaseId(phase.id)}
                style={{
                  background: 'var(--surface)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '18px 20px',
                  cursor: 'pointer', transition: 'all 0.18s ease', position: 'relative',
                }}
                onMouseOver={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'var(--primary)';
                  el.style.boxShadow = 'var(--shadow-md)';
                  el.style.transform = 'translateY(-2px)';
                  const btns = el.querySelector('.phase-hover-btns') as HTMLElement;
                  if (btns) btns.style.opacity = '1';
                }}
                onMouseOut={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.boxShadow = 'none';
                  el.style.transform = 'none';
                  const btns = el.querySelector('.phase-hover-btns') as HTMLElement;
                  if (btns) btns.style.opacity = '0';
                }}
              >
                <div className="phase-hover-btns" style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 4, opacity: 0, transition: 'opacity 0.15s' }}>
                  <button
                    className="btn-icon"
                    style={{ background: 'rgba(255,255,255,0.9)' }}
                    onClick={e => { e.stopPropagation(); setEditing(phase); }}
                    title="Edit phase"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    className="btn-icon"
                    style={{ color: 'var(--danger)', background: 'rgba(255,255,255,0.9)' }}
                    onClick={e => { e.stopPropagation(); setConfirming(phase.id); }}
                    title="Delete phase"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
                    </svg>
                  </button>
                </div>

                <div style={{ fontFamily: 'Georgia, "Times New Roman", serif', fontSize: 17, fontWeight: 400, color: 'var(--text)', paddingRight: 46, marginBottom: 4 }}>
                  {phase.name}
                </div>
                {(phase.start || phase.end) && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 12 }}>
                    {phase.start && fmtDate(phase.start)}{phase.start && phase.end && ' — '}{phase.end && fmtDate(phase.end)}
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 5 }}>
                    <span>Progress</span>
                    <span>{phase.progress}%</span>
                  </div>
                  <ProgressBar value={phase.progress} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                  <span className="badge badge-gray">{count} task{count !== 1 ? 's' : ''}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="var(--text-faint)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 13, height: 13 }}>
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAdd && <PhaseModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
      {editing && <PhaseModal phase={editing} onClose={() => setEditing(null)} />}
      {addingTaskToPhase && (
        <TaskModal
          defaultProjectId={projectId}
          defaultPhaseId={addingTaskToPhase}
          onClose={() => setAddingTaskToPhase(null)}
        />
      )}
      {confirming && (
        <ConfirmModal
          message="Delete this phase?"
          onConfirm={() => {
            deletePhase(confirming);
            if (expandedPhaseId === confirming) setExpandedPhaseId(null);
            setConfirming(null);
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
