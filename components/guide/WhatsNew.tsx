'use client';

import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGuideStore } from '@/store/useGuideStore';
import { CHANGE_KIND_LABEL, ChangeItem, LATEST_RELEASE, releaseDateLabel } from '@/lib/changelog';
import GuideIcon from './GuideIcon';

// The notes for the latest release: shown once after an update, and again from the bell or help panel
export default function WhatsNew() {
  const { whatsNewOpen, closeWhatsNew, startTour, openHelp } = useGuideStore();
  const notify = useAppStore(s => s.notify);
  const setView = useAppStore(s => s.setView);
  const gotRef = useRef<HTMLButtonElement>(null);
  const r = LATEST_RELEASE;

  function close() {
    // The first time these notes are closed, keep them in the bell so they can be read again
    if (closeWhatsNew()) {
      const n = r.items.length;
      notify({
        kind: 'info',
        title: `Updated · ${releaseDateLabel(r)}`,
        message: `${n} change${n !== 1 ? 's' : ''}: ${r.summary.charAt(0).toLowerCase()}${r.summary.slice(1)}. Open to read what’s new.`,
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
  }, [whatsNewOpen]);

  if (!whatsNewOpen) return null;

  return (
    <div className="g-scrim g-center" onClick={close} role="presentation">
      <div className="g-news" role="dialog" aria-modal="true" aria-labelledby="g-news-title" onClick={e => e.stopPropagation()}>
        <div className="g-news-hero">
          <span className="g-blob g-blob-1" aria-hidden /><span className="g-blob g-blob-2" aria-hidden />
          <span className="g-pill"><GuideIcon name="sparkles" size={12} /> Update · {releaseDateLabel(r)}</span>
          <h2 id="g-news-title">What&rsquo;s new</h2>
          <p>You&rsquo;re on the latest version. Here&rsquo;s what changed.</p>
        </div>
        <ul className="g-news-list">
          {r.items.map((it, i) => (
            <li key={it.title} className={`g-news-item g-k-${it.kind}`} style={{ animationDelay: `${80 + i * 70}ms` }}>
              <span className="g-tile"><GuideIcon name={it.icon} size={16} /></span>
              <div>
                <div className="g-news-title">{it.title}<span className="g-tag">{CHANGE_KIND_LABEL[it.kind]}</span></div>
                <div className="g-news-desc">{it.desc}</div>
                {it.action && (
                  <button className="g-link g-link-strong" onClick={() => act(it)}>
                    {it.action.label} <GuideIcon name="arrow" size={13} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="g-row g-news-foot">
          <span className="g-faint">Read it again any time from the bell</span>
          <button ref={gotRef} className="g-btn g-btn-primary" onClick={close}>Got it</button>
        </div>
      </div>
    </div>
  );
}
