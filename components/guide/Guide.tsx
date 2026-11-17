'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGuideStore } from '@/store/useGuideStore';
import { helpTopicFor } from '@/lib/guide';
import Tour from './Tour';
import HelpPanel from './HelpPanel';
import WhatsNew from './WhatsNew';
import GuideIcon from './GuideIcon';

// Mounted once the workspace has loaded: decides between the welcome tour and "What's new"
export default function Guide() {
  useEffect(() => {
    let cancelled = false;
    fetch('/api/settings', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : null))
      .then((settings: Record<string, unknown> | null) => {
        if (cancelled || !settings) return;
        const s = useAppStore.getState();
        const empty = !s.projects.length && !s.tasks.length && !s.notes.length
          && !s.plannerEvents.length && !s.plannerAppointments.length && !s.todos.length;
        // Let the workspace settle on screen first
        setTimeout(() => { if (!cancelled) useGuideStore.getState().init(settings, empty); }, 700);
      })
      .catch(() => { /* try again on the next visit */ });
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <HelpPanel />
      <WhatsNew />
      <Tour />
    </>
  );
}

/** The ? in the top bar */
export function HelpButton() {
  const currentView = useAppStore(s => s.currentView);
  const openHelp = useGuideStore(s => s.openHelp);
  return (
    <button className="bell-btn" data-tour="help" title="How to use" aria-label="How to use and tour" onClick={() => openHelp(helpTopicFor(currentView))}>
      <GuideIcon name="help" size={16} />
    </button>
  );
}
