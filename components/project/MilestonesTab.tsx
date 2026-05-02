'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Milestone } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import MilestoneModal from '../modals/MilestoneModal';
import ConfirmModal from '../modals/ConfirmModal';

function MilestoneIcon({ status }: { status: Milestone['status'] }) {
  const bg    = status === 'done' ? 'var(--accent-mint-light)' : status === 'overdue' ? 'var(--accent-blush-light)' : 'var(--primary-light)';
  const color = status === 'done' ? '#4f8366'                  : status === 'overdue' ? '#b06868'                    : 'var(--primary-dark)';
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background: bg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {status === 'done' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 18, height: 18 }}>
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
        </svg>
      ) : status === 'overdue' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" style={{ width: 18, height: 18 }}>
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      )}
    </div>
  );
}

export default function MilestonesTab({ projectId }: { projectId: string }) {
  const { milestones, deleteMilestone } = useAppStore();
  const [showAdd,    setShowAdd]    = useState(false);
  const [editing,    setEditing]    = useState<Milestone | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const projectMs = milestones.filter(m => m.projectId === projectId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAdd(true)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ width: 13, height: 13 }}>
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Milestone
        </button>
      </div>

      {projectMs.length === 0 ? (
        <div className="empty-state"><h3>No milestones yet</h3><p>Track key moments and deliverables here.</p></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projectMs.map(m => (
            <div key={m.id} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: 18,
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <MilestoneIcon status={m.status} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{m.title}</div>
                {m.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{m.desc}</div>}
                {m.date && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>{fmtDate(m.date)}</div>}
              </div>
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-icon" onClick={() => setEditing(m)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                  </svg>
                </button>
                <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(m.id)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showAdd    && <MilestoneModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
      {editing    && <MilestoneModal milestone={editing} onClose={() => setEditing(null)} />}
      {confirming && (
        <ConfirmModal
          message="Delete this milestone?"
          onConfirm={() => { deleteMilestone(confirming); setConfirming(null); }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}
