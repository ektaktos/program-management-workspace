// Server-side fetching of subscribed calendar feeds, with SSRF guards and a short cache.
import { isCalendarText } from './ics';

const CACHE_TTL_MS = 10 * 60 * 1000;
const FRESH_MIN_GAP_MS = 20 * 1000;
const MAX_BYTES = 5 * 1024 * 1024;
const cache = new Map<string, { text: string; at: number }>();

// webcal:// → https://, and only public http(s) hosts are allowed
export function normalizeCalendarUrl(input: string): string | null {
  let raw = input.trim();
  if (/^webcals?:\/\//i.test(raw)) raw = raw.replace(/^webcals?:\/\//i, 'https://');
  let u: URL;
  try { u = new URL(raw); } catch { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  const host = u.hostname.toLowerCase();
  if (
    host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') ||
    host.endsWith('.internal') || host === '0.0.0.0' || host === '[::1]' || host === '::1' ||
    /^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host) ||
    /^169\.254\./.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host) || /^\[?(fc|fd|fe80)/i.test(host)
  ) return null;
  return u.toString();
}

export async function fetchCalendarText(url: string, { fresh = false } = {}): Promise<string> {
  const hit = cache.get(url);
  if (!fresh && hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.text;
  // Even a forced refresh reuses a copy fetched in the last 20 seconds, so repeated clicks
  // don't hammer the calendar provider (which may throttle the link)
  if (fresh && hit && Date.now() - hit.at < FRESH_MIN_GAP_MS) return hit.text;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'OyinT-Workspace/1.0 (calendar subscription)', Accept: 'text/calendar, text/plain, */*' },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`The calendar server answered ${res.status}`);
    const len = Number(res.headers.get('content-length') ?? 0);
    if (len > MAX_BYTES) throw new Error('That calendar is too large to load');
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new Error('That calendar is too large to load');
    if (!isCalendarText(text)) throw new Error("That link didn't return a calendar (iCal/ICS) file");
    cache.set(url, { text, at: Date.now() });
    return text;
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw new Error('The calendar took too long to respond');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

export function forgetCalendar(url: string) { cache.delete(url); }
