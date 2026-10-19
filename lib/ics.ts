// Minimal iCalendar (RFC 5545) reader for read-only calendar subscriptions.
// Handles: line folding, TZID / UTC / floating / all-day dates, DTEND or DURATION,
// RRULE (DAILY/WEEKLY/MONTHLY/YEARLY with INTERVAL, COUNT, UNTIL, BYDAY, BYMONTHDAY, BYMONTH),
// EXDATE, RECURRENCE-ID overrides and cancelled events. Server-side only.

export interface CalendarOccurrence {
  uid: string;
  title: string;
  location?: string;
  allDay: boolean;
  startMs: number;      // UTC instant (all-day: midnight UTC of the date)
  endMs: number;
  startDate?: string;   // all-day only: YYYY-MM-DD
  endDate?: string;     // all-day only: YYYY-MM-DD, exclusive
}

interface Prop { value: string; params: Record<string, string> }
type Props = Record<string, Prop[]>;

type IcsTime =
  | { kind: 'date'; y: number; m: number; d: number }
  | { kind: 'wall'; y: number; m: number; d: number; h: number; mi: number; s: number; tz?: string; utc: boolean };

interface Parsed {
  uid: string;
  title: string;
  location?: string;
  start: IcsTime;
  durationMs: number;
  allDay: boolean;
  rrule?: Record<string, string>;
  exdates: number[];        // UTC ms (timed) or date-midnight UTC ms (all-day)
  recurrenceId?: number;
  cancelled: boolean;
}

// ── Line handling ─────────────────────────────────────────────────────────────

function unfold(text: string): string[] {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\n[ \t]/g, '').split('\n');
}

function parseLine(line: string): { name: string; params: Record<string, string>; value: string } | null {
  let inQuote = false;
  let idx = -1;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuote = !inQuote;
    else if (c === ':' && !inQuote) { idx = i; break; }
  }
  if (idx < 0) return null;
  const head = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const parts = head.split(';');
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf('=');
    if (eq > 0) params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1).replace(/^"|"$/g, '');
  }
  return { name: parts[0].toUpperCase(), params, value };
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();
}

// ── Time zones ────────────────────────────────────────────────────────────────

// Outlook/Exchange feeds often use Windows zone names, which Intl doesn't know
const WINDOWS_TZ: Record<string, string> = {
  'Dateline Standard Time': 'Etc/GMT+12', 'Hawaiian Standard Time': 'Pacific/Honolulu', 'Alaskan Standard Time': 'America/Anchorage',
  'Pacific Standard Time': 'America/Los_Angeles', 'Mountain Standard Time': 'America/Denver', 'US Mountain Standard Time': 'America/Phoenix',
  'Central Standard Time': 'America/Chicago', 'Canada Central Standard Time': 'America/Regina', 'Central America Standard Time': 'America/Guatemala',
  'Eastern Standard Time': 'America/New_York', 'US Eastern Standard Time': 'America/Indianapolis', 'Atlantic Standard Time': 'America/Halifax',
  'Newfoundland Standard Time': 'America/St_Johns', 'SA Pacific Standard Time': 'America/Bogota', 'E. South America Standard Time': 'America/Sao_Paulo',
  'Argentina Standard Time': 'America/Buenos_Aires', 'UTC': 'UTC', 'Coordinated Universal Time': 'UTC',
  'GMT Standard Time': 'Europe/London', 'Greenwich Standard Time': 'Atlantic/Reykjavik', 'W. Europe Standard Time': 'Europe/Berlin',
  'Central Europe Standard Time': 'Europe/Budapest', 'Romance Standard Time': 'Europe/Paris', 'Central European Standard Time': 'Europe/Warsaw',
  'W. Central Africa Standard Time': 'Africa/Lagos', 'E. Europe Standard Time': 'Europe/Chisinau', 'GTB Standard Time': 'Europe/Bucharest',
  'FLE Standard Time': 'Europe/Kiev', 'South Africa Standard Time': 'Africa/Johannesburg', 'Egypt Standard Time': 'Africa/Cairo',
  'Israel Standard Time': 'Asia/Jerusalem', 'Russian Standard Time': 'Europe/Moscow', 'E. Africa Standard Time': 'Africa/Nairobi',
  'Arabian Standard Time': 'Asia/Dubai', 'Arab Standard Time': 'Asia/Riyadh', 'Pakistan Standard Time': 'Asia/Karachi',
  'India Standard Time': 'Asia/Kolkata', 'Bangladesh Standard Time': 'Asia/Dhaka', 'SE Asia Standard Time': 'Asia/Bangkok',
  'China Standard Time': 'Asia/Shanghai', 'Singapore Standard Time': 'Asia/Singapore', 'W. Australia Standard Time': 'Australia/Perth',
  'Tokyo Standard Time': 'Asia/Tokyo', 'Korea Standard Time': 'Asia/Seoul', 'AUS Eastern Standard Time': 'Australia/Sydney',
  'E. Australia Standard Time': 'Australia/Brisbane', 'New Zealand Standard Time': 'Pacific/Auckland',
};

const dtfCache = new Map<string, Intl.DateTimeFormat>();
const zoneValid = new Map<string, boolean>();
function isValidZone(tz: string): boolean {
  let ok = zoneValid.get(tz);
  if (ok === undefined) {
    try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); ok = true; } catch { ok = false; }
    zoneValid.set(tz, ok);
  }
  return ok;
}
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    });
    dtfCache.set(tz, f);
  }
  return f;
}
// Offset (ms) of `tz` from UTC at instant `utcMs`
function tzOffsetMs(utcMs: number, tz: string): number {
  const parts: Record<string, number> = {};
  for (const p of dtf(tz).formatToParts(new Date(utcMs))) if (p.type !== 'literal') parts[p.type] = Number(p.value);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour === 24 ? 0 : parts.hour, parts.minute, parts.second);
  return asUtc - utcMs;
}

interface ZoneCtx { calendarTz?: string; fixedOffsets: Record<string, number> }

function wallToUtc(t: Extract<IcsTime, { kind: 'wall' }>, ctx: ZoneCtx): number {
  const naive = Date.UTC(t.y, t.m - 1, t.d, t.h, t.mi, t.s);
  if (t.utc) return naive;
  const tzid = t.tz ?? ctx.calendarTz;
  if (!tzid) return naive; // floating time with no calendar zone: best effort, treat as UTC
  const iana = isValidZone(tzid) ? tzid : WINDOWS_TZ[tzid];
  if (iana) {
    const first = naive - tzOffsetMs(naive, iana);
    return naive - tzOffsetMs(first, iana);
  }
  const fixed = ctx.fixedOffsets[tzid];
  return fixed !== undefined ? naive - fixed : naive;
}

// ── Values ───────────────────────────────────────────────────────────────────

function parseTime(prop: Prop): IcsTime | null {
  const v = prop.value.trim();
  if (prop.params.VALUE === 'DATE' || /^\d{8}$/.test(v)) {
    const m = v.match(/^(\d{4})(\d{2})(\d{2})/);
    return m ? { kind: 'date', y: +m[1], m: +m[2], d: +m[3] } : null;
  }
  const m = v.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z)?$/);
  if (!m) return null;
  return { kind: 'wall', y: +m[1], m: +m[2], d: +m[3], h: +m[4], mi: +m[5], s: +m[6], tz: prop.params.TZID, utc: !!m[7] };
}

function timeToMs(t: IcsTime, ctx: ZoneCtx): number {
  return t.kind === 'date' ? Date.UTC(t.y, t.m - 1, t.d) : wallToUtc(t, ctx);
}

function parseDuration(v: string): number {
  const m = v.match(/^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  const ms = (+(m[2] ?? 0)) * 7 * 864e5 + (+(m[3] ?? 0)) * 864e5 + (+(m[4] ?? 0)) * 36e5 + (+(m[5] ?? 0)) * 6e4 + (+(m[6] ?? 0)) * 1e3;
  return sign * ms;
}

function parseOffset(v: string): number | undefined {
  const m = v.match(/^([+-])(\d{2})(\d{2})/);
  if (!m) return undefined;
  return (m[1] === '-' ? -1 : 1) * ((+m[2]) * 36e5 + (+m[3]) * 6e4);
}

// ── Parse a feed ─────────────────────────────────────────────────────────────

function parseFeed(text: string): { events: Parsed[]; ctx: ZoneCtx } {
  const lines = unfold(text);
  const ctx: ZoneCtx = { fixedOffsets: {} };
  const raw: Props[] = [];
  let current: Props | null = null;
  let depth = 0;           // nesting inside a VEVENT (VALARM etc.)
  let tzBlock: { id?: string; std?: number; any?: number } | null = null;
  let tzSub = '';

  for (const line of lines) {
    if (!line) continue;
    const p = parseLine(line);
    if (!p) continue;
    if (p.name === 'BEGIN') {
      const what = p.value.toUpperCase();
      if (what === 'VEVENT' && !current) { current = {}; depth = 0; continue; }
      if (current) { depth++; continue; }
      if (what === 'VTIMEZONE') { tzBlock = {}; continue; }
      if (tzBlock) { tzSub = what; continue; }
      continue;
    }
    if (p.name === 'END') {
      const what = p.value.toUpperCase();
      if (current) {
        if (depth > 0) { depth--; continue; }
        if (what === 'VEVENT') { raw.push(current); current = null; }
        continue;
      }
      if (tzBlock && what === 'VTIMEZONE') {
        const off = tzBlock.std ?? tzBlock.any;
        if (tzBlock.id && off !== undefined) ctx.fixedOffsets[tzBlock.id] = off;
        tzBlock = null; continue;
      }
      if (tzBlock) { tzSub = ''; continue; }
      continue;
    }
    if (current) {
      if (depth > 0) continue;
      (current[p.name] ??= []).push({ value: p.value, params: p.params });
      continue;
    }
    if (tzBlock) {
      if (p.name === 'TZID') tzBlock.id = p.value;
      if (p.name === 'TZOFFSETTO') {
        const off = parseOffset(p.value);
        if (off !== undefined) { tzBlock.any ??= off; if (tzSub === 'STANDARD') tzBlock.std = off; }
      }
      continue;
    }
    if (p.name === 'X-WR-TIMEZONE' && p.value) ctx.calendarTz = p.value.trim();
  }

  const events: Parsed[] = [];
  for (const props of raw) {
    const dtstart = props.DTSTART?.[0];
    const start = dtstart ? parseTime(dtstart) : null;
    if (!start) continue;
    const allDay = start.kind === 'date';
    const startMs = timeToMs(start, ctx);

    let durationMs = allDay ? 864e5 : 0;
    const dtend = props.DTEND?.[0];
    const endT = dtend ? parseTime(dtend) : null;
    if (endT) durationMs = Math.max(0, timeToMs(endT, ctx) - startMs);
    else if (props.DURATION?.[0]) durationMs = Math.max(0, parseDuration(props.DURATION[0].value.trim()));

    let rrule: Record<string, string> | undefined;
    if (props.RRULE?.[0]) {
      rrule = {};
      for (const kv of props.RRULE[0].value.split(';')) {
        const [k, v] = kv.split('=');
        if (k && v) rrule[k.toUpperCase()] = v.toUpperCase();
      }
    }

    const exdates: number[] = [];
    for (const ex of props.EXDATE ?? []) {
      for (const piece of ex.value.split(',')) {
        const t = parseTime({ value: piece, params: ex.params });
        if (t) exdates.push(timeToMs(t, ctx));
      }
    }

    const rid = props['RECURRENCE-ID']?.[0];
    const ridT = rid ? parseTime(rid) : null;

    events.push({
      uid: props.UID?.[0]?.value ?? `${startMs}-${props.SUMMARY?.[0]?.value ?? ''}`,
      title: unescapeText(props.SUMMARY?.[0]?.value ?? '(No title)') || '(No title)',
      location: props.LOCATION?.[0] ? unescapeText(props.LOCATION[0].value) || undefined : undefined,
      start, durationMs, allDay, rrule, exdates,
      recurrenceId: ridT ? timeToMs(ridT, ctx) : undefined,
      cancelled: (props.STATUS?.[0]?.value ?? '').toUpperCase() === 'CANCELLED',
    });
  }
  return { events, ctx };
}

// ── Recurrence expansion (in the event's own wall-clock, so DST is respected) ──

const DAY_CODES = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];

function ymd(ms: number) { const d = new Date(ms); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), dow: d.getUTCDay() }; }
function daysInMonth(y: number, m: number) { return new Date(Date.UTC(y, m, 0)).getUTCDate(); }

function parseByDay(v?: string): { n: number; dow: number }[] {
  if (!v) return [];
  return v.split(',').map(tok => {
    const m = tok.match(/^([+-]?\d+)?(SU|MO|TU|WE|TH|FR|SA)$/);
    return m ? { n: m[1] ? parseInt(m[1], 10) : 0, dow: DAY_CODES.indexOf(m[2]) } : null;
  }).filter((x): x is { n: number; dow: number } => !!x);
}

// Days (UTC-midnight ms) in month y/m matching BYDAY / BYMONTHDAY, or the given fallback day
function monthDays(y: number, m: number, byDay: { n: number; dow: number }[], byMonthDay: number[], fallbackDay: number): number[] {
  const dim = daysInMonth(y, m);
  const out = new Set<number>();
  if (byMonthDay.length) {
    for (const md of byMonthDay) {
      const day = md > 0 ? md : dim + md + 1;
      if (day >= 1 && day <= dim) out.add(Date.UTC(y, m - 1, day));
    }
  }
  if (byDay.length) {
    for (const { n, dow } of byDay) {
      const matches: number[] = [];
      for (let day = 1; day <= dim; day++) if (new Date(Date.UTC(y, m - 1, day)).getUTCDay() === dow) matches.push(day);
      if (n === 0) matches.forEach(day => out.add(Date.UTC(y, m - 1, day)));
      else {
        const day = n > 0 ? matches[n - 1] : matches[matches.length + n];
        if (day) out.add(Date.UTC(y, m - 1, day));
      }
    }
  }
  if (!byMonthDay.length && !byDay.length && fallbackDay <= dim) out.add(Date.UTC(y, m - 1, fallbackDay));
  return Array.from(out).sort((a, b) => a - b);
}

// Expand a recurring event into the UTC start instants of its occurrences up to `untilMs`
function expandStarts(ev: Parsed, ctx: ZoneCtx, rangeEndMs: number): number[] {
  const r = ev.rrule!;
  const freq = r.FREQ;
  const interval = Math.max(1, parseInt(r.INTERVAL ?? '1', 10) || 1);
  const count = r.COUNT ? parseInt(r.COUNT, 10) : undefined;
  let untilMs: number | undefined;
  if (r.UNTIL) {
    const t = parseTime({ value: r.UNTIL, params: {} });
    if (t) untilMs = t.kind === 'date' ? Date.UTC(t.y, t.m - 1, t.d) + 864e5 - 1 : wallToUtc({ ...t, tz: t.utc ? undefined : (ev.start.kind === 'wall' ? ev.start.tz : undefined) }, ctx);
  }
  const byDay = parseByDay(r.BYDAY);
  const byMonthDay = (r.BYMONTHDAY ?? '').split(',').filter(Boolean).map(Number).filter(n => !isNaN(n));
  const byMonth = (r.BYMONTH ?? '').split(',').filter(Boolean).map(Number).filter(n => n >= 1 && n <= 12);

  const s = ev.start;
  const base = Date.UTC(s.y, s.m - 1, s.d);
  const startDay = ymd(base);
  const toUtc = (dayMs: number) => {
    const d = ymd(dayMs);
    return s.kind === 'date' ? dayMs : wallToUtc({ ...s, y: d.y, m: d.m, d: d.d }, ctx);
  };
  const firstUtc = toUtc(base);

  const out: number[] = [];
  let emitted = 0;
  const emit = (dayMs: number): boolean => {        // returns false to stop
    if (dayMs < base) return true;
    const utc = toUtc(dayMs);
    if (untilMs !== undefined && utc > untilMs) return false;
    if (count !== undefined && emitted >= count) return false;
    emitted++;
    if (utc > rangeEndMs) return false;
    out.push(utc);
    return true;
  };

  const MAX_PERIODS = 4000;
  if (freq === 'DAILY') {
    for (let k = 0; k < MAX_PERIODS * 3; k++) {
      const day = base + k * interval * 864e5;
      const d = ymd(day);
      if (byDay.length && !byDay.some(b => b.dow === d.dow)) continue;
      if (byMonth.length && !byMonth.includes(d.m)) continue;
      if (!emit(day)) break;
    }
  } else if (freq === 'WEEKLY') {
    const days = (byDay.length ? byDay.map(b => b.dow) : [startDay.dow]);
    const weekStart = base - ((startDay.dow + 6) % 7) * 864e5;   // Monday of the first week
    const offsets = Array.from(new Set(days.map(dow => (dow + 6) % 7))).sort((a, b) => a - b);
    outer: for (let k = 0; k < MAX_PERIODS; k++) {
      const ws = weekStart + k * interval * 7 * 864e5;
      for (const off of offsets) if (!emit(ws + off * 864e5)) break outer;
    }
  } else if (freq === 'MONTHLY') {
    outer: for (let k = 0; k < MAX_PERIODS; k++) {
      const mIdx = (startDay.m - 1) + k * interval;
      const y = startDay.y + Math.floor(mIdx / 12);
      const m = (mIdx % 12) + 1;
      if (byMonth.length && !byMonth.includes(m)) continue;
      for (const day of monthDays(y, m, byDay, byMonthDay, startDay.d)) if (!emit(day)) break outer;
    }
  } else if (freq === 'YEARLY') {
    outer: for (let k = 0; k < MAX_PERIODS; k++) {
      const y = startDay.y + k * interval;
      const months = byMonth.length ? byMonth : [startDay.m];
      for (const m of months) {
        const useMonthRules = byMonth.length > 0 || byDay.length > 0 || byMonthDay.length > 0;
        const days = useMonthRules ? monthDays(y, m, byDay, byMonthDay, startDay.d) : (startDay.d <= daysInMonth(y, m) ? [Date.UTC(y, m - 1, startDay.d)] : []);
        for (const day of days) if (!emit(day)) break outer;
      }
    }
  } else {
    return [firstUtc];
  }
  return out;
}

// ── Public API ───────────────────────────────────────────────────────────────

export function isCalendarText(text: string): boolean {
  return /BEGIN:VCALENDAR/i.test(text.slice(0, 2000));
}

// All occurrences overlapping [fromMs, toMs)
export function occurrencesInRange(text: string, fromMs: number, toMs: number): CalendarOccurrence[] {
  const { events, ctx } = parseFeed(text);
  const overrides = new Map<string, Parsed>();
  for (const e of events) if (e.recurrenceId !== undefined) overrides.set(`${e.uid}|${e.recurrenceId}`, e);

  const out: CalendarOccurrence[] = [];
  const push = (e: Parsed, startMs: number) => {
    if (e.cancelled) return;
    const endMs = startMs + (e.durationMs || (e.allDay ? 864e5 : 0));
    if (!(startMs < toMs && Math.max(endMs, startMs + 1) > fromMs)) return;
    const occ: CalendarOccurrence = { uid: e.uid, title: e.title, location: e.location, allDay: e.allDay, startMs, endMs };
    if (e.allDay) {
      occ.startDate = new Date(startMs).toISOString().slice(0, 10);
      occ.endDate = new Date(Math.max(endMs, startMs + 864e5)).toISOString().slice(0, 10);
    }
    out.push(occ);
  };

  for (const e of events) {
    if (e.recurrenceId !== undefined) { push(e, timeToMs(e.start, ctx)); continue; }
    if (!e.rrule) { push(e, timeToMs(e.start, ctx)); continue; }
    const exSet = new Set(e.exdates);
    for (const startMs of expandStarts(e, ctx, toMs)) {
      if (exSet.has(startMs)) continue;
      if (overrides.has(`${e.uid}|${startMs}`)) continue; // the override is emitted on its own
      push(e, startMs);
    }
  }
  return out.sort((a, b) => a.startMs - b.startMs);
}
