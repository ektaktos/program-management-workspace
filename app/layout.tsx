import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { THEMES, THEME_CACHE_KEY, DEFAULT_THEME } from '@/lib/themes';

// Runs before paint: applies the theme cached from the last visit (the synced value is applied after data loads)
const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_CACHE_KEY}');var ids=${JSON.stringify(THEMES.map(t => t.id))};if(t&&t!=='${DEFAULT_THEME}'&&ids.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

export const metadata: Metadata = {
  title: 'Program Management Workspace',
  description: "OyinT's personal program management workspace",
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: "OyinT's Workspace",
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#efebe4',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
