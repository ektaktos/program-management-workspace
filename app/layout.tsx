import type { Metadata, Viewport } from 'next';
import { Inter, Kalam, Nunito, Playfair_Display } from 'next/font/google';
import '@/styles/globals.css';
import { THEMES, THEME_CACHE_KEY, DEFAULT_THEME } from '@/lib/themes';
import { STYLE_CACHE_KEY, DEFAULT_STYLE } from '@/lib/styleThemes';
import AuthProvider from '@/components/AuthProvider';
import UpdateBanner from '@/components/UpdateBanner';

// Runs before paint: applies the theme cached from the last visit (the synced value is applied after data loads)
const themeBootScript = `(function(){try{var t=localStorage.getItem('${THEME_CACHE_KEY}');var ids=${JSON.stringify(THEMES.map(t => t.id))};if(t&&t!=='${DEFAULT_THEME}'&&ids.indexOf(t)>-1){document.documentElement.setAttribute('data-theme',t);}}catch(e){}})();`;

// Also before paint: font / card / background style cached from the last visit
const styleBootScript = `(function(){try{var s=JSON.parse(localStorage.getItem('${STYLE_CACHE_KEY}')||'null');if(!s)return;var d=${JSON.stringify(DEFAULT_STYLE)};['font','cards','bg'].forEach(function(k){if(typeof s[k]==='string'&&/^[a-z]+$/.test(s[k])&&s[k]!==d[k])document.documentElement.setAttribute('data-'+k,s[k]);});}catch(e){}})();`;

// Web fonts offered by the font styles (Classic uses the system's Georgia). next/font downloads them
// at build time and serves them from this site, so there's no Google Fonts <link> in the page for a
// CDN (Brimble's Cloudflare) to rewrite into a <style>, which broke hydration (React error #418).
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--ff-inter', display: 'swap' });
const nunito = Nunito({ subsets: ['latin'], weight: ['400', '600', '700'], variable: '--ff-nunito', display: 'swap' });
const kalam = Kalam({ subsets: ['latin'], weight: ['400', '700'], variable: '--ff-kalam', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--ff-playfair', display: 'swap' });
const fontVars = [inter.variable, nunito.variable, kalam.variable, playfair.variable].join(' ');

// Render pages per request. Prerendered pages are sent with a one-year shared-cache lifetime,
// so a CDN or proxy kept serving old HTML (and the old build's scripts) after each deploy.
// Pages now go out as no-store; the hashed files under /_next/static stay cached forever.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Workspace',
  description: 'Your personal project management workspace',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Workspace',
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
    <html lang="en" className={fontVars} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
        <script dangerouslySetInnerHTML={{ __html: styleBootScript }} />
      </head>
      <body><AuthProvider>{children}</AuthProvider><UpdateBanner /></body>
    </html>
  );
}
