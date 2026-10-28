'use client';

import { useEffect, useState } from 'react';

// A tab left open keeps running the code it loaded. This notices a newer deploy and offers a reload.
const RUNNING = process.env.BUILD_ID;
const CHECK_EVERY_MS = 5 * 60_000;
const CHUNK_RELOAD_KEY = 'pm_chunk_reload_at';

export default function UpdateBanner() {
  const [outdated, setOutdated] = useState(false);

  useEffect(() => {
    let stopped = false;

    async function check() {
      if (stopped || document.visibilityState !== 'visible') return;
      try {
        const res = await fetch('/api/version', { cache: 'no-store' });
        if (!res.ok) return;
        const { buildId } = await res.json();
        if (buildId && RUNNING && buildId !== RUNNING) setOutdated(true);
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
        if (Date.now() - last < 60_000) { setOutdated(true); return; } // don't loop
        sessionStorage.setItem(CHUNK_RELOAD_KEY, String(Date.now()));
      } catch {}
      window.location.reload();
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

  if (!outdated) return null;

  return (
    <div role="status" style={{
      position: 'fixed', left: '50%', bottom: 18, transform: 'translateX(-50%)', zIndex: 300,
      display: 'flex', alignItems: 'center', gap: 12, maxWidth: 'calc(100vw - 32px)',
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', padding: '10px 12px 10px 16px',
      fontSize: 13, color: 'var(--text)',
    }}>
      <span>A new version of the workspace is available.</span>
      <button className="btn btn-primary btn-sm" onClick={() => window.location.reload()}>Reload</button>
    </div>
  );
}
