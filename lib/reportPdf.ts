// The weekly report as a downloadable PDF (built with lib/pdf, no libraries).

import { A4, PdfDoc, RGB, hexToRgb, mix } from './pdf';
import { WeeklyReport } from './report';

const INK: RGB = [0.17, 0.15, 0.13];
const MUTED: RGB = [0.42, 0.39, 0.35];
const FAINT: RGB = [0.62, 0.58, 0.53];
const RULE: RGB = [0.89, 0.86, 0.82];
const TRACK: RGB = [0.92, 0.9, 0.86];
const WHITE: RGB = [1, 1, 1];
const GOOD: RGB = [0.33, 0.45, 0.31];
const WATCH: RGB = [0.55, 0.38, 0.16];
const BAD: RGB = [0.58, 0.31, 0.27];

const M = 48;                 // page margin
const W = A4.w - M * 2;       // content width
const BOTTOM = A4.h - 56;     // last usable baseline before the footer

const fmtHours = (mins: number) => (mins / 60 < 10 ? `${Math.round(mins / 6) / 10} h` : `${Math.round(mins / 60)} h`);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildReportPdf(r: WeeklyReport, opts: { accentHex?: string; generatedAt?: Date; workspace?: string } = {}): Uint8Array {
  const accent = hexToRgb(opts.accentHex ?? '', [0.51, 0.42, 0.31]);
  const doc = new PdfDoc();
  const generated = (opts.generatedAt ?? new Date()).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  let y = M;

  const newPage = () => { doc.addPage(); y = M; };
  const ensure = (h: number) => { if (y + h > BOTTOM) newPage(); };
  // `need` = room for the first block of content, so a heading never sits alone at a page end
  const heading = (t: string, sub?: string, need = 60) => {
    ensure((sub ? 48 : 34) + need);
    y += 10;
    doc.text(M, y + 12, t, { size: 13, bold: true, color: INK });
    y += 18;
    if (sub) { doc.text(M, y + 9, sub, { size: 8.5, color: MUTED }); y += 14; }
    y += 4;
  };

  // ── Title ──
  doc.rect(M, y, W, 3, accent);
  y += 22;
  doc.text(M, y, `${opts.workspace ?? 'Workspace'} · Weekly report`, { size: 9, bold: true, color: accent });
  doc.text(M + W, y, `Generated ${generated}`, { size: 8.5, color: MUTED, align: 'right' });
  y += 28;
  doc.text(M, y, `Week of ${r.label}`, { size: 24, bold: true, color: INK });
  y += 18;
  doc.text(M, y, r.partial ? 'This week so far (in progress)' : `${r.start} to ${r.end}`, { size: 9.5, color: MUTED });
  y += 20;

  // ── Headline numbers: 3 x 2 tiles ──
  const tiles: { label: string; value: string; sub: string; delta?: { text: string; good: boolean | null } }[] = [
    { label: 'FINISHED', value: String(r.done), sub: r.extraDone ? `${r.donePlanned} planned + ${r.extraDone} unplanned` : 'tasks done',
      delta: r.prevDone > 0 ? { text: r.done === r.prevDone ? 'same as last week' : `${r.done > r.prevDone ? '+' : '−'}${Math.abs(r.done - r.prevDone)} vs last week`, good: r.done === r.prevDone ? null : r.done > r.prevDone } : undefined },
    { label: 'PLAN COMPLETED', value: r.rate === null ? '—' : `${r.rate}%`, sub: r.planned ? `${r.donePlanned} of ${r.planned} planned` : 'nothing planned',
      delta: r.rate !== null && r.prevRate !== null ? { text: r.rate === r.prevRate ? 'same as last week' : `${r.rate > r.prevRate ? '+' : '−'}${Math.abs(r.rate - r.prevRate)} pts vs last week`, good: r.rate === r.prevRate ? null : r.rate > r.prevRate } : undefined },
    { label: 'DEADLINES ON TIME', value: r.onTimeRate === null ? '—' : `${r.onTimeRate}%`, sub: r.dueInWeek ? `${r.onTime} on time · ${r.late} late · ${r.missed} missed` : 'no deadlines this week' },
    { label: 'MEETINGS', value: String(r.meetings), sub: r.meetingMins ? `${fmtHours(r.meetingMins)} in calendar meetings` : 'meetings this week',
      delta: r.prevMeetings > 0 ? { text: r.meetings === r.prevMeetings ? 'same as last week' : `${r.meetings > r.prevMeetings ? '+' : '−'}${Math.abs(r.meetings - r.prevMeetings)} vs last week`, good: r.meetings === r.prevMeetings ? null : r.meetings < r.prevMeetings } : undefined },
    { label: 'OVERDUE NOW', value: String(r.overdueNow), sub: r.overdueNow ? `${r.highOverdue} high priority${r.oldestOverdueDays ? ` · oldest ${r.oldestOverdueDays} days` : ''}` : 'all on track' },
    { label: 'WEEKLY PRIORITIES', value: r.goalsTotal ? `${r.goalsDone}/${r.goalsTotal}` : '—', sub: r.goalsTotal ? 'set in the planner' : 'none set in the planner' },
  ];
  const gap = 10, tw = (W - gap * 2) / 3, th = 70;
  tiles.forEach((t, i) => {
    const cx = M + (i % 3) * (tw + gap), cy = y + Math.floor(i / 3) * (th + gap);
    doc.roundRect(cx, cy, tw, th, WHITE, 6, RULE);
    doc.text(cx + 10, cy + 16, t.label, { size: 7, bold: true, color: MUTED });
    doc.text(cx + 10, cy + 39, t.value, { size: 20, bold: true, color: t.label === 'OVERDUE NOW' && r.overdueNow ? BAD : INK });
    doc.text(cx + 10, cy + 52, doc.fit(t.sub, tw - 20, 7.5), { size: 7.5, color: MUTED });
    if (t.delta) doc.text(cx + 10, cy + 63, t.delta.text, { size: 7.5, color: t.delta.good === null ? FAINT : t.delta.good ? GOOD : BAD });
  });
  y += th * 2 + gap + 8;

  // ── What stood out ──
  heading('What stood out');
  r.insights.forEach(i => {
    const tag = i.tone === 'good' ? 'WIN' : i.tone === 'watch' ? 'WATCH' : 'NOTE';
    const tagCol = i.tone === 'good' ? GOOD : i.tone === 'watch' ? WATCH : MUTED;
    const lines = doc.wrap(i.text, W - 58, 9.5);
    ensure(lines.length * 13 + 6);
    doc.roundRect(M, y + 1, 44, 13, mix(tagCol, WHITE, 0.84), 6);
    doc.text(M + 22, y + 10.5, tag, { size: 6.5, bold: true, color: tagCol, align: 'center' });
    lines.forEach((l, k) => doc.text(M + 54, y + 11 + k * 13, l, { size: 9.5, color: INK }));
    y += lines.length * 13 + 6;
  });

  // ── Column chart helper (single colour + neutral track, thin bars, labels below) ──
  const columns = (items: { label: string; sub?: string; value: number; track?: number; highlight?: boolean }[], h: number, opts2: { showValue?: (i: number) => boolean } = {}) => {
    ensure(h + 40);
    const max = Math.max(1, ...items.map(i => Math.max(i.value, i.track ?? 0)));
    const slot = W / items.length;
    const bw = Math.min(22, slot * 0.55);
    const base = y + h;
    [0.5, 1].forEach(f => doc.line(M, base - h * f, M + W, base - h * f, [0.95, 0.93, 0.9], 0.5));
    doc.text(M - 4, base - h + 3, String(max), { size: 7, color: FAINT, align: 'right' });
    items.forEach((it, i) => {
      const cx = M + slot * i + slot / 2;
      if (it.track) doc.bar(cx - bw / 2, base - (it.track / max) * h, bw, (it.track / max) * h, TRACK, 3);
      const vh = (it.value / max) * h;
      doc.bar(cx - bw / 2, base - vh, bw, vh, it.highlight === false ? mix(accent, WHITE, 0.55) : accent, 3);
      if (opts2.showValue?.(i) && it.value > 0) doc.text(cx, base - Math.max(vh, ((it.track ?? 0) / max) * h) - 4, String(it.value), { size: 8, bold: true, color: INK, align: 'center' });
      doc.text(cx, base + 12, it.label, { size: 7.5, color: MUTED, align: 'center' });
      if (it.sub) doc.text(cx, base + 22, it.sub, { size: 7, color: FAINT, align: 'center' });
    });
    doc.line(M, base, M + W, base, RULE, 0.75);
    y = base + (items.some(i => i.sub) ? 30 : 20);
  };
  const legend = (entries: { label: string; color: RGB }[]) => {
    y += 4;
    let x = M;
    entries.forEach(e => {
      doc.roundRect(x, y - 7, 8, 8, e.color, 2);
      doc.text(x + 12, y, e.label, { size: 8, color: MUTED });
      x += 22 + doc.textWidth(e.label, 8);
    });
    y += 14;
  };

  // ── Day by day ──
  heading('Day by day', 'Tasks done against the day’s plan, with meetings underneath', 170);
  legend([{ label: 'Done', color: accent }, { label: 'Planned', color: TRACK }]);
  const best = r.days.reduce((b, d, i) => (d.done > r.days[b].done ? i : b), 0);
  columns(r.days.map(d => ({ label: d.label, sub: d.meetings ? `${d.meetings} mtg` : '', value: d.done, track: d.planned })), 110, { showValue: i => i === best });

  // ── 8 weeks ──
  heading('Last 8 weeks', `Tasks finished per week${r.avgDone ? `; your recent average is ${r.avgDone}` : ''}`, 140);
  columns(r.trend.map((w, i) => ({ label: w.label.split(/[– ]/).slice(0, 2).join(' '), sub: w.rate !== null ? `${w.rate}%` : '', value: w.done, highlight: i === r.trend.length - 1 })), 90, { showValue: i => i === r.trend.length - 1 });

  // ── Projects table ──
  heading('Projects', 'What moved this week, and what has gone quiet');
  const cols = [{ t: 'Project', x: 0 }, { t: 'Done', x: 225 }, { t: 'Open', x: 270 }, { t: 'Overdue', x: 312 }, { t: 'Last activity', x: 365 }];
  ensure(30);
  cols.forEach(c => doc.text(M + c.x, y + 8, c.t.toUpperCase(), { size: 7, bold: true, color: MUTED }));
  y += 13;
  doc.line(M, y, M + W, y, accent, 1);
  r.projects.forEach(p => {
    ensure(18);
    y += 15;
    doc.circle(M + 4, y - 3, 3.2, hexToRgb(p.color, accent));
    doc.text(M + 12, y, doc.fit(p.name, 205, 9), { size: 9, color: INK });
    doc.text(M + 225, y, String(p.done), { size: 9, bold: p.done > 0, color: INK });
    doc.text(M + 270, y, String(p.open), { size: 9, color: INK });
    doc.text(M + 312, y, String(p.overdue), { size: 9, bold: p.overdue > 0, color: p.overdue ? BAD : INK });
    const last = p.daysSince === null ? 'no completions yet' : p.daysSince === 0 ? 'today' : `${p.daysSince} day${p.daysSince !== 1 ? 's' : ''} ago`;
    doc.text(M + 365, y, last, { size: 9, color: p.daysSince === null ? FAINT : INK });
    if (p.stalled) {
      const lx = Math.min(M + 365 + doc.textWidth(last, 9) + 8, M + W - 40);
      doc.roundRect(lx, y - 9, 40, 12, mix(WATCH, WHITE, 0.84), 6);
      doc.text(lx + 20, y - 0.5, 'STALLED', { size: 6.5, bold: true, color: WATCH, align: 'center' });
    }
    y += 4;
    doc.line(M, y, M + W, y, RULE, 0.5);
  });
  y += 6;

  // ── Horizontal bar list helper ──
  const hbars = (rows: { label: string; value: number; track?: number; note: string }[]) => {
    const max = Math.max(1, ...rows.map(r2 => Math.max(r2.value, r2.track ?? 0)));
    const barW = W - 250;
    rows.forEach(row => {
      ensure(18);
      doc.text(M, y + 9, doc.fit(cap(row.label), 110, 9), { size: 9, color: INK });
      if (row.track) doc.rect(M + 120, y + 2, (row.track / max) * barW, 9, TRACK);
      doc.rect(M + 120, y + 2, (row.value / max) * barW, 9, accent);
      doc.text(M + W, y + 9, row.note, { size: 8.5, color: MUTED, align: 'right' });
      y += 17;
    });
  };

  heading('By priority', 'Project tasks finished this week, and still open', 80);
  hbars(r.byPriority.map(p => ({ label: p.priority, value: p.done, track: p.open, note: `${p.done} finished / ${p.open} open` })));
  y += 10;
  legend([{ label: 'Finished', color: accent }, { label: 'Open', color: TRACK }]);

  heading('Where your effort went', 'Finished this week, by planner category');
  if (r.byCategory.length) hbars(r.byCategory.map(c => ({ label: c.name, value: c.done, note: String(c.done) })));
  else { doc.text(M, y + 9, 'Nothing finished this week.', { size: 9, color: MUTED }); y += 18; }

  heading('When you get things done', 'Tasks ticked off by time of day, last 8 weeks', r.hoursSample >= 10 ? 120 : 20);
  if (r.hoursSample >= 10) {
    columns(r.hours.map(h => ({ label: h.label.split('–')[0], value: h.count })), 70);
    y += 6;
    doc.text(M, y, `${r.hoursSample} timed completions`, { size: 8, color: FAINT });
    y += 10;
  } else {
    doc.text(M, y + 9, `Not enough history yet (${r.hoursSample} timed completions). This fills in as you tick things off.`, { size: 9, color: MUTED });
    y += 18;
  }

  // ── Carried over ──
  if (r.carryOver.length) {
    heading(r.partial ? `Still open this week (${r.carryOver.length})` : `Carried over (${r.carryOver.length})`, 'Planned for the week but not done');
    r.carryOver.slice(0, 18).forEach(c => {
      ensure(15);
      const d = new Date(c.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
      doc.text(M, y + 9, d, { size: 8.5, color: MUTED });
      doc.text(M + 50, y + 9, doc.fit(c.title, c.project ? 300 : W - 50, 9), { size: 9, color: INK });
      if (c.project) doc.text(M + W, y + 9, doc.fit(c.project, 140, 8.5), { size: 8.5, color: MUTED, align: 'right' });
      y += 14;
    });
    if (r.carryOver.length > 18) { doc.text(M, y + 9, `and ${r.carryOver.length - 18} more`, { size: 8.5, color: FAINT }); y += 14; }
  }

  // ── How it's counted ──
  const note = 'How this is counted: finished = planner tasks ticked off plus project tasks completed that week. Plan completed = the share of the week’s planned tasks that got done. Project tasks finished before completion times were recorded count on their planned day. Meetings include planner meetings and events from your connected calendars.';
  const noteLines = doc.wrap(note, W, 7.5);
  ensure(noteLines.length * 10 + 20);
  y += 14;
  noteLines.forEach((l, k) => doc.text(M, y + k * 10, l, { size: 7.5, color: FAINT }));

  return doc.toBytes(`Weekly report ${r.label}`);
}

// Footer page numbers are left out on purpose: the writer has no second pass, and a two-page
// report reads fine without them.

export function saveBytes(bytes: Uint8Array, filename: string) {
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
