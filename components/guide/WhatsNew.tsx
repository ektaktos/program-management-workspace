'use client';

import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGuideStore } from '@/store/useGuideStore';
import { CHANGELOG, CHANGE_KIND_LABEL, ChangeItem, Release, releaseDateLabel, unseenReleases } from '@/lib/changelog';
import GuideIcon from './GuideIcon';

function Items({ release, animate, onAct }: { release: Release; animate: boolean; onAct: (it: ChangeItem) => void }) {
  return (
    <ul className="g-news-list">
      {release.items.map((it, i) => (
        <li key={it.title} className={`g-news-item g-k-${it.kind}`} style={animate ? { animationDelay: `${80 + i * 70}ms` } : { animation: 'none' }}>
          <span className="g-tile"><GuideIcon name={it.icon} size={16} /></span>
          <div>
            <div className="g-news-title">{it.title}<span className="g-tag">{CHANGE_KIND_LABEL[it.kind]}</span></div>
            <div className="g-news-desc">{it.desc}</div>
            {it.action && (
              <button className="g-link g-link-strong" onClick={() => onAct(it)}>
                {it.action.label} <GuideIcon name="arrow" size={13} />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}

// Release notes: every update this account hasn't seen yet (shown once after an update, and always
// right after "Update now": what that update brought), with
// earlier updates underneath. Opened again from the bell or the help panel.
export default function WhatsNew() {
  const { whatsNewOpen, whatsNewSince, onboarding, closeWhatsNew, startTour, openHelp } = useGuideStore();
  const notify = useAppStore(s => s.notify);
  const setView = useAppStore(s => s.setView);
  const gotRef = useRef<HTMLButtonElement>(null);
  // Fixed when the card opens (closing it marks everything as seen)
  const [shown, setShown] = useState<Release[]>([]);
  const [earlierOpen, setEarlierOpen] = useState(false);

  useEffect(() => {
    if (!whatsNewOpen) return;
    setShown(unseenReleases(whatsNewSince ?? onboarding?.seenRelease));
    setEarlierOpen(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsNewOpen]);

  function close() {
    // The first time these notes are closed, keep them in the bell so they can be read again
    if (closeWhatsNew()) {
      const latest = shown[0] ?? CHANGELOG[0];
      const n = shown.reduce((sum, r) => sum + r.items.length, 0) || latest.items.length;
      notify({
        kind: 'info',
        title: `Updated · ${releaseDateLabel(latest)}`,
        message: `${n} change${n !== 1 ? 's' : ''}: ${latest.summary.charAt(0).toLowerCase()}${latest.summary.slice(1)}. Open to read what’s new.`,
        target: { view: 'whatsnew' },
        silent: true,
      });
    }
  }

  function act(item: ChangeItem) {
    const run = item.action?.run;
    close();
    if (run === 'tour') startTour(false);
    else if (run === 'help') openHelp('dashboard');
    else if (run?.startsWith('view:')) setView(run.slice(5));
  }

  useEffect(() => {
    if (!whatsNewOpen) return;
    gotRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsNewOpen, shown]);

  if (!whatsNewOpen || !shown.length) return null;

  const latest = shown[0];
  const several = shown.length > 1;
  const earlier = CHANGELOG.filter(r => !shown.includes(r));

  return (
    <div className="g-scrim g-center" onClick={close} role="presentation">
      <div className="g-news" role="dialog" aria-modal="true" aria-labelledby="g-news-title" onClick={e => e.stopPropagation()}>
        <div className="g-news-hero">
          <span className="g-blob g-blob-1" aria-hidden /><span className="g-blob g-blob-2" aria-hidden />
          <span className="g-pill"><GuideIcon name="sparkles" size={12} /> Update · {releaseDateLabel(latest)}</span>
          <h2 id="g-news-title">What&rsquo;s new</h2>
          <p>{several ? `${shown.length} updates since you last looked. Newest first.` : 'You’re on the latest version. Here’s what changed.'}</p>
        </div>
        <div className="g-news-body">
          {shown.map((r, i) => (
            <section key={r.id}>
              {several && <div className="g-news-when">{releaseDateLabel(r)} · {r.summary}</div>}
              <Items release={r} animate={i === 0} onAct={act} />
            </section>
          ))}
          {earlier.length > 0 && (
            <div className="g-news-earlier">
              <button className="g-link" aria-expanded={earlierOpen} onClick={() => setEarlierOpen(o => !o)}>
                {earlierOpen ? 'Hide earlier updates' : `Earlier updates (${earlier.length})`}
                <span className={`g-chev${earlierOpen ? ' open' : ''}`} aria-hidden>›</span>
              </button>
              {earlierOpen && earlier.map(r => (
                <section key={r.id}>
                  <div className="g-news-when">{releaseDateLabel(r)} · {r.summary}</div>
                  <Items release={r} animate={false} onAct={act} />
                </section>
              ))}
            </div>
          )}
        </div>
        <div className="g-row g-news-foot">
          <span className="g-faint">Find it again under the bell or ?</span>
          <button ref={gotRef} className="g-btn g-btn-primary" onClick={close}>Got it</button>
        </div>
      </div>
    </div>
  );
}
