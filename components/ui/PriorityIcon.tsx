import React from 'react';
import { Priority } from '@/lib/types';

const cfg = {
  high:   { badgeClass: 'badge-danger',  color: '#d68a8a', bars: [1, 1, 1]       as number[] },
  medium: { badgeClass: 'badge-warning', color: '#d49a5d', bars: [1, 1, 0.18]    as number[] },
  low:    { badgeClass: 'badge-success', color: '#6fa885', bars: [1, 0.18, 0.18] as number[] },
};

export default function PriorityIcon({ priority }: { priority: Priority }) {
  const c = cfg[priority];
  return (
    <span className={`badge ${c.badgeClass}`} style={{ padding: '3px 6px', display: 'inline-flex', alignItems: 'center' }}>
      <svg width="14" height="12" viewBox="0 0 14 12" fill={c.color}>
        <rect x="0"    y="6" width="3.2" height="6"  rx="0.8" opacity={c.bars[0]} />
        <rect x="5.4"  y="3" width="3.2" height="9"  rx="0.8" opacity={c.bars[1]} />
        <rect x="10.8" y="0" width="3.2" height="12" rx="0.8" opacity={c.bars[2]} />
      </svg>
    </span>
  );
}
