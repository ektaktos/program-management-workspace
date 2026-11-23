// Release notes shown in "What's new" after an update. Newest first.
//
// EVERY PUSH THAT CHANGES SOMETHING PEOPLE WILL NOTICE ADDS AN ENTRY AT THE TOP, in the same commit:
// a new feature, a changed screen or behaviour, or a fix someone could have run into. Give it a new
// id (the date; a second release that day gets a letter: 2026-11-17b), a one-line summary for the
// update card, and plain-language items. Pushes with no visible change (refactors, build fixes)
// don't need one; they only show "Fixes and improvements" on the update card.
// Accounts see every entry newer than the last one they saw. Pure data: /api/version reads it too.

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
    id: '2026-11-23',
    date: '2026-11-23',
    summary: 'Completion and the weekly report count every task',
    items: [
      { kind: 'improved', icon: 'compass', title: 'Completion counts every task', desc: 'The dashboard’s Completion now covers all your tasks, project tasks and Weekly Planner tasks alike, so it lines up with the Tasks card beside it and with All Tasks.', action: { label: 'Open All Tasks', run: 'view:tasks' } },
      { kind: 'improved', icon: 'list', title: 'Overdue includes planner tasks', desc: 'A planner task whose day has passed without being ticked off now counts as overdue on the dashboard, as it already did in All Tasks.' },
      { kind: 'improved', icon: 'sparkles', title: 'Weekly report matches the dashboard', desc: 'The PDF report adds Completion and All tasks tiles, counts overdue planner tasks, and shows each project’s open and overdue planner tasks in the projects table. Planner tasks from archived projects are left out, as on the dashboard.' },
    ],
  },
  {
    id: '2026-11-20d',
    date: '2026-11-20',
    summary: 'What’s new opens after you update',
    items: [
      { kind: 'improved', icon: 'sparkles', title: 'See what an update brought', desc: 'After you tap Update now, the app reloads and opens What’s new on its own, showing the changes in the version you just moved to.' },
    ],
  },
  {
    id: '2026-11-20c',
    date: '2026-11-20',
    summary: 'Update notices show up sooner',
    items: [
      { kind: 'fixed', icon: 'sparkles', title: 'Faster “new version” notices', desc: 'With the app open, it now checks for a new version every minute (it was every five), and again the moment you click or type after a quiet spell, so the Update now card appears soon after an update.' },
      { kind: 'fixed', icon: 'tool', title: 'Update now is never hidden', desc: 'The Update now card used to sit behind What’s new and other pop-ups when they were open. It now stays on top and clickable.' },
    ],
  },
  {
    id: '2026-11-20b',
    date: '2026-11-20',
    summary: 'Completion counts planner tasks linked to a project',
    items: [
      { kind: 'improved', icon: 'sparkles', title: 'Completion includes linked planner tasks', desc: 'Planner tasks you have linked to a project now count toward the Completion figure on the Dashboard, alongside that project’s own tasks. Planner tasks with no project still don’t.' },
    ],
  },
  {
    id: '2026-11-20',
    date: '2026-11-20',
    summary: 'All Tasks now includes your planner tasks',
    items: [
      { kind: 'new', icon: 'list', title: 'Planner tasks in All Tasks', desc: 'Tasks you add in the Weekly Planner now appear in All Tasks with a Planner tag, beside your project tasks. Tick them off, open them to edit or delete them, and sort them with everything else. To-dos stay on their own list.', action: { label: 'Open All Tasks', run: 'view:tasks' } },
      { kind: 'new', icon: 'compass', title: 'Filter by where a task lives', desc: 'A new filter shows projects and planner together, projects only or planner only, and remembers your choice.' },
      { kind: 'improved', icon: 'sparkles', title: 'The Tasks count includes the planner', desc: 'The Tasks card on the Dashboard counts planner tasks too, so it matches All Tasks. Completion is still measured across your projects.' },
    ],
  },
  {
    id: '2026-11-18',
    date: '2026-11-18',
    summary: 'Cancelled meetings no longer count',
    items: [
      { kind: 'fixed', icon: 'calendar', title: 'Cancelled meetings are noted, not counted', desc: 'Meetings your calendar marks “Canceled” now show struck through with a Cancelled tag. The meeting count on the Dashboard, Today and the planner leaves them out, and the Dashboard notes how many were cancelled.' },
      { kind: 'fixed', icon: 'bell', title: 'No reminders for cancelled meetings', desc: 'Calendar reminders, the morning summary, the Upcoming list and the weekly report skip meetings that were called off.' },
    ],
  },
  {
    id: '2026-11-17c',
    date: '2026-11-17',
    summary: 'Easier tapping on phones and better screen-reader labels',
    items: [
      { kind: 'improved', icon: 'list', title: 'Easier tapping on phones', desc: 'The priority numbers and Move buttons in Today and the planner have a bigger tap area on touch screens.' },
      { kind: 'improved', icon: 'tool', title: 'Clearer for screen readers', desc: 'Search, to-do, focus and reflection boxes now announce what they’re for.' },
    ],
  },
  {
    id: '2026-11-17b',
    date: '2026-11-17',
    summary: 'What’s new is in the bell, and the tour works better on phones',
    items: [
      { kind: 'improved', icon: 'bell', title: 'What’s new lives in the bell', desc: 'The bell has a What’s new button, so these notes are always one tap away, even after you clear your notifications.' },
      { kind: 'improved', icon: 'compass', title: 'A better tour on phones', desc: 'The tour points at the Recent notes heading and gives tips that make sense on a touch screen.' },
      { kind: 'fixed', icon: 'tool', title: 'The tour’s spotlight stays put', desc: 'The highlight no longer drifts off its target when the page shifts while loading.' },
      { kind: 'new', icon: 'sparkles', title: 'Every update listed', desc: 'Missed a few updates? What’s new now shows each one you haven’t seen, with earlier updates underneath.' },
    ],
  },
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

/** Releases newer than the one this account last saw (just the latest for a first look). */
export function unseenReleases(seenId: string | undefined): Release[] {
  const i = seenId ? CHANGELOG.findIndex(r => r.id === seenId) : -1;
  if (i > 0) return CHANGELOG.slice(0, i);
  return [LATEST_RELEASE];
}

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
