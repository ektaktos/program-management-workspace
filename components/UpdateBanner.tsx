'use client';

import { useEffect, useState } from 'react';
import { LATEST_RELEASE } from '@/lib/changelog';
import GuideIcon from './guide/GuideIcon';

// A tab left open keeps running the code it loaded. This notices a newer deploy and offers a reload.
const RUNNING = process.env.BUILD_ID;
// Checked every minute while the app is open, plus on returning to it, coming back online, and the
// first click or key after a quiet minute (browsers slow or pause timers in background tabs and on
// sleeping laptops, so the timer alone can miss a deploy for a long time).
const CHECK_EVERY_MS = 60_000;
const CHUNK_RELOAD_KEY = 'pm_chunk_reload_at';
// The deployed build the user last reloaded for. If a reload still lands on older code (a cache or
// another server instance answering), we don't nag again until a different build is deployed.
const SEEN_KEY = 'pm_update_seen_build';
// Cache-busting query param added by Reload, removed again once the page loads
const BUST_PARAM = '_v';
// "Later": don't show this build's card again in this tab
const LATER_KEY = 'pm_update_later';

function laterFor(): string {
  try { return sessionStorage.getItem(LATER_KEY) ?? ''; } catch { return ''; }
}

function readSeen(): string {
  try { return localStorage.getItem(SEEN_KEY) ?? ''; } catch { return ''; }
}
function writeSeen(id: string) {
  try { id ? localStorage.setItem(SEEN_KEY, id) : localStorage.removeItem(SEEN_KEY); } catch {}
}

/** Reload from the server: a URL no cache has seen, so a CDN can't hand back a stored copy. */
function reloadFresh(deployed: string) {
  if (deployed) writeSeen(deployed);
  const url = new URL(window.location.href);
  url.searchParams.set(BUST_PARAM, deployed || String(Date.now()));
  window.location.replace(url.toString());
}

export default function UpdateBanner() {
  // Build id of the newer deploy, or '' when this tab is up to date
  const [deployed, setDeployed] = useState('');
  // What the new build says it brings (newer servers send their latest release note)
  const [summary, setSummary] = useState('');

  useEffect(() => {
    let stopped = false;

    // Tidy the address bar after a cache-busting reload
    const url = new URL(window.location.href);
    if (url.searchParams.has(BUST_PARAM)) {
      url.searchParams.delete(BUST_PARAM);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }

    let lastCheck = 0;
    async function check() {
      if (stopped || document.visibilityState !== 'visible') return;
      lastCheck = Date.now();
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId, release } = await res.json();
        if (!buildId || !RUNNING) return;
        if (buildId === RUNNING) {
          writeSeen('');
          setDeployed('');
        } else if (buildId !== readSeen() && buildId !== laterFor()) {
          const fresh = release && typeof release.summary === 'string' && release.id !== LATEST_RELEASE.id;
          setSummary(fresh ? String(release.summary).slice(0, 120) : '');
          setDeployed(buildId);
        }
      } catch {
        // offline or mid-deploy: try again next time
      }
    }

    // After a deploy the old build's lazily loaded files are gone; reload once to pick up the new ones.
    function onChunkError(reason: unknown) {
      const msg = String((reason as Error)?.message ?? reason ?? '');
      if (!/ChunkLoadError|Loading chunk [\w-]+ failed|Loading CSS chunk/i.test(msg)) return;
      try {
        const last = Number(sessionStorage.getItem(CHUNK_RELOAD_KEY) || 0);
        if (Date.now() - last < 60_000) return; // already tried: don't loop
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      } catch {}
      reloadFresh('');
    }
    const onError = (e: ErrorEvent) => onChunkError(e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => onChunkError(e.reason);

    const checkIfQuiet = () => { if (Date.now() - lastCheck > CHECK_EVERY_MS) check(); };

    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('online', check);
    window.addEventListener('pointerdown', checkIfQuiet, { passive: true });
    window.addEventListener('keydown', checkIfQuiet);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('online', check);
      window.removeEventListener('pointerdown', checkIfQuiet);
      window.removeEventListener('keydown', checkIfQuiet);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!deployed) return null;

  function later() {
    try { sessionStorage.setItem(LATER_KEY, deployed); } catch {}
    setDeployed('');
  }

  return (
    <div className="g-update" role="status">
      <span className="g-update-spark" aria-hidden><GuideIcon name="sparkles" size={17} /></span>
      <span className="g-update-text">
        <b>A new version is ready</b>
        <span>{summary || 'Fixes and improvements'}</span>
      </span>
      <button className="g-link" onClick={later}>Later</button>
      <button className="g-btn g-btn-primary" onClick={() => reloadFresh(deployed)}>Update now</button>
    </div>
  );
}
