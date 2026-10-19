// Workspace colour themes. Each theme's colours live in styles/globals.css as a
// `:root[data-theme="<id>"]` block overriding the default (Japandi) tokens.

export interface ThemeMeta {
  id: string;
  name: string;
  description: string;
  swatches: [string, string, string, string]; // background, sidebar, accent, highlight — for the picker
  metaColor: string;                           // browser / PWA title-bar colour
  dark?: boolean;
}

export const THEMES: ThemeMeta[] = [
  { id: 'japandi', name: 'Japandi', description: 'Linen, oak and warm charcoal', swatches: ['#f7f4ef', '#efebe4', '#4b4036', '#836a4f'], metaColor: '#efebe4' },
  { id: 'honey',   name: 'Honey',   description: 'The original warm cream and honey-brown', swatches: ['#faf7f3', '#f5f0ea', '#5f441c', '#e4d2b4'], metaColor: '#f5f0ea' },
  { id: 'sage',    name: 'Sage',    description: 'Soft moss and green-grey', swatches: ['#f3f5f0', '#e9ede4', '#3f4a3c', '#5f7558'], metaColor: '#e9ede4' },
  { id: 'mist',    name: 'Mist',    description: 'Cool stone and slate', swatches: ['#f4f5f6', '#eaedf0', '#3c4650', '#576a7c'], metaColor: '#eaedf0' },
  { id: 'sumi',    name: 'Sumi',    description: 'Dark ink with warm tan accents', swatches: ['#1e1c1a', '#191715', '#d9c3a3', '#c9ad86'], metaColor: '#191715', dark: true },
];

export const DEFAULT_THEME = 'japandi';
export const THEME_IDS = THEMES.map(t => t.id);
export const THEME_CACHE_KEY = 'pm_oyint_theme';

export function isThemeId(v: unknown): v is string {
  return typeof v === 'string' && THEME_IDS.includes(v);
}

// Apply a theme to the page (data attribute drives the CSS; meta tag tints the browser chrome)
export function applyTheme(id: string) {
  if (typeof document === 'undefined') return;
  const theme = THEMES.find(t => t.id === id) ?? THEMES[0];
  if (theme.id === DEFAULT_THEME) document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', theme.id);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.metaColor);
  try { localStorage.setItem(THEME_CACHE_KEY, theme.id); } catch {}
}
