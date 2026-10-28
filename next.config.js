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

/** @type {import('next').NextConfig} */
const nextConfig = {
  generateBuildId: () => BUILD_ID,
  env: { BUILD_ID },
};
module.exports = nextConfig;
