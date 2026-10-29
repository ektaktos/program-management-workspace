'use client';

import { useEffect, useState } from 'react';

// A tab left open keeps running the code it loaded. This notices a newer deploy and offers a reload.
const RUNNING = process.env.BUILD_ID;
const CHECK_EVERY_MS = 5 * 60_000;
const CHUNK_RELOAD_KEY = 'pm_chunk_reload_at';
// The deployed build the user last reloaded for. If a reload still lands on older code (a cache or
// another server instance answering), we don't nag again until a different build is deployed.
const SEEN_KEY = 'pm_update_seen_build';
// Cache-busting query param added by Reload, removed again once the page loads
const BUST_PARAM = '_v';

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

  useEffect(() => {
    let stopped = false;

    // Tidy the address bar after a cache-busting reload
    const url = new URL(window.location.href);
    if (url.searchParams.has(BUST_PARAM)) {
      url.searchParams.delete(BUST_PARAM);
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash);
    }

    async function check() {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (!buildId || !RUNNING) return;
        if (buildId === RUNNING) {
          writeSeen('');
          setDeployed('');
        } else if (buildId !== readSeen()) {
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

    check();
    const timer = setInterval(check, CHECK_EVERY_MS);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('focus', check);
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      stopped = true;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('focus', check);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  if (!deployed) return null;

  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 32px)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', padding: '10px 12px 10px 16px',
      fontSize: 13, color: 'var(--text)',
    }}>
      <span>A new version of the workspace is available.</span>
      <button className="btn btn-primary btn-sm" onClick={() => reloadFresh(deployed)}>Reload</button>
    </div>
  );
}
