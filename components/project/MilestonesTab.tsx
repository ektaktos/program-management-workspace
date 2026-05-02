'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Milestone } from '@/lib/types';
import { fmtDate } from '@/lib/utils';
import MilestoneModal from '../modals/MilestoneModal';
import ConfirmModal from '../modals/ConfirmModal';

const STATUS_ICON: Record<string, JSX.Element> = {
  upcoming: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c2dcef" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>,
  done:     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6fa885" strokeWidth="2" strokeLinecap="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  overdue:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#d68a8a" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>,
};

export default function MilestonesTab({ projectId }: { projectId: string }) {
  const { milestones, deleteMilestone } = useAppStore();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Milestone | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const projectMs = milestones.filter(m => m.projectId === projectId);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button className="btn btn-primary" style={{ height: 34, fontSize: 13 }} onClick={() => setShowAdd(true)}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Milestone
        </button>
      </div>

      {projectMs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)', fontSize: 14 }}>No milestones yet.</div>
      ) : (
        projectMs.map(m => (
          <div key={m.id} className="card" style={{ marginBottom: 10, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ marginTop: 2 }}>{STATUS_ICON[m.status]}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{m.title}</div>
              {m.desc && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{m.desc}</div>}
              {m.date && <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>{fmtDate(m.date)}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-icon" onClick={() => setEditing(m)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button className="btn-icon" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(m.id)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                </svg>
              </button>
            </div>
          </div>
        ))
      )}

      {showAdd && <MilestoneModal defaultProjectId={projectId} onClose={() => setShowAdd(false)} />}
      {editing && <MilestoneModal milestone={editing} onClose={() => setEditing(null)} />}
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
