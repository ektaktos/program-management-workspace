const { execSync } = require('child_process');

// One id per deployed version: the commit when the host or git can tell us, else the build time.
// The browser compares it with /api/version to notice a newer deploy (components/UpdateBanner.tsx).
function buildId() {
  const fromHost = process.env.VERCEL_GIT_COMMIT_SHA || process.env.SOURCE_VERSION || process.env.GIT_COMMIT;
  if (fromHost) return fromHost.slice(0, 12);
  try {
    return execSync('git rev-parse --short=12 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim();
  } catch {
    return `t${Date.now()}`;
  }
}

const BUILD_ID = buildId();

// The type check needs the generated Prisma client. Hosts that restore cached node_modules, skip
// install scripts or run `next build` directly never run `prisma generate`, so do it here first.
function generatePrismaClient() {
  if (process.env.__PRISMA_CLIENT_GENERATED) return;   // the config loads more than once per build
  process.env.__PRISMA_CLIENT_GENERATED = '1';
  let cli;
  try {
    cli = require.resolve('prisma/build/index.js');
  } catch {
    throw new Error('The `prisma` CLI is missing, so the Prisma client cannot be generated. Install devDependencies during the build.');
  }
  execSync(`"${process.execPath}" "${cli}" generate`, { stdio: 'inherit' });
}

/** @type {(phase: string) => import('next').NextConfig} */
module.exports = (phase) => {
  if (phase === 'phase-production-build') generatePrismaClient();
  // instrumentation.ts (the one-time encryption backfill) runs by default since Next 15.
  return {
    generateBuildId: () => BUILD_ID,
    env: { BUILD_ID },
  };
};
