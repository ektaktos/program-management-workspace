// Notification preferences (synced via the 'notifPrefs' setting), sounds and quiet hours.
// Pure module: the validator also runs on the server.

export type NotifKind = 'task' | 'meeting' | 'calendar' | 'digest' | 'info';

export interface NotifTarget {
  view: string;
  projectId?: string;
  taskId?: string;
}

export interface NotifItem {
  id: string;
  kind: NotifKind;
  title: string;
  message: string;
  at: number;            // epoch ms
  read: boolean;
  target?: NotifTarget;
}

export const SOUND_IDS = ['chime', 'bell', 'marimba', 'droplet', 'ping'] as const;
export type SoundId = typeof SOUND_IDS[number];

export const SOUND_LABELS: Record<SoundId, string> = {
  chime: 'Chime', bell: 'Temple bell', marimba: 'Marimba', droplet: 'Droplet', ping: 'Ping',
};

export const CAL_LEAD_OPTIONS = [0, 5, 10, 15, 30, 60];

export interface NotifPrefs {
  taskAlerts: boolean;      // alerts set on tasks
  meetingAlerts: boolean;   // planner meetings with an alert
  calendarAlerts: boolean;  // events from subscribed calendars
  calendarLead: number;     // minutes before a calendar event starts
  digest: boolean;          // one morning summary per day
  digestTime: string;       // HH:MM
  sound: boolean;
  soundId: SoundId;
  volume: number;           // 0–1
  desktop: boolean;         // system pop-ups (still needs browser permission)
  quiet: boolean;           // quiet hours: no sound or pop-ups, still logged
  quietFrom: string;        // HH:MM
  quietTo: string;          // HH:MM
}

export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  taskAlerts: true,
  meetingAlerts: true,
  calendarAlerts: true,
  calendarLead: 10,
  digest: true,
  digestTime: '08:00',
  sound: true,
  soundId: 'chime',
  volume: 0.6,
  desktop: true,
  quiet: false,
  quietFrom: '22:00',
  quietTo: '07:00',
};

const HM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function isNotifPrefs(v: unknown): v is NotifPrefs {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const p = v as Record<string, unknown>;
  const bools = ['taskAlerts', 'meetingAlerts', 'calendarAlerts', 'digest', 'sound', 'desktop', 'quiet'];
  if (!bools.every(k => typeof p[k] === 'boolean')) return false;
  if (!CAL_LEAD_OPTIONS.includes(p.calendarLead as number)) return false;
  if (!(SOUND_IDS as readonly string[]).includes(p.soundId as string)) return false;
  if (typeof p.volume !== 'number' || !(p.volume >= 0 && p.volume <= 1)) return false;
  return [p.digestTime, p.quietFrom, p.quietTo].every(t => typeof t === 'string' && HM.test(t))
    && Object.keys(p).length === bools.length + 6;
}

// Fill gaps from older saved shapes so new fields get their defaults
export function normalizeNotifPrefs(v: unknown): NotifPrefs {
  const merged = { ...DEFAULT_NOTIF_PREFS, ...(v && typeof v === 'object' ? v as Partial<NotifPrefs> : {}) };
  const clean = (Object.keys(DEFAULT_NOTIF_PREFS) as (keyof NotifPrefs)[])
    .reduce((acc, k) => ({ ...acc, [k]: merged[k] }), {} as NotifPrefs);
  return isNotifPrefs(clean) ? clean : DEFAULT_NOTIF_PREFS;
}

function minsOf(hm: string): number {
  const [h, m] = hm.split(':').map(Number);
  return h * 60 + m;
}

// Quiet hours may wrap past midnight (e.g. 22:00 → 07:00)
export function inQuietHours(p: NotifPrefs, d = new Date()): boolean {
  if (!p.quiet) return false;
  const now = d.getHours() * 60 + d.getMinutes();
  const from = minsOf(p.quietFrom), to = minsOf(p.quietTo);
  if (from === to) return false;
  return from < to ? now >= from && now < to : now >= from || now < to;
}

// ── Sounds (Web Audio, synthesised; no files to load) ──

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

// Browsers only allow sound after the person has interacted with the page;
// resuming the shared context on the first click/key keeps later alerts audible.
export function unlockAudio() { audio(); }

function tone(c: AudioContext, out: AudioNode, freq: number, start: number, dur: number, type: OscillatorType, peak: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(peak, start + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
  osc.connect(g); g.connect(out);
  osc.start(start); osc.stop(start + dur + 0.05);
}

export function playSound(id: SoundId, volume: number) {
  const c = audio();
  if (!c || volume <= 0) return;
  const out = c.createGain();
  out.gain.value = Math.min(1, volume);
  out.connect(c.destination);
  const t = c.currentTime + 0.02;
  switch (id) {
    case 'chime':
      tone(c, out, 1318.5, t, 0.9, 'sine', 0.35);          // E6
      tone(c, out, 987.8, t + 0.16, 1.1, 'sine', 0.3);     // B5
      break;
    case 'bell':
      tone(c, out, 523.3, t, 2.4, 'sine', 0.35);           // C5 with inharmonic partials
      tone(c, out, 1316, t, 1.6, 'sine', 0.12);
      tone(c, out, 2245, t, 0.8, 'sine', 0.05);
      break;
    case 'marimba':
      [523.3, 659.3, 784].forEach((f, i) => tone(c, out, f, t + i * 0.11, 0.35, 'triangle', 0.4));
      break;
    case 'droplet': {
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.exponentialRampToValueAtTime(1500, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      osc.connect(g); g.connect(out);
      osc.start(t); osc.stop(t + 0.35);
      break;
    }
    case 'ping':
      tone(c, out, 1760, t, 0.25, 'sine', 0.3);
      tone(c, out, 1760, t + 0.18, 0.4, 'sine', 0.22);
      break;
  }
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - at) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const d = Math.round(h / 24);
  return d === 1 ? 'yesterday' : `${d} days ago`;
}
