'use client';

import { useEffect, useRef, useState } from 'react';
import { TaskStatus } from '@/lib/types';
import { STATUS_META, STATUS_ORDER } from '@/lib/constants';

interface StatusPillProps {
  status: TaskStatus;
  onChange?: (s: TaskStatus) => void;
}

export default function StatusPill({ status, onChange }: StatusPillProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const meta = STATUS_META[status];

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <span
        className={`badge ${meta.badgeClass}`}
        style={{ cursor: onChange ? 'pointer' : 'default', display: 'inline-flex', alignItems: 'center', gap: 5 }}
        onClick={(e) => { if (!onChange) return; e.stopPropagation(); setOpen(o => !o); }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, display: 'inline-block' }} />
        {meta.label}
      </span>
      {open && (
        <div className="status-popover">
          {STATUS_ORDER.map(s => {
            const m = STATUS_META[s];
            return (
              <div
                key={s}
                className="status-popover-item"
                onClick={(e) => { e.stopPropagation(); onChange?.(s as TaskStatus); setOpen(false); }}
              >
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: m.dot, display: 'inline-block', flexShrink: 0 }} />
                <span>{m.label}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
