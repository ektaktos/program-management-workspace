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
  { id: 'scandinavian',  name: 'Scandinavian',  description: 'Crisp white, pale birch and fjord blue', swatches: ['#f5f7f8', '#ebeff1', '#2f3236', '#4a6175'], metaColor: '#ebeff1' },
  { id: 'rustic',        name: 'Rustic',        description: 'Warm wood, cream and rust', swatches: ['#f6f1e9', '#ece3d5', '#4a3526', '#87492a'], metaColor: '#ece3d5' },
  { id: 'mediterranean', name: 'Mediterranean', description: 'Whitewash, Aegean blue and terracotta', swatches: ['#f7f5f0', '#eaeff3', '#1f3d5a', '#c0704f'], metaColor: '#eaeff3' },
  { id: 'bohemian',      name: 'Bohemian',      description: 'Terracotta, mustard and plum', swatches: ['#f8f1ea', '#f1e0dd', '#5a2e3a', '#efd9a0'], metaColor: '#f1e0dd' },
  { id: 'southwestern',  name: 'Southwestern',  description: 'Desert sand, terracotta and turquoise', swatches: ['#f8f2ea', '#f0e3d3', '#8c3f26', '#4f9a98'], metaColor: '#f0e3d3' },
  { id: 'sumi',          name: 'Sumi',          description: 'Dark ink with warm tan accents', swatches: ['#1e1c1a', '#191715', '#d9c3a3', '#c9ad86'], metaColor: '#191715', dark: true },
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
