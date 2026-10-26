// Your own order for a day's tasks (Today's plan and the planner's day lists).
// Stored per day as item keys: 'e:<plannerEventId>' or 't:<projectTaskId>'.
// Items you haven't placed keep their usual order after the placed ones; done items sink.

export type DayOrder = Record<string, string[]>;

export const eventKey = (id: string) => `e:${id}`;
export const taskKey = (id: string) => `t:${id}`;

export function applyDayOrder<T>(items: T[], keyOf: (t: T) => string, isDone: (t: T) => boolean, saved?: string[]): T[] {
  const pos = new Map((saved ?? []).map((k, i) => [k, i] as [string, number]));
  const open = items
    .map((t, i) => ({ t, i, p: pos.get(keyOf(t)) }))
    .filter(x => !isDone(x.t))
    .sort((a, b) => {
      if (a.p != null && b.p != null) return a.p - b.p;
      if (a.p != null) return -1;
      if (b.p != null) return 1;
      return a.i - b.i;
    })
    .map(x => x.t);
  return [...open, ...items.filter(isDone)];
}

// The order a day's tasks take before you've placed them, shared by Today and the planner so their
// numbers always agree: by time (untimed last), then title, then id
export interface DayEntry { key: string; time?: string; title: string; done: boolean }
export function defaultDayCompare(a: { key: string; time?: string; title: string }, b: { key: string; time?: string; title: string }): number {
  return (a.time || '99:99').localeCompare(b.time || '99:99')
    || a.title.localeCompare(b.title)
    || a.key.localeCompare(b.key);
}

// A day's full ordered list (every task on that day, whatever a view hides), done ones last
export function orderDay(entries: DayEntry[], saved?: string[]): DayEntry[] {
  return applyDayOrder([...entries].sort(defaultDayCompare), e => e.key, e => e.done, saved);
}

// New order for a day after putting `key` at `index` among the open items (`openKeys` in current order)
export function placeAt(openKeys: string[], key: string, index: number): string[] {
  const rest = openKeys.filter(k => k !== key);
  const at = Math.max(0, Math.min(index, rest.length));
  return [...rest.slice(0, at), key, ...rest.slice(at)];
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export function isDayOrder(v: unknown): v is DayOrder {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const entries = Object.entries(v as Record<string, unknown>);
  return entries.length <= 120 && entries.every(([d, keys]) =>
    ISO.test(d) && Array.isArray(keys) && keys.length <= 200 &&
    keys.every(k => typeof k === 'string' && k.length <= 80 && /^[et]:/.test(k)));
}

// Keep the stored map small: drop days more than two weeks in the past
export function pruneDayOrder(o: DayOrder, todayIso: string): DayOrder {
  const cutoff = new Date(todayIso + 'T00:00:00');
  cutoff.setDate(cutoff.getDate() - 14);
  const c = `${cutoff.getFullYear()}-${String(cutoff.getMonth() + 1).padStart(2, '0')}-${String(cutoff.getDate()).padStart(2, '0')}`;
  const out: DayOrder = {};
  Object.keys(o).sort().filter(d => d >= c).slice(-120).forEach(d => { if (o[d].length) out[d] = o[d]; });
  return out;
}
