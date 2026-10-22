'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { THEMES } from '@/lib/themes';
import { BG_OPTIONS, CARD_OPTIONS, FONT_OPTIONS, StyleOption, StyleTheme } from '@/lib/styleThemes';

const FONT_SAMPLE: Record<string, string> = {
  classic: 'Georgia, "Times New Roman", serif',
  modern: "'Inter', -apple-system, 'Segoe UI', sans-serif",
  rounded: "'Nunito', ui-rounded, sans-serif",
  editorial: "'Playfair Display', Georgia, serif",
  handwritten: "'Kalam', 'Comic Sans MS', cursive",
};

type Tab = 'colour' | 'font' | 'cards' | 'bg';
const TABS: { id: Tab; label: string }[] = [
  { id: 'colour', label: 'Colour' }, { id: 'font', label: 'Font' }, { id: 'cards', label: 'Cards' }, { id: 'bg', label: 'Background' },
];

export default function ThemePicker() {
  const { theme, setTheme, styleTheme, setStyleTheme } = useAppStore();
  const [tab, setTab] = useState<Tab>('colour');
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
          <div className="theme-tabs" role="tablist" aria-label="Theme settings">
            {TABS.map(t => (
              <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>{t.label}</button>
            ))}
          </div>
          {tab === 'font' && <StyleList options={FONT_OPTIONS} kind="font" value={styleTheme.font} onPick={id => setStyleTheme({ font: id })} />}
          {tab === 'cards' && <StyleList options={CARD_OPTIONS} kind="cards" value={styleTheme.cards} onPick={id => setStyleTheme({ cards: id })} />}
          {tab === 'bg' && <StyleList options={BG_OPTIONS} kind="bg" value={styleTheme.bg} onPick={id => setStyleTheme({ bg: id })} />}
          {tab === 'colour' && THEMES.map(t => {
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

function Check() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14, flexShrink: 0 }}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// One list for font, card and background styles; each option shows a tiny live preview
function StyleList({ options, kind, value, onPick }: { options: StyleOption[]; kind: keyof StyleTheme; value: string; onPick: (id: string) => void }) {
  return (
    <>
      {options.map(o => {
        const active = o.id === value;
        return (
          <button key={o.id} role="menuitemradio" aria-checked={active} className={`theme-option${active ? ' active' : ''}`} onClick={() => onPick(o.id)}>
            <span className={`style-swatch style-swatch-${kind}`} data-v={o.id} aria-hidden>
              {kind === 'font' && <span style={{ fontFamily: FONT_SAMPLE[o.id] }}>Aa</span>}
              {kind === 'cards' && <span className="style-mini-card" />}
            </span>
            <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
              <span className="theme-name" style={kind === 'font' ? { fontFamily: FONT_SAMPLE[o.id] } : undefined}>{o.name}</span>
              <span className="theme-desc">{o.hint}</span>
            </span>
            {active && <Check />}
          </button>
        );
      })}
    </>
  );
}

