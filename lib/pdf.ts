// A small, dependency-free PDF writer: A4 pages, Helvetica text, filled rectangles and lines.
// Enough for the weekly report; coordinates are in points from the top-left of the page.

export type RGB = [number, number, number]; // 0–1 each

export const A4 = { w: 595.28, h: 841.89 };

// Helvetica advance widths (per 1000 em) for ASCII 32–126
const HELV = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
const HELV_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];

// Characters outside ASCII that WinAnsi (the standard fonts' encoding) can show
const WIN: Record<string, number> = {
  '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97,
  '…': 0x85, '€': 0x80, '™': 0x99, '·': 0xb7, '°': 0xb0, 'é': 0xe9, 'è': 0xe8,
  'à': 0xe0, 'ñ': 0xf1, 'ü': 0xfc, 'ö': 0xf6, 'ä': 0xe4, 'ç': 0xe7, ' ': 0x20,
  '↑': 0x5e, '↓': 0x76, '▲': 0x5e, '▼': 0x76,
};

function charCode(ch: string): number {
  const c = ch.charCodeAt(0);
  if (c >= 32 && c <= 126) return c;
  if (WIN[ch] !== undefined) return WIN[ch];
  if (c >= 0xa0 && c <= 0xff) return c;
  return 0x3f; // '?'
}

function charWidth(code: number, bold: boolean): number {
  const t = bold ? HELV_BOLD : HELV;
  if (code >= 32 && code <= 126) return t[code - 32];
  if (code === 0x91 || code === 0x92) return 222;
  if (code === 0x93 || code === 0x94) return 333;
  if (code === 0x96) return 556;
  if (code === 0x97) return 1000;
  if (code === 0x85) return 1000;
  if (code === 0x95 || code === 0xb7) return 350;
  return 556;
}

function encode(s: string): string {
  let out = '';
  for (const ch of Array.from(s)) {
    const c = charCode(ch);
    if (c === 0x28 || c === 0x29 || c === 0x5c) out += '\\' + String.fromCharCode(c);
    else if (c < 32 || c > 126) out += '\\' + c.toString(8).padStart(3, '0');
    else out += String.fromCharCode(c);
  }
  return out;
}

const n = (v: number) => (Math.round(v * 100) / 100).toString();
const col = (c: RGB) => c.map(v => n(Math.max(0, Math.min(1, v)))).join(' ');

export interface TextOpts { size?: number; bold?: boolean; color?: RGB; align?: 'left' | 'right' | 'center' }

export class PdfDoc {
  private pages: string[][] = [];
  private cur: string[] = [];

  constructor() { this.addPage(); }

  addPage() {
    this.cur = [];
    this.pages.push(this.cur);
  }

  get pageCount() { return this.pages.length; }

  textWidth(s: string, size = 10, bold = false): number {
    let w = 0;
    for (const ch of Array.from(s)) w += charWidth(charCode(ch), bold);
    return (w / 1000) * size;
  }

  // y is the text baseline, measured from the top of the page
  text(x: number, y: number, s: string, o: TextOpts = {}) {
    const size = o.size ?? 10;
    const bold = !!o.bold;
    let tx = x;
    if (o.align === 'right') tx = x - this.textWidth(s, size, bold);
    if (o.align === 'center') tx = x - this.textWidth(s, size, bold) / 2;
    this.cur.push(`BT /${bold ? 'F2' : 'F1'} ${n(size)} Tf ${col(o.color ?? [0.17, 0.15, 0.13])} rg ${n(tx)} ${n(A4.h - y)} Td (${encode(s)}) Tj ET`);
  }

  // Cut a string to fit a width, adding an ellipsis
  fit(s: string, maxW: number, size = 10, bold = false): string {
    if (this.textWidth(s, size, bold) <= maxW) return s;
    let t = s;
    while (t.length > 1 && this.textWidth(t + '…', size, bold) > maxW) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  wrap(s: string, maxW: number, size = 10, bold = false): string[] {
    const words = s.split(/\s+/).filter(Boolean);
    const lines: string[] = [];
    let line = '';
    for (const w of words) {
      const next = line ? `${line} ${w}` : w;
      if (this.textWidth(next, size, bold) <= maxW || !line) line = next;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  rect(x: number, y: number, w: number, h: number, fill: RGB) {
    if (w <= 0 || h <= 0) return;
    this.cur.push(`${col(fill)} rg ${n(x)} ${n(A4.h - y - h)} ${n(w)} ${n(h)} re f`);
  }

  // Rectangle with the top corners rounded (bars), radius r
  bar(x: number, y: number, w: number, h: number, fill: RGB, r = 2) {
    if (w <= 0 || h <= 0) return;
    const rr = Math.min(r, w / 2, h);
    const k = 0.5523 * rr;
    const X = x, Y = A4.h - y - h, T = A4.h - y;   // bottom-left origin
    this.cur.push([
      `${col(fill)} rg`,
      `${n(X)} ${n(Y)} m`,
      `${n(X)} ${n(T - rr)} l`,
      `${n(X)} ${n(T - rr + k)} ${n(X + rr - k)} ${n(T)} ${n(X + rr)} ${n(T)} c`,
      `${n(X + w - rr)} ${n(T)} l`,
      `${n(X + w - rr + k)} ${n(T)} ${n(X + w)} ${n(T - rr + k)} ${n(X + w)} ${n(T - rr)} c`,
      `${n(X + w)} ${n(Y)} l h f`,
    ].join(' '));
  }

  roundRect(x: number, y: number, w: number, h: number, fill: RGB, r = 6, stroke?: RGB) {
    const k = 0.5523 * r;
    const X = x, Y = A4.h - y - h, R = x + w, T = A4.h - y;
    const path = [
      `${n(X + r)} ${n(Y)} m`, `${n(R - r)} ${n(Y)} l`,
      `${n(R - r + k)} ${n(Y)} ${n(R)} ${n(Y + r - k)} ${n(R)} ${n(Y + r)} c`,
      `${n(R)} ${n(T - r)} l`,
      `${n(R)} ${n(T - r + k)} ${n(R - r + k)} ${n(T)} ${n(R - r)} ${n(T)} c`,
      `${n(X + r)} ${n(T)} l`,
      `${n(X + r - k)} ${n(T)} ${n(X)} ${n(T - r + k)} ${n(X)} ${n(T - r)} c`,
      `${n(X)} ${n(Y + r)} l`,
      `${n(X)} ${n(Y + r - k)} ${n(X + r - k)} ${n(Y)} ${n(X + r)} ${n(Y)} c h`,
    ].join(' ');
    this.cur.push(stroke ? `${col(fill)} rg ${col(stroke)} RG 0.75 w ${path} B` : `${col(fill)} rg ${path} f`);
  }

  line(x1: number, y1: number, x2: number, y2: number, color: RGB, width = 0.75) {
    this.cur.push(`${col(color)} RG ${n(width)} w ${n(x1)} ${n(A4.h - y1)} m ${n(x2)} ${n(A4.h - y2)} l S`);
  }

  circle(cx: number, cy: number, r: number, fill: RGB) {
    const k = 0.5523 * r, X = cx, Y = A4.h - cy;
    this.cur.push(`${col(fill)} rg ${n(X + r)} ${n(Y)} m ${n(X + r)} ${n(Y + k)} ${n(X + k)} ${n(Y + r)} ${n(X)} ${n(Y + r)} c ${n(X - k)} ${n(Y + r)} ${n(X - r)} ${n(Y + k)} ${n(X - r)} ${n(Y)} c ${n(X - r)} ${n(Y - k)} ${n(X - k)} ${n(Y - r)} ${n(X)} ${n(Y - r)} c ${n(X + k)} ${n(Y - r)} ${n(X + r)} ${n(Y - k)} ${n(X + r)} ${n(Y)} c f`);
  }

  // Serialise to PDF bytes (every character is a single byte by construction)
  toBytes(title = 'Report'): Uint8Array {
    const objs: string[] = [];
    const pageIds: number[] = [];
    // 1 catalog, 2 pages, 3 Helvetica, 4 Helvetica-Bold, 5 info, then page + content pairs
    const firstPage = 6;
    this.pages.forEach((_, i) => pageIds.push(firstPage + i * 2));
    objs[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
    objs[2] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${this.pages.length} >>`;
    objs[3] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objs[4] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;
    objs[5] = `<< /Title (${encode(title)}) /Producer (OyinT's Workspace) >>`;
    this.pages.forEach((ops, i) => {
      const pid = firstPage + i * 2, cid = pid + 1;
      const stream = ops.join('\n');
      objs[pid] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${n(A4.w)} ${n(A4.h)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cid} 0 R >>`;
      objs[cid] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
    });
    let out = '%PDF-1.4\n%âãÏÓ\n';
    const offsets: number[] = [];
    for (let i = 1; i < objs.length; i++) {
      offsets[i] = out.length;
      out += `${i} 0 obj\n${objs[i]}\nendobj\n`;
    }
    const xref = out.length;
    out += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
    for (let i = 1; i < objs.length; i++) out += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    out += `trailer\n<< /Size ${objs.length} /Root 1 0 R /Info 5 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
    const bytes = new Uint8Array(out.length);
    for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
    return bytes;
  }
}

export function hexToRgb(hex: string, fallback: RGB): RGB {
  const s = hex.trim();
  const m = s.match(/^#?([0-9a-f]{6})$/i);
  if (m) {
    const v = parseInt(m[1], 16);
    return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255];
  }
  const r = s.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/i);
  if (r) return [Number(r[1]) / 255, Number(r[2]) / 255, Number(r[3]) / 255];
  return fallback;
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
