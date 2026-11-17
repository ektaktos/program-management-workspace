'use client';

import { useEffect, useRef } from 'react';
import { useGuideStore } from '@/store/useGuideStore';
import { HELP_TOPICS } from '@/lib/guide';
import GuideIcon from './GuideIcon';

// "How to use": tips for each part of the workspace, opened from the ? in the top bar
export default function HelpPanel() {
  const { helpOpen, helpTopic, closeHelp, setHelpTopic, startTour, openWhatsNew } = useGuideStore();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!helpOpen) return;
    closeRef.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeHelp(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [helpOpen, closeHelp]);

  const topic = HELP_TOPICS.find(t => t.id === helpTopic) ?? HELP_TOPICS[0];

  return (
    <>
      <div className={`g-help-scrim${helpOpen ? ' open' : ''}`} onClick={closeHelp} aria-hidden />
      <aside className={`g-help${helpOpen ? ' open' : ''}`} role="dialog" aria-modal="true" aria-label="How to use" aria-hidden={!helpOpen}>
        <div className="g-help-head">
          <div>
            <div className="g-help-title">How to use</div>
            <div className="g-help-sub">Tips for each part of your workspace</div>
          </div>
          <button ref={closeRef} className="g-icon-btn" onClick={closeHelp} aria-label="Close help"><GuideIcon name="x" size={16} /></button>
        </div>

        <div className="g-chips" role="tablist" aria-label="Topics">
          {HELP_TOPICS.map(t => (
            <button key={t.id} role="tab" aria-selected={t.id === topic.id} className={`g-chip${t.id === topic.id ? ' on' : ''}`} onClick={() => setHelpTopic(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        <ol className="g-tips" role="tabpanel" aria-label={topic.label}>
          {topic.tips.map((tip, i) => (
            <li key={tip.title} className="g-tip-row" style={{ animationDelay: `${i * 45}ms` }}>
              <span className="g-num">{i + 1}</span>
              <div><b>{tip.title}</b><span>{tip.text}</span></div>
            </li>
          ))}
        </ol>

        <div className="g-help-foot">
          <button className="g-btn g-btn-primary" onClick={() => startTour(false)}><GuideIcon name="play" size={13} /> Take the tour</button>
          <button className="g-btn" onClick={openWhatsNew}><GuideIcon name="sparkles" size={14} /> What&rsquo;s new</button>
        </div>
      </aside>
    </>
  );
}
