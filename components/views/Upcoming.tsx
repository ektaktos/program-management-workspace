'use client';

import { useAppStore } from '@/store/useAppStore';
import TaskCard from '../project/TaskCard';

export default function Upcoming() {
  const { tasks, archivedTaskIds, archivedProjectIds } = useAppStore();

  const upcomingTasks = tasks
    .filter(t => t.due && t.status !== 'done' && !archivedTaskIds.includes(t.id) && !archivedProjectIds.includes(t.projectId))
    .sort((a, b) => new Date(a.due! + 'T00:00:00').getTime() - new Date(b.due! + 'T00:00:00').getTime());

  if (!upcomingTasks.length) {
    return (
      <div className="empty-state">
        <h3>Nothing upcoming</h3>
        <p>You are all caught up</p>
      </div>
    );
  }

  return (
    <div>
      <div className="section-title">
        <span>Upcoming Tasks</span>
        <span className="badge badge-gray">{upcomingTasks.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {upcomingTasks.map(t => <TaskCard key={t.id} task={t} showProject />)}
      </div>
    </div>
  );
}
