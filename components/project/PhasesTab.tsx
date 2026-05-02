'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import ProgressBar from '../ui/ProgressBar';
import TaskCard from './TaskCard';
import PhaseModal from '../modals/PhaseModal';
import ConfirmModal from '../modals/ConfirmModal';
import { Phase } from '@/lib/types';

export default function PhasesTab({ projectId }: { projectId: string }) {
  const { phases, tasks, deletePhase } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Phase | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const projectPhases = phases.filter(p => p.projectId === projectId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ height: 34, fontSize: 13 }} onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Phase
        </button>
      </div>

      {projectPhases.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No phases yet.</div>
      ) : (
        projectPhases.map(phase => {
          const phaseTasks = tasks.filter(t => t.projectId === projectId && t.phaseId === phase.id);
          return (
            <div key={phase.id} className="card" style={{ marginBottom: 16, padding: 18 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text)' }}>{phase.name}</div>
                  {(phase.start || phase.end) && (
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {phase.start && fmtDate(phase.start)}{phase.start && phase.end && ' — '}{phase.end && fmtDate(phase.end)}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  <button className="btn-icon" onClick={() => setEditing(phase)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(phase.id)}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>
                  <span>Progress</span>
                  <span>{phase.progress}%</span>
                </div>
                <ProgressBar value={phase.progress} />
              </div>

              {phase.notes && <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>{phase.notes}</p>}

              {phaseTasks.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                  {phaseTasks.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              )}
            </div>
          );
        })
      )}

      {showAdd && <PhaseModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
      {editing && <PhaseModal phase={editing} onClose={() => setEditing(null)} />}
      {confirming && (
        <ConfirmModal
          message="Delete this phase?"
          onConfirm={() => { deletePhase(confirming); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
