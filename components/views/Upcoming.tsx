'use client';

import { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { fmtDate } from '@/lib/utils';
import { Milestone } from '@/lib/types';
import TaskCard from '../project/TaskCard';
import MilestoneModal from '../modals/MilestoneModal';
import ConfirmModal from '../modals/ConfirmModal';

const MS_ICON: Record<string, string> = { done: '✓', upcoming: '◆', overdue: '!' };

function MilestoneCard({ m }: { m: Milestone }) {
  const { projects, deleteMilestone } = useAppStore();
  const [editing,    setEditing]    = useState(false);
  const [confirming, setConfirming] = useState(false);
  const proj = projects.find(p => p.id === m.projectId);
  const status = (m.status ?? 'upcoming') as 'done' | 'upcoming' | 'overdue';

  return (
    <>
      <div className="milestone-item">
        <div className={`milestone-icon ${status}`}>
          {MS_ICON[status] ?? '◆'}
        </div>
        <div className="milestone-body">
          <div className="milestone-title">{m.title}</div>
          <div className="milestone-date">
            {m.date ? fmtDate(m.date) : ''}
            {proj ? ` · ${proj.name}` : ''}
          </div>
          {m.desc && <div className="milestone-desc">{m.desc}</div>}
        </div>
        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
          <button className="btn-icon" title="Edit milestone" onClick={() => setEditing(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button className="btn-icon" title="Delete milestone" style={{ color: 'var(--danger)' }} onClick={() => setConfirming(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
              <path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/>
            </svg>
          </button>
        </div>
      </div>

      {editing    && <MilestoneModal milestone={m} onClose={() => setEditing(false)} />}
      {confirming && (
        <ConfirmModal
          message={`Delete milestone "${m.title}"?`}
          onConfirm={() => { deleteMilestone(m.id); setConfirming(false); }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </>
  );
}

export default function Upcoming() {
  const { tasks, milestones } = useAppStore();

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done')
    .sort((a, b) => new Date(a.due! + 'T00:00:00').getTime() - new Date(b.due! + 'T00:00:00').getTime());

  const upcomingMs = milestones
    .filter(m => m.date && m.status !== 'done')
    .sort((a, b) => new Date(a.date! + 'T00:00:00').getTime() - new Date(b.date! + 'T00:00:00').getTime());

  if (!upcomingTasks.length && !upcomingMs.length) {
    return (
      <div className="empty-state">
        <h3>Nothing upcoming</h3>
        <p>You are all caught up</p>
      </div>
    );
  }

  return (
    <div>
      {/* Upcoming Tasks */}
      {upcomingTasks.length > 0 && (
        <div style={{ marginBottom: 40 }}>
          <div className="section-title">
            <span>Upcoming Tasks</span>
            <span className="badge badge-gray">{upcomingTasks.length}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {upcomingTasks.map(t => <TaskCard key={t.id} task={t} showProject />)}
          </div>
        </div>
      )}

      {/* Upcoming Milestones */}
      {upcomingMs.length > 0 && (
        <div>
          <div className="section-title" style={{ marginTop: upcomingTasks.length ? 0 : 0 }}>
            <span>Upcoming Milestones</span>
            <span className="badge badge-gray">{upcomingMs.length}</span>
          </div>
          <div className="milestone-list">
            {upcomingMs.map(m => <MilestoneCard key={m.id} m={m} />)}
          </div>
        </div>
      )}
    </div>
  );
}
