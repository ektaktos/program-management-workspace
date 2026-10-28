import { createHash, randomBytes } from 'crypto';

export const RESET_TOKEN_MINUTES = 60;
// A new link can't be requested for the same account more often than this.
export const RESET_REQUEST_COOLDOWN_MS = 60_000;

export function newResetToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashResetToken(token) };
}

export function hashResetToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function resetLink(token: string): string {
  const base = (process.env.NEXTAUTH_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}
