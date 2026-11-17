import { create } from 'zustand';
import { LATEST_RELEASE, OnboardingState, isOnboardingState } from '@/lib/changelog';

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

  init: (settings: Record<string, unknown> | null, workspaceEmpty: boolean) => void;
  startTour: (withWelcome?: boolean) => void;
  endTour: () => void;
  openHelp: (topic: string) => void;
  closeHelp: () => void;
  setHelpTopic: (topic: string) => void;
  openWhatsNew: () => void;
  closeWhatsNew: () => boolean;          // true when this closed notes the account hadn't seen
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

  // Decide what to show once the workspace has loaded:
  // a brand-new, empty workspace gets the welcome tour; anyone else gets the notes for a release
  // they haven't seen (existing accounts meet the tour through those notes, not uninvited).
  init: (settings, workspaceEmpty) => {
    if (get().loaded || !settings) return;
    const saved = isOnboardingState(settings.onboarding) ? settings.onboarding : null;
    set({ loaded: true, onboarding: saved });
    if (!saved && workspaceEmpty) set({ tourOpen: true, tourWelcome: true });
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

  openWhatsNew: () => set({ whatsNewOpen: true, helpOpen: false }),
  closeWhatsNew: () => {
    const cur = get().onboarding;
    set({ whatsNewOpen: false });
    if (cur?.seenRelease === LATEST_RELEASE.id) return false;
    const next = { tourDone: cur?.tourDone ?? false, seenRelease: LATEST_RELEASE.id };
    set({ onboarding: next });
    save(next);
    return true;
  },
}));
