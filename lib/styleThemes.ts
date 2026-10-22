// Style themes: font, card style and page background, chosen alongside the colour theme.
// Applied as data attributes on <html> (data-font / data-cards / data-bg); synced via the
// 'styleTheme' setting and cached locally so the boot script can apply it before paint.

export interface StyleOption { id: string; name: string; hint: string }

export const FONT_OPTIONS: StyleOption[] = [
  { id: 'classic',     name: 'Classic',     hint: 'Georgia serif throughout' },
  { id: 'modern',      name: 'Clean',       hint: 'Inter sans-serif' },
  { id: 'rounded',     name: 'Rounded',     hint: 'Soft Nunito' },
  { id: 'editorial',   name: 'Editorial',   hint: 'Playfair headings, Inter text' },
  { id: 'handwritten', name: 'Handwritten', hint: 'Kalam headings, Nunito text' },
];

export const CARD_OPTIONS: StyleOption[] = [
  { id: 'paper',    name: 'Paper',    hint: 'Thin border, gentle corners' },
  { id: 'soft',     name: 'Soft',     hint: 'Borderless with a soft shadow' },
  { id: 'outlined', name: 'Outlined', hint: 'Crisp border, tighter corners' },
  { id: 'flat',     name: 'Flat',     hint: 'Tinted panels, no border' },
];

export const BG_OPTIONS: StyleOption[] = [
  { id: 'plain', name: 'Plain', hint: 'Solid colour' },
  { id: 'linen', name: 'Linen', hint: 'Fine woven texture' },
  { id: 'dots',  name: 'Dot grid', hint: 'Like a bullet journal' },
  { id: 'ruled', name: 'Ruled', hint: 'Notebook lines' },
];

export interface StyleTheme { font: string; cards: string; bg: string }

export const DEFAULT_STYLE: StyleTheme = { font: 'classic', cards: 'paper', bg: 'plain' };
export const STYLE_CACHE_KEY = 'pm_oyint_style';

const ids = (o: StyleOption[]) => o.map(x => x.id);

export function isStyleTheme(v: unknown): v is StyleTheme {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as Record<string, unknown>;
  return Object.keys(s).length === 3
    && ids(FONT_OPTIONS).includes(s.font as string)
    && ids(CARD_OPTIONS).includes(s.cards as string)
    && ids(BG_OPTIONS).includes(s.bg as string);
}

export function normalizeStyle(v: unknown): StyleTheme {
  const s = { ...DEFAULT_STYLE, ...(v && typeof v === 'object' ? v as Partial<StyleTheme> : {}) };
  const clean = { font: s.font, cards: s.cards, bg: s.bg };
  return isStyleTheme(clean) ? clean : DEFAULT_STYLE;
}

export function applyStyle(s: StyleTheme) {
  if (typeof document === 'undefined') return;
  const el = document.documentElement;
  // Defaults carry no attribute, so the base stylesheet is the classic look
  (['font', 'cards', 'bg'] as const).forEach(k => {
    if (s[k] === DEFAULT_STYLE[k]) el.removeAttribute(`data-${k}`);
    else el.setAttribute(`data-${k}`, s[k]);
  });
  try { localStorage.setItem(STYLE_CACHE_KEY, JSON.stringify(s)); } catch {}
}
