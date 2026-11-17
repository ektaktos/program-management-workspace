'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { useGuideStore } from '@/store/useGuideStore';
import { TOUR_STEPS } from '@/lib/guide';
import GuideIcon from './GuideIcon';

const STEP_ICON: Record<string, string> = {
  stats: 'grid', 'nav-today': 'sun', 'nav-projects': 'home', 'nav-planner': 'week',
  notes: 'note', quickadd: 'plus', bell: 'bell', help: 'help',
};

const PAD = 6;       // spotlight breathing room around the target
const GAP = 16;      // space between the spotlight and the card
const EDGE = 12;     // keep the card this far from the window edges

type Rect = { x: number; y: number; w: number; h: number };
type Place = { left: number; top: number; side: 'l' | 'r' | 't' | 'b' | 'none'; arrow: number };

function findTarget(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  // The first one that is actually on screen (a hidden mobile copy has no size)
  return all.find(el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.right > 0 && r.left < window.innerWidth; }) ?? null;
}

function placeCard(t: Rect | null, cw: number, ch: number): Place {
  const W = window.innerWidth, H = window.innerHeight;
  const clampX = (x: number) => Math.min(Math.max(x, EDGE), W - cw - EDGE);
  const clampY = (y: number) => Math.min(Math.max(y, EDGE), H - ch - EDGE);
  // Phones, or nothing to point at: a sheet at the bottom
  if (!t || W < 560) return { left: (W - cw) / 2, top: H - ch - EDGE - 4, side: 'none', arrow: 0 };
  const cx = t.x + t.w / 2, cy = t.y + t.h / 2;
  if (t.x + t.w + GAP + cw <= W - EDGE) { const top = clampY(cy - ch / 2); return { left: t.x + t.w + GAP, top, side: 'l', arrow: cy - top }; }
  if (t.y + t.h + GAP + ch <= H - EDGE) { const left = clampX(cx - cw / 2); return { left, top: t.y + t.h + GAP, side: 't', arrow: cx - left }; }
  if (t.x - GAP - cw >= EDGE) { const top = clampY(cy - ch / 2); return { left: t.x - GAP - cw, top, side: 'r', arrow: cy - top }; }
  const left = clampX(cx - cw / 2);
  return { left, top: Math.max(EDGE, t.y - GAP - ch), side: 'b', arrow: cx - left };
}

export default function Tour() {
  const { tourOpen, tourWelcome, endTour } = useGuideStore();
  const setView = useAppStore(s => s.setView);
  const setSidebarOpen = useAppStore(s => s.setSidebarOpen);
  const [step, setStep] = useState(-1);          // -1: welcome card
  const [mobile, setMobile] = useState(false);   // phone layout: bottom sheet, drawer sidebar
  const [rect, setRect] = useState<Rect | null>(null);
  const [place, setPlace] = useState<Place | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);

  // Opening: the tour runs on the Dashboard, where every target is on screen
  useEffect(() => {
    if (!tourOpen) return;
    setView('dashboard');
    setStep(tourWelcome ? -1 : 0);
  }, [tourOpen, tourWelcome, setView]);

  useEffect(() => {
    if (!tourOpen) return;
    const check = () => setMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, [tourOpen]);

  const s = step >= 0 ? TOUR_STEPS[step] : null;
  const target = s ? (mobile && s.mobileTarget) || s.target : '';
  const tip = s ? (mobile && s.mobileTip) || s.tip : '';

  const measure = useCallback(() => {
    if (!target) return;
    const el = findTarget(target);
    if (!el) { setRect(null); return; }
    const r = el.getBoundingClientRect();
    setRect({ x: r.left - PAD, y: r.top - PAD, w: r.width + PAD * 2, h: r.height + PAD * 2 });
  }, [target]);

  // Each step: make sure the target is visible, then measure (again once any scroll or the
  // sidebar drawer has settled)
  useEffect(() => {
    if (!tourOpen || !target) return;
    if (window.innerWidth < 768) setSidebarOpen(target.startsWith('nav-'));
    const el = findTarget(target);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.top < 70 || r.bottom > window.innerHeight - 20) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
    measure();
    const t1 = setTimeout(measure, 120), t2 = setTimeout(measure, 380);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [tourOpen, target, measure, setSidebarOpen]);

  useEffect(() => {
    if (!tourOpen) return;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [tourOpen, measure]);

  // Place the card once its size is known
  useLayoutEffect(() => {
    if (!s || !cardRef.current) { setPlace(null); return; }
    const c = cardRef.current;
    setPlace(placeCard(rect, c.offsetWidth, c.offsetHeight));
  }, [rect, s, step]);

  useEffect(() => { if (tourOpen) nextRef.current?.focus({ preventScroll: true }); }, [tourOpen, step]);

  const finish = useCallback(() => {
    if (window.innerWidth < 768) setSidebarOpen(false);
    setStep(-1);
    setRect(null);
    endTour();
  }, [endTour, setSidebarOpen]);

  const go = useCallback((n: number) => {
    if (n >= TOUR_STEPS.length) finish();
    else setStep(Math.max(0, n));
  }, [finish]);

  useEffect(() => {
    if (!tourOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); finish(); }
      else if (step >= 0 && e.key === 'ArrowRight') { e.preventDefault(); go(step + 1); }
      else if (step > 0 && e.key === 'ArrowLeft') { e.preventDefault(); go(step - 1); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [tourOpen, step, go, finish]);

  if (!tourOpen) return null;

  if (step < 0) {
    return (
      <div className="g-scrim g-center" role="presentation">
        <div className="g-welcome" role="dialog" aria-modal="true" aria-labelledby="g-welcome-title">
          <div className="g-orbs" aria-hidden>
            <span><GuideIcon name="sun" size={19} /></span>
            <span><GuideIcon name="home" size={19} /></span>
            <span><GuideIcon name="week" size={19} /></span>
          </div>
          <h2 id="g-welcome-title">Welcome to your workspace</h2>
          <p>A one-minute tour of the places you&rsquo;ll use most. You can skip it and take it any time from the ? button.</p>
          <div className="g-row g-row-center">
            <button className="g-btn" onClick={finish}>Maybe later</button>
            <button className="g-btn g-btn-primary" ref={nextRef} onClick={() => go(0)}>Take the tour</button>
          </div>
        </div>
      </div>
    );
  }

  const last = step === TOUR_STEPS.length - 1;
  return (
    <>
      {/* Blocks the app while touring; dims everything when there's no target to light up */}
      <div className={`g-block${rect ? '' : ' g-block-dim'}`} onClick={e => e.stopPropagation()} />
      {rect && <div className="g-spot" style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }} aria-hidden />}
      <div
        ref={cardRef}
        className={`g-coach${place ? ' ready' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="g-coach-title"
        aria-describedby="g-coach-body"
        style={place ? { left: place.left, top: place.top } : undefined}
      >
        {place && place.side !== 'none' && (
          <span className={`g-arrow g-arrow-${place.side}`} style={place.side === 'l' || place.side === 'r' ? { top: Math.min(Math.max(place.arrow - 7, 16), (cardRef.current?.offsetHeight ?? 200) - 30) } : { left: Math.min(Math.max(place.arrow - 7, 16), (cardRef.current?.offsetWidth ?? 300) - 30) }} aria-hidden />
        )}
        <div className="g-coach-head">
          <span className="g-tile"><GuideIcon name={STEP_ICON[s!.target] ?? 'sparkles'} size={17} /></span>
          <div>
            <div className="g-kicker">{step + 1} of {TOUR_STEPS.length} · {s!.section}</div>
            <div className="g-coach-title" id="g-coach-title">{s!.title}</div>
          </div>
        </div>
        <p className="g-coach-body" id="g-coach-body">{s!.body}</p>
        <div className="g-tip"><GuideIcon name="bulb" size={15} /><span>{tip}</span></div>
        <div className="g-progress" aria-hidden>
          {TOUR_STEPS.map((_, i) => <span key={i} className={i <= step ? 'on' : ''} />)}
        </div>
        <div className="g-row">
          <button className="g-link" onClick={finish}>{last ? 'Close' : 'Skip tour'}</button>
          <span className="g-row" style={{ gap: 6 }}>
            {step > 0 && <button className="g-btn" onClick={() => go(step - 1)}>Back</button>}
            <button className="g-btn g-btn-primary" ref={nextRef} onClick={() => go(step + 1)}>{last ? 'Finish' : 'Next'}</button>
          </span>
        </div>
      </div>
    </>
  );
}
