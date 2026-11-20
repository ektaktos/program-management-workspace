import { create } from 'zustand';
import { CHANGELOG, LATEST_RELEASE, OnboardingState, isOnboardingState } from '@/lib/changelog';

// The first-run tour, the help panel and "What's new". The per-account record of what has been
// shown is the synced 'onboarding' setting, so a tour finished on one device isn't repeated on another.

interface GuideState {
  onboarding: OnboardingState | null;   // null until loaded (or when the account has none yet)
  loaded: boolean;
  tourOpen: boolean;
  tourWelcome: boolean;                  // show the welcome card before the first step
  helpOpen: boolean;
  helpTopic: string;
  whatsNewOpen: boolean;
  whatsNewSince: string | null;          // show releases newer than this (after "Update now"); else the account's last seen

  init: (settings: Record<string, unknown> | null, workspaceEmpty: boolean) => void;
  startTour: (withWelcome?: boolean) => void;
  endTour: () => void;
  openHelp: (topic: string) => void;
  closeHelp: () => void;
  setHelpTopic: (topic: string) => void;
  openWhatsNew: () => void;
  closeWhatsNew: () => boolean;          // true when this closed notes the account hadn't seen
}

// Set by "Update now" just before the reload: the release the tab was running, so the reloaded app
// can open What's new on what that update brought. Per tab, and ignored once stale.
const UPDATED_FROM_KEY = 'pm_updated_from';
const UPDATED_FROM_MAX_AGE_MS = 10 * 60_000;

export function rememberUpdateFrom() {
  try { sessionStorage.setItem(UPDATED_FROM_KEY, JSON.stringify({ from: LATEST_RELEASE.id, at: Date.now() })); } catch {}
}

/** The release this tab ran before "Update now", read once (null when it wasn't just updated) */
function takeUpdateFrom(): string | null {
  try {
    const raw = sessionStorage.getItem(UPDATED_FROM_KEY);
    sessionStorage.removeItem(UPDATED_FROM_KEY);
    if (!raw) return null;
    const { from, at } = JSON.parse(raw);
    if (typeof from !== 'string' || typeof at !== 'number' || Date.now() - at > UPDATED_FROM_MAX_AGE_MS) return null;
    return from;
  } catch { return null; }
}

/** Of two release ids, the older one (an id no longer in the changelog counts as newest) */
function olderRelease(a: string | undefined, b: string | undefined): string | undefined {
  const ia = a ? CHANGELOG.findIndex(r => r.id === a) : -1;
  const ib = b ? CHANGELOG.findIndex(r => r.id === b) : -1;
  return ia >= ib ? a : b;
}

function save(state: OnboardingState) {
  fetch('/api/settings/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: state }),
  }).catch(() => { /* shown again next time: harmless */ });
}

export const useGuideStore = create<GuideState>((set, get) => ({
  onboarding: null,
  loaded: false,
  tourOpen: false,
  tourWelcome: false,
  helpOpen: false,
  helpTopic: 'dashboard',
  whatsNewOpen: false,
  whatsNewSince: null,

  // Decide what to show once the workspace has loaded:
  // a brand-new, empty workspace gets the welcome tour; anyone else gets the notes for a release
  // they haven't seen (existing accounts meet the tour through those notes, not uninvited).
  init: (settings, workspaceEmpty) => {
    if (get().loaded || !settings) return;
    const saved = isOnboardingState(settings.onboarding) ? settings.onboarding : null;
    const updatedFrom = takeUpdateFrom();
    set({ loaded: true, onboarding: saved });
    if (!saved && workspaceEmpty) set({ tourOpen: true, tourWelcome: true });
    // Just updated with "Update now" to a build with new notes: show what it brought, even if
    // another tab or device already marked them seen
    else if (updatedFrom && updatedFrom !== LATEST_RELEASE.id) {
      set({ whatsNewOpen: true, whatsNewSince: olderRelease(updatedFrom, saved?.seenRelease) ?? updatedFrom });
    }
    else if (!saved || saved.seenRelease !== LATEST_RELEASE.id) set({ whatsNewOpen: true });
  },

  startTour: (withWelcome = false) => set({ tourOpen: true, tourWelcome: withWelcome, helpOpen: false, whatsNewOpen: false }),

  endTour: () => {
    // Finishing or skipping both count: the tour isn't offered again, and a first-timer
    // doesn't then get notes about changes from before they arrived
    const next = { tourDone: true, seenRelease: LATEST_RELEASE.id };
    set({ tourOpen: false, tourWelcome: false, onboarding: next });
    save(next);
  },

  openHelp: (topic) => set({ helpOpen: true, helpTopic: topic, whatsNewOpen: false }),
  closeHelp: () => set({ helpOpen: false }),
  setHelpTopic: (topic) => set({ helpTopic: topic }),

  openWhatsNew: () => set({ whatsNewOpen: true, whatsNewSince: null, helpOpen: false }),
  closeWhatsNew: () => {
    const cur = get().onboarding;
    set({ whatsNewOpen: false, whatsNewSince: null });
    if (cur?.seenRelease === LATEST_RELEASE.id) return false;
    const next = { tourDone: cur?.tourDone ?? false, seenRelease: LATEST_RELEASE.id };
    set({ onboarding: next });
    save(next);
    return true;
  },
}));
