import type { Metadata } from 'next';
import { Instrument_Serif, Outfit } from 'next/font/google';
import '@/styles/globals.css';

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-serif',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Program Management Workspace',
  description: "OyinT's personal program management workspace",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${instrumentSerif.variable} ${outfit.variable}`}>
      <body>{children}</body>
    </html>
  );
}
