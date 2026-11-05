// Field-level encryption at rest (server side only).
//
// Sensitive text is stored as "enc:v1:<base64(iv | authTag | ciphertext)>" using AES-256-GCM with
// the key in DATA_ENCRYPTION_KEY (32 random bytes, base64). Values without the prefix are treated
// as not-yet-encrypted plaintext and returned as is, so existing data keeps working while the
// one-time backfill (lib/encryptBackfill.ts) converts it.
//
// Generate a key with:  openssl rand -base64 32
// Keep it safe: losing it makes encrypted data unreadable; changing it needs a re-encryption.

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const PREFIX = 'enc:v1:';
const IV_LEN = 12;
const TAG_LEN = 16;

let cachedKey: Buffer | null | undefined;

function key(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey;
  const raw = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (!raw) {
    console.warn('[encryption] DATA_ENCRYPTION_KEY is not set: data is stored WITHOUT field encryption.');
    cachedKey = null;
    return null;
  }
  const buf = Buffer.from(raw, 'base64');
  if (buf.length !== 32) {
    // Fail loudly rather than silently store data under a weak or wrong key
    throw new Error('[encryption] DATA_ENCRYPTION_KEY must be 32 bytes, base64-encoded (openssl rand -base64 32).');
  }
  cachedKey = buf;
  return buf;
}

export function encryptionEnabled(): boolean {
  return key() !== null;
}

export function isEncrypted(v: unknown): v is string {
  return typeof v === 'string' && v.startsWith(PREFIX);
}

export function encryptText(plain: string): string {
  const k = key();
  if (!k || isEncrypted(plain)) return plain;
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', k, iv);
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), ct]).toString('base64');
}

export function decryptText(value: string): string {
  if (!isEncrypted(value)) return value;          // legacy plaintext
  const k = key();
  if (!k) throw new Error('[encryption] Found encrypted data but DATA_ENCRYPTION_KEY is not set.');
  const buf = Buffer.from(value.slice(PREFIX.length), 'base64');
  const decipher = createDecipheriv('aes-256-gcm', k, buf.subarray(0, IV_LEN));
  decipher.setAuthTag(buf.subarray(IV_LEN, IV_LEN + TAG_LEN));
  return Buffer.concat([decipher.update(buf.subarray(IV_LEN + TAG_LEN)), decipher.final()]).toString('utf8');
}

// JSON columns: the whole value is serialised, encrypted, and stored as a JSON string
export function encryptJson(value: unknown): unknown {
  if (!encryptionEnabled() || isEncrypted(value)) return value;
  return encryptText(JSON.stringify(value ?? null));
}

export function decryptJson(value: unknown): unknown {
  if (!isEncrypted(value)) return value;
  return JSON.parse(decryptText(value));
}

// Which fields are encrypted, per Prisma model. Ids, dates, statuses, colours and owner ids stay
// readable so the app can filter and sort; the account email stays readable for sign-in.
export const ENCRYPTED_FIELDS: Record<string, { text: string[]; json: string[] }> = {
  Project:            { text: ['name', 'description', 'area'], json: [] },
  Task:               { text: ['title', 'description', 'assignee'], json: ['subtasks'] },
  Milestone:          { text: ['title', 'desc'], json: [] },
  Phase:              { text: ['name', 'notes'], json: [] },
  Note:               { text: ['title', 'body'], json: ['tags'] },
  PlannerTodo:        { text: ['text'], json: [] },
  PlannerEvent:       { text: ['title', 'notes'], json: [] },
  PlannerAppointment: { text: ['title', 'notes'], json: [] },
  // 'focus' is a legacy field the app no longer shows; it stays as is
  PlannerWeekly:      { text: ['notes'], json: ['goals', 'focusItems'] },
  CalendarSource:     { text: ['name', 'url'], json: [] },
};

// Encrypt the sensitive fields of one write payload (in place). Handles plain values and { set: v }.
export function encryptData(model: string, data: Record<string, unknown> | undefined) {
  const spec = ENCRYPTED_FIELDS[model];
  if (!spec || !data || typeof data !== 'object') return;
  const wrap = (field: string, fn: (v: unknown) => unknown) => {
    if (!(field in data)) return;
    const v = data[field];
    if (v && typeof v === 'object' && !Array.isArray(v) && 'set' in (v as object)) {
      (v as { set: unknown }).set = fn((v as { set: unknown }).set);
    } else {
      data[field] = fn(v);
    }
  };
  // Empty strings stay empty (nothing to hide, and keeps the column small)
  spec.text.forEach(f => wrap(f, v => (typeof v === 'string' && v !== '' ? encryptText(v) : v)));
  spec.json.forEach(f => wrap(f, v => (v === undefined ? v : encryptJson(v))));
}

// Decrypt the sensitive fields of a query result (rows, arrays of rows, or anything else untouched)
export function decryptResult(model: string, result: unknown): unknown {
  const spec = ENCRYPTED_FIELDS[model];
  if (!spec || result === null || typeof result !== 'object') return result;
  if (Array.isArray(result)) return result.map(r => decryptResult(model, r));
  const row = result as Record<string, unknown>;
  for (const f of spec.text) if (typeof row[f] === 'string') row[f] = decryptText(row[f] as string);
  for (const f of spec.json) if (f in row) row[f] = decryptJson(row[f]);
  return row;
}
