'use client';

import { useAppStore } from '@/store/useAppStore';
import { THEMES } from '@/lib/themes';

// Grid of theme tiles — click one to switch the whole workspace (synced across devices)
export default function ThemeGrid() {
  const { theme, setTheme } = useAppStore();

  return (
    <div className="theme-grid" role="radiogroup" aria-label="Workspace theme">
      {THEMES.map(t => {
        const active = t.id === theme;
        return (
          <button
            key={t.id}
            role="radio"
            aria-checked={active}
            title={t.description}
            className={`theme-tile${active ? ' active' : ''}`}
            onClick={() => setTheme(t.id)}
          >
            <span className="theme-tile-preview" style={{ background: t.swatches[0] }}>
              <span className="theme-tile-side" style={{ background: t.swatches[1] }} />
              <span className="theme-tile-bar" style={{ background: t.swatches[2] }} />
              <span className="theme-tile-dot" style={{ background: t.swatches[3] }} />
            </span>
            <span className="theme-tile-name">
              {t.name}
              {active && (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ width: 11, height: 11, flexShrink: 0 }}>
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
