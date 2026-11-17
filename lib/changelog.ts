// Release notes shown in "What's new" after an update. Newest first.
// Add an entry when a push changes something people will notice; a push without one only
// shows the plain "A new version is ready" card. Pure data: /api/version also reads it.

export type ChangeKind = 'new' | 'improved' | 'fixed';

export type ChangeIcon = 'compass' | 'bell' | 'sparkles' | 'lock' | 'tool' | 'pin' | 'calendar' | 'list';

export interface ChangeItem {
  kind: ChangeKind;
  icon: ChangeIcon;
  title: string;
  desc: string;
  /** Optional button: start the tour, open the help panel or go to a view */
  action?: { label: string; run: 'tour' | 'help' | `view:${string}` };
}

export interface Release {
  id: string;        // unique and stable, e.g. the date (a second release that day: 2026-11-17b)
  date: string;      // YYYY-MM-DD
  summary: string;   // one line for the "A new version is ready" card
  items: ChangeItem[];
}

export const CHANGELOG: Release[] = [
  {
    id: '2026-11-17',
    date: '2026-11-17',
    summary: 'A guided tour, help on every page and more reminders',
    items: [
      { kind: 'new', icon: 'compass', title: 'A guided tour and help on every page', desc: 'Press ? in the top bar for how-to tips on whichever page you’re on, or take the one-minute tour.', action: { label: 'Take the tour', run: 'tour' } },
      { kind: 'new', icon: 'bell', title: 'Several reminders per meeting', desc: 'Calendar events can remind you up to five times, like a day before and 10 minutes before. Set them under the bell, then Settings.' },
      { kind: 'new', icon: 'sparkles', title: 'Notes after each update', desc: 'When a new version arrives you’ll see what changed, here. Find it again any time under the bell or the ? button.' },
      { kind: 'improved', icon: 'lock', title: 'Your data is encrypted', desc: 'Project, task, note and planner text is stored encrypted on the server.' },
      { kind: 'fixed', icon: 'tool', title: 'Smoother loading', desc: 'Fonts now load from the app itself, so pages open without a flicker or an error.' },
    ],
  },
];

export const LATEST_RELEASE: Release = CHANGELOG[0];

export const CHANGE_KIND_LABEL: Record<ChangeKind, string> = { new: 'New', improved: 'Improved', fixed: 'Fixed' };

export function releaseDateLabel(r: Release): string {
  return new Date(r.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Per-account guide state (synced setting 'onboarding') ──

export interface OnboardingState {
  tourDone: boolean;     // finished or skipped the first-run tour
  seenRelease: string;   // id of the last release whose notes were shown
}

export function isOnboardingState(v: unknown): v is OnboardingState {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return Object.keys(o).length === 2 && typeof o.tourDone === 'boolean'
    && typeof o.seenRelease === 'string' && o.seenRelease.length <= 40;
}
