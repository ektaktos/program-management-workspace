// Runs once when the server starts: encrypt any data stored before field encryption was enabled.
// The import must sit inside this NEXT_RUNTIME check (not after an early return) so the edge build
// drops it entirely; the backfill uses Node's crypto and the database client.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { runEncryptionBackfill } = await import('./lib/encryptBackfill');
    runEncryptionBackfill().catch(err => console.error('[encryption] backfill failed:', err));
  }
}
