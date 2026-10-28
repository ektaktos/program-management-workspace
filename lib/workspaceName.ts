// Each user's workspace is named after them ("Alex's Workspace") unless they rename it.
// The custom name is the `workspaceName` setting; '' means "use the default".

export const WORKSPACE_NAME_MAX = 60;

/** First name from the profile, else the part of the email before @. */
export function firstName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  const fromName = user?.name?.trim().split(/\s+/)[0];
  if (fromName) return fromName;
  const fromEmail = user?.email?.split('@')[0]?.trim();
  return fromEmail ?? '';
}

export function defaultWorkspaceName(user: { name?: string | null; email?: string | null } | null | undefined): string {
  const first = firstName(user);
  return first ? `${first}’s Workspace` : 'My Workspace';
}

/** Trims and collapses whitespace; returns '' for blank input. */
export function cleanWorkspaceName(v: string): string {
  return v.replace(/\s+/g, ' ').trim().slice(0, WORKSPACE_NAME_MAX);
}

export function isWorkspaceName(v: unknown): v is string {
  return typeof v === 'string' && v.length <= WORKSPACE_NAME_MAX && v === cleanWorkspaceName(v);
}
