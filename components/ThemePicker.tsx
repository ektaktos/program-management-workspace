'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { THEMES } from '@/lib/themes';

export default function ThemePicker() {
  const { theme, setTheme } = useAppStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="bell-btn"
        title="Change theme"
        aria-label="Change theme"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16 }}>
          <path d="M12 3a9 9 0 100 18c.9 0 1.5-.7 1.5-1.5 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.8.7-1.5 1.5-1.5H16a5 5 0 005-5c0-4.4-4-7.8-9-7.8z"/>
          <circle cx="7.5" cy="11.5" r="1"/><circle cx="10.5" cy="7.5" r="1"/><circle cx="15" cy="7.5" r="1"/>
        </svg>
      </button>

      {open && (
        <div className="theme-popover" role="menu">
          <div className="theme-popover-head">Theme</div>
          {THEMES.map(t => {
            const active = t.id === theme;
            return (
              <button
                key={t.id}
                role="menuitemradio"
                aria-checked={active}
                className={`theme-option${active ? ' active' : ''}`}
                onClick={() => setTheme(t.id)}
              >
                <span className="theme-swatch" style={{ background: t.swatches[0], borderColor: t.swatches[1] }}>
                  <span style={{ background: t.swatches[1] }} />
                  <span style={{ background: t.swatches[2] }} />
                  <span style={{ background: t.swatches[3] }} />
                </span>
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="theme-name">{t.name}{t.dark ? ' · dark' : ''}</span>
                  <span className="theme-desc">{t.description}</span>
                </span>
                {active && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </button>
            );
          })}
          <div className="theme-popover-foot">Syncs across your devices.</div>
        </div>
      )}
    </div>
  );
}
