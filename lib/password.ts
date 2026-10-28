// Shared by the sign-up form (live checklist) and /api/auth/register (enforcement).

export interface PasswordRule {
  id:    string;
  label: string;
  test:  (password: string) => boolean;
}

// bcrypt only hashes the first 72 bytes; anything longer would be silently ignored.
const MAX_BYTES = 72;

export const PASSWORD_RULES: PasswordRule[] = [
  { id: 'length',  label: 'At least 8 characters',          test: p => p.length >= 8 },
  { id: 'case',    label: 'Upper and lowercase letters',    test: p => /[a-z]/.test(p) && /[A-Z]/.test(p) },
  { id: 'number',  label: 'At least one number',            test: p => /\d/.test(p) },
  { id: 'symbol',  label: 'At least one symbol (e.g. ! ? #)', test: p => /[^A-Za-z0-9\s]/.test(p) },
];

/** Returns the first problem with the password, or null when it is acceptable. */
export function validatePassword(password: string): string | null {
  const failed = PASSWORD_RULES.find(r => !r.test(password));
  if (failed) return `Password needs: ${failed.label.toLowerCase()}`;
  if (new TextEncoder().encode(password).length > MAX_BYTES) return 'Password is too long (max 72 bytes)';
  return null;
}
